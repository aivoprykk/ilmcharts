#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <signal.h>
#include <pthread.h>
#include <sys/stat.h>
#include <dirent.h>
#include <errno.h>
#include <time.h>

#ifdef __linux__
    #include <sys/inotify.h>
    #include <limits.h>
    #include <openssl/sha.h>
#elif __APPLE__
    #include <sys/event.h>
    #include <fcntl.h>
    #include <CommonCrypto/CommonDigest.h>
#endif

#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#ifdef FCGI_SUPPORT
    #include <fcgiapp.h>
#endif

// Configuration
#define MAX_PATHS 1000
#define MAX_FILTERS 100
#define BUFFER_SIZE 4096
#define WEBSOCKET_PORT 8080
#define MAX_CLIENTS 10
#define MAX_DEPTH 5
#define MAX_FILE_SIZE 1048576  // 1MB max file size for content tracking
#define SYNC_DETECTION_WINDOW 2  // seconds to wait for recreate after delete

// FastCGI Configuration
#define FCGI_BUFFER_SIZE 8192
#define FCGI_MAX_PARAMS 100

// Operating modes
typedef enum {
    MODE_WEBSOCKET,
    MODE_FCGI,
    MODE_BOTH
} operation_mode_t;

// WebSocket/HTTP hybrid server configuration
#define HTTP_PORT 8081
#define MAX_HTTP_CONNECTIONS 20

// Global base path for hiding server paths from clients
static char g_base_path[PATH_MAX] = {0};
static size_t g_base_path_len = 0;

// Global date filtering variables
static char g_current_date[32] = {0};  // Configurable date format
static char g_previous_date[32] = {0}; // Configurable date format
static time_t g_last_date_check = 0;
static int g_date_filtering_enabled = 0;
static char g_date_pattern[32] = "%Y-%m-%d"; // Default yyyy-mm-dd format

// Global operation mode
static operation_mode_t g_operation_mode = MODE_WEBSOCKET;

#ifdef FCGI_SUPPORT
// FastCGI globals
static volatile int g_fcgi_running = 0;
static pthread_t g_fcgi_thread;
static pthread_mutex_t g_fcgi_mutex = PTHREAD_MUTEX_INITIALIZER;
static char g_fcgi_response_buffer[FCGI_BUFFER_SIZE * 4] = {0};
#endif

typedef struct {
    char **filters;
    int filter_count;
    int recursive;
    int max_depth;
    char **watch_paths;
    int path_count;
} monitor_config_t;

typedef struct {
    int fd;
    struct sockaddr_in addr;
    char subscription_pattern[256];  // File pattern this client subscribes to
    int subscribed;  // 0 = all files, 1 = pattern-based
} client_t;

typedef struct {
    client_t clients[MAX_CLIENTS];
    int client_count;
    pthread_mutex_t mutex;
} websocket_server_t;

// File state tracking for sync detection
typedef struct {
    char filepath[PATH_MAX];
    char *last_content;
    size_t content_size;
    time_t last_modified;
    time_t delete_time;
    int is_deleted;
    int line_count;
    char *last_line;
    int watch_fd;  // File descriptor for this watch (macOS)
    int auto_created; // Flag to indicate if this watch was auto-created
} file_state_t;

typedef struct {
    file_state_t files[MAX_PATHS];
    int file_count;
    pthread_mutex_t mutex;
} file_cache_t;

// Directory traversal state to prevent infinite loops
typedef struct {
    char visited_paths[MAX_PATHS][PATH_MAX];
    int path_count;
} visited_dirs_t;

// Dynamic watch management - simplified for client subscriptions
typedef struct {
    char pattern[256];  // File pattern to watch (e.g., "ARC-*.txt", "last.txt")
    char base_path[PATH_MAX];
    int active;
} watch_rule_t;

typedef struct {
    watch_rule_t rules[MAX_FILTERS];
    int rule_count;
    pthread_mutex_t mutex;
} watch_rules_t;

// Global variables
static volatile int running = 1;
static websocket_server_t ws_server = {0};
static file_cache_t file_cache = {0};
static watch_rules_t watch_rules = {0};

#ifdef __linux__
typedef struct {
    int wd;
    char path[PATH_MAX];
} watch_descriptor_t;

static watch_descriptor_t watch_descriptors[MAX_PATHS];
static int watch_count = 0;
#elif __APPLE__
typedef struct {
    int fd;
    char path[PATH_MAX];
    int is_directory;
} watch_descriptor_t;

static watch_descriptor_t watch_descriptors[MAX_PATHS];
static int watch_count = 0;
#endif

// Function prototypes
void signal_handler(int sig);
int should_monitor_file(const char *filename, monitor_config_t *config);
void send_websocket_message(const char *message);
int add_recursive_watches(const char *path, int monitor_fd, monitor_config_t *config);
int add_recursive_watches_with_depth(const char *path, int monitor_fd, monitor_config_t *config, int current_depth, visited_dirs_t *visited);
void *websocket_server_thread(void *arg);
void handle_websocket_client(int client_fd);
char *create_websocket_response(const char *key);
void websocket_handshake(int client_fd, const char *request);
char *get_last_line(const char *filepath);
char *escape_json_string(const char *str);
void print_usage(const char *program_name);
// File state management functions
file_state_t* find_file_state(const char *filepath);
file_state_t* add_file_state(const char *filepath);
void update_file_content(const char *filepath);
void mark_file_deleted(const char *filepath);
char* generate_diff(const char *old_content, const char *new_content);
char* read_file_content(const char *filepath);
void process_file_event(const char *filepath, const char *event_type);
// Dynamic watch management functions
int add_watch_rule(const char *pattern, const char *base_path);
int matches_pattern(const char *filename, const char *pattern);
void check_for_new_files(monitor_config_t *config);
int auto_add_file_watch(const char *filepath, int monitor_fd, monitor_config_t *config);
void remove_old_daily_watches(const char *base_path);
int count_file_lines(const char *filepath);
void detect_line_changes(const char *filepath);
void cleanup_watch_rules(void);
// Path utilities for hiding server base path from clients
const char* get_relative_path(const char *absolute_path);
void set_base_path(const char *path);
// WebSocket subscription management
void send_websocket_message_to_client(int client_fd, const char *message);
void send_websocket_message_filtered(const char *message, const char *filepath);
int client_should_receive_message(client_t *client, const char *filepath);
void handle_websocket_subscription(int client_fd, const char *pattern);
void handle_websocket_message(int client_fd, const char *message);

// Directory loop prevention functions
int is_directory_visited(visited_dirs_t *visited, const char *path);
void add_visited_directory(visited_dirs_t *visited, const char *path);
void init_visited_dirs(visited_dirs_t *visited);

#ifdef FCGI_SUPPORT
// FastCGI functions
void *fcgi_server_thread(void *arg);
void handle_fcgi_request(FCGX_Request *request, monitor_config_t *config);
void fcgi_send_file_list(FCGX_Request *request, monitor_config_t *config);
void fcgi_send_file_content(FCGX_Request *request, const char *filepath);
void fcgi_send_file_status(FCGX_Request *request, const char *filepath);
void fcgi_send_error(FCGX_Request *request, int status, const char *message);
char* fcgi_get_query_param(FCGX_Request *request, const char *param_name);
void fcgi_output_json_header(FCGX_Request *request);
void fcgi_output_html_header(FCGX_Request *request);
#endif

// Signal handler
void signal_handler(int sig) {
    printf("\nReceived signal %d, shutting down...\n", sig);
    fflush(stdout);
    
    running = 0;
    
#ifdef FCGI_SUPPORT
    // Stop FastCGI server
    g_fcgi_running = 0;
#endif
    
    // Close all WebSocket client connections
    pthread_mutex_lock(&ws_server.mutex);
    for (int i = 0; i < ws_server.client_count; i++) {
        close(ws_server.clients[i].fd);
    }
    ws_server.client_count = 0;
    pthread_mutex_unlock(&ws_server.mutex);
    
    printf("Shutting down file monitor...\n");
    fflush(stdout);
    
    // Force exit after a short delay if normal shutdown doesn't work
    alarm(3); // Set 3-second timeout for cleanup
}

// Alarm handler for forced exit
void alarm_handler(int sig) {
    printf("Forced shutdown after timeout\n");
    exit(1);
}

// Get current date in configurable format
void get_current_date(char *date_str) {
    time_t now = time(NULL);
    struct tm *tm_info = localtime(&now);
    strftime(date_str, 32, g_date_pattern, tm_info);
}

// Get previous date in configurable format
void get_previous_date(char *date_str) {
    time_t now = time(NULL);
    now -= 24 * 60 * 60; // Subtract 24 hours
    struct tm *tm_info = localtime(&now);
    strftime(date_str, 32, g_date_pattern, tm_info);
}

// Update current and previous date strings
void update_date_strings() {
    get_current_date(g_current_date);
    get_previous_date(g_previous_date);
    g_last_date_check = time(NULL);
    
    if (g_date_filtering_enabled) {
        printf("Date filtering enabled - pattern: %s, monitoring files with dates: %s and %s\n", 
               g_date_pattern, g_current_date, g_previous_date);
    }
}

// Check if date has changed since last check
int has_date_changed() {
    time_t now = time(NULL);
    
    // Check every minute if date has changed
    if (now - g_last_date_check < 60) {
        return 0;
    }
    
    char current_check[32];
    get_current_date(current_check);
    
    if (strcmp(current_check, g_current_date) != 0) {
        printf("Date change detected: %s -> %s\n", g_current_date, current_check);
        return 1;
    }
    
    g_last_date_check = now;
    return 0;
}

// Check if filename contains current or previous date
int matches_date_pattern(const char *filename) {
    if (!g_date_filtering_enabled) {
        return 1; // If date filtering is disabled, accept all files
    }
    
    // Check if filename contains current date pattern
    if (strstr(filename, g_current_date) != NULL) {
        return 1;
    }
    
    // Check if filename contains previous date pattern
    if (strstr(filename, g_previous_date) != NULL) {
        return 1;
    }
    
    return 0;
}

// Check if file matches filters
int should_monitor_file(const char *filename, monitor_config_t *config) {
    int date_filter_enabled = g_date_filtering_enabled;
    int regular_filters_enabled = (config->filter_count > 0);
    
    // If no filters are enabled, monitor all files
    if (!date_filter_enabled && !regular_filters_enabled) {
        return 1;
    }
    
    // If only date filtering is enabled
    if (date_filter_enabled && !regular_filters_enabled) {
        return matches_date_pattern(filename);
    }
    
    // If only regular filters are enabled
    if (!date_filter_enabled && regular_filters_enabled) {
        for (int i = 0; i < config->filter_count; i++) {
            if (strstr(filename, config->filters[i]) != NULL) {
                return 1;
            }
        }
        return 0;
    }
    
    // If both date filtering and regular filters are enabled
    // Use OR logic: file matches if it satisfies EITHER condition
    if (date_filter_enabled && regular_filters_enabled) {
        // Check if matches date pattern
        if (matches_date_pattern(filename)) {
            return 1;
        }
        
        // Check if matches any regular filter
        for (int i = 0; i < config->filter_count; i++) {
            if (strstr(filename, config->filters[i]) != NULL) {
                return 1;
            }
        }
        return 0;
    }
    
    return 0;
}

// Escape JSON string (handle quotes, newlines, etc.)
char *escape_json_string(const char *str) {
    if (!str) return strdup("");
    
    static char escaped[BUFFER_SIZE * 2];
    int j = 0;
    
    for (int i = 0; str[i] && j < sizeof(escaped) - 10; i++) {
        switch (str[i]) {
            case '"':
                escaped[j++] = '\\';
                escaped[j++] = '"';
                break;
            case '\\':
                escaped[j++] = '\\';
                escaped[j++] = '\\';
                break;
            case '\n':
                escaped[j++] = '\\';
                escaped[j++] = 'n';
                break;
            case '\r':
                escaped[j++] = '\\';
                escaped[j++] = 'r';
                break;
            case '\t':
                escaped[j++] = '\\';
                escaped[j++] = 't';
                break;
            default:
                if (str[i] >= 32 && str[i] <= 126) {
                    escaped[j++] = str[i];
                }
                break;
        }
    }
    escaped[j] = '\0';
    return escaped;
}

// Path utilities for hiding server base path from clients
void set_base_path(const char *path) {
    printf("DEBUG: Setting base path from: %s\n", path);
    fflush(stdout);
    
    if (realpath(path, g_base_path)) {
        g_base_path_len = strlen(g_base_path);
        // Ensure base path ends with /
        if (g_base_path[g_base_path_len - 1] != '/') {
            g_base_path[g_base_path_len] = '/';
            g_base_path[g_base_path_len + 1] = '\0';
            g_base_path_len++;
        }
        printf("DEBUG: Base path set to: %s (len=%zu)\n", g_base_path, g_base_path_len);
        fflush(stdout);
    } else {
        printf("WARNING: Failed to resolve base path: %s, will try alternative approach\n", path);
        fflush(stdout);
        
        // Store the original path as-is for pattern matching
        strncpy(g_base_path, path, sizeof(g_base_path) - 1);
        g_base_path[sizeof(g_base_path) - 1] = '\0';
        g_base_path_len = strlen(g_base_path);
        
        // Ensure it ends with /
        if (g_base_path[g_base_path_len - 1] != '/') {
            g_base_path[g_base_path_len] = '/';
            g_base_path[g_base_path_len + 1] = '\0';
            g_base_path_len++;
        }
        
        printf("DEBUG: Using original base path: %s (len=%zu)\n", g_base_path, g_base_path_len);
        fflush(stdout);
    }
}

const char* get_relative_path(const char *absolute_path) {
    // Use static buffer to avoid returning pointer to local variable
    static char relative_path_buffer[PATH_MAX];
    
    if (g_base_path_len == 0) {
        // No base path set, return as-is
        return absolute_path;
    }
    
    printf("DEBUG: Converting path '%s' with base '%s'\n", absolute_path, g_base_path);
    fflush(stdout);
    
    // Try resolving the absolute_path to see if it matches our base path
    char resolved_file_path[PATH_MAX];
    if (realpath(absolute_path, resolved_file_path)) {
        // Check if the resolved file path starts with the base path
        if (strncmp(resolved_file_path, g_base_path, g_base_path_len) == 0) {
            const char *relative = resolved_file_path + g_base_path_len;
            // Copy to static buffer to avoid returning pointer to local variable
            strncpy(relative_path_buffer, relative, sizeof(relative_path_buffer) - 1);
            relative_path_buffer[sizeof(relative_path_buffer) - 1] = '\0';
            printf("DEBUG: Resolved path conversion: '%s' -> '%s'\n", absolute_path, relative_path_buffer);
            fflush(stdout);
            return relative_path_buffer;
        }
    }
    
    // If realpath failed or didn't match, try string-based relative path extraction
    // Look for common relative path patterns and extract the meaningful part
    const char *current = absolute_path;
    
    // Skip over ../ and ./ prefixes to find the actual content directory
    while (strncmp(current, "../", 3) == 0) {
        current += 3;
    }
    while (strncmp(current, "./", 2) == 0) {
        current += 2;
    }
    
    // If we stripped some relative prefixes, use what's left
    if (current != absolute_path) {
        strncpy(relative_path_buffer, current, sizeof(relative_path_buffer) - 1);
        relative_path_buffer[sizeof(relative_path_buffer) - 1] = '\0';
        printf("DEBUG: String-based path conversion: '%s' -> '%s'\n", absolute_path, relative_path_buffer);
        fflush(stdout);
        return relative_path_buffer;
    }
    
    // Also try to find meaningful directory names in the path
    // This handles cases where path contains archive/emu_data/test but we want emu_data/test
    const char *archive_pos = strstr(absolute_path, "archive/");
    if (archive_pos) {
        const char *after_archive = archive_pos + strlen("archive/");
        strncpy(relative_path_buffer, after_archive, sizeof(relative_path_buffer) - 1);
        relative_path_buffer[sizeof(relative_path_buffer) - 1] = '\0';
        printf("DEBUG: Archive-based path conversion: '%s' -> '%s'\n", absolute_path, relative_path_buffer);
        fflush(stdout);
        return relative_path_buffer;
    }
    
    // No conversion possible, return as-is
    printf("DEBUG: No path conversion possible for: '%s'\n", absolute_path);
    fflush(stdout);
    return absolute_path;
}

// Get the last line of a file
char *get_last_line(const char *filepath) {
    FILE *file = fopen(filepath, "r");
    if (!file) {
        return strdup("");
    }
    
    static char last_line[BUFFER_SIZE];
    char current_line[BUFFER_SIZE];
    last_line[0] = '\0';
    
    // Read file line by line, keeping track of the last non-empty line
    while (fgets(current_line, sizeof(current_line), file)) {
        // Remove trailing newline
        size_t len = strlen(current_line);
        if (len > 0 && current_line[len - 1] == '\n') {
            current_line[len - 1] = '\0';
        }
        
        // Only update if line is not empty
        if (strlen(current_line) > 0) {
            strncpy(last_line, current_line, sizeof(last_line) - 1);
            last_line[sizeof(last_line) - 1] = '\0';
        }
    }
    
    fclose(file);
    return last_line;
}

// WebSocket message sending from file monitoring thread (lock-free)
void send_websocket_message(const char *message) {
    printf("DEBUG: send_websocket_message called from file thread\n");
    fflush(stdout);
    
    // WebSocket frame format for text message
    char frame[BUFFER_SIZE + 10];
    int msg_len = strlen(message);
    int frame_len = 0;
    
    frame[0] = 0x81; // FIN=1, opcode=1 (text)
    
    if (msg_len < 126) {
        frame[1] = msg_len;
        frame_len = 2;
    } else if (msg_len < 65536) {
        frame[1] = 126;
        frame[2] = (msg_len >> 8) & 0xFF;
        frame[3] = msg_len & 0xFF;
        frame_len = 4;
    } else {
        frame[1] = 127;
        for (int i = 0; i < 8; i++) {
            frame[2 + i] = (msg_len >> (56 - 8*i)) & 0xFF;
        }
        frame_len = 10;
    }
    
    memcpy(frame + frame_len, message, msg_len);
    frame_len += msg_len;
    
    // Quick lock-free access to send to clients 
    // Note: This is potentially unsafe if client list changes during iteration,
    // but we prioritize avoiding deadlock over perfect safety here
    int client_count = ws_server.client_count; // Atomic read
    for (int i = 0; i < client_count && i < MAX_CLIENTS; i++) {
        int client_fd = ws_server.clients[i].fd; // Atomic read
        if (client_fd > 0) {
            ssize_t bytes_sent = send(client_fd, frame, frame_len, MSG_NOSIGNAL | MSG_DONTWAIT);
            if (bytes_sent < 0) {
                if (errno != EAGAIN && errno != EWOULDBLOCK) {
                    printf("DEBUG: Failed to send to client %d from file thread, errno=%d\n", client_fd, errno);
                }
            } else {
                printf("DEBUG: Sent %zd bytes to client %d from file thread\n", bytes_sent, client_fd);
            }
        }
    }
    
    printf("DEBUG: send_websocket_message completed from file thread\n");
    fflush(stdout);
}

void send_websocket_message_filtered(const char *message, const char *filepath) {
    printf("DEBUG: send_websocket_message_filtered called from file thread for %s\n", filepath);
    fflush(stdout);
    
    // WebSocket frame format for text message
    char frame[BUFFER_SIZE + 10];
    int msg_len = strlen(message);
    int frame_len = 0;
    
    frame[0] = 0x81; // FIN=1, opcode=1 (text)
    
    if (msg_len < 126) {
        frame[1] = msg_len;
        frame_len = 2;
    } else if (msg_len < 65536) {
        frame[1] = 126;
        frame[2] = (msg_len >> 8) & 0xFF;
        frame[3] = msg_len & 0xFF;
        frame_len = 4;
    } else {
        frame[1] = 127;
        for (int i = 0; i < 8; i++) {
            frame[2 + i] = (msg_len >> (56 - 8*i)) & 0xFF;
        }
        frame_len = 10;
    }
    
    memcpy(frame + frame_len, message, msg_len);
    frame_len += msg_len;
    
    // Quick lock-free access to send to filtered clients
    // Note: This is potentially unsafe if client list changes during iteration,
    // but we prioritize avoiding deadlock over perfect safety here
    int client_count = ws_server.client_count; // Atomic read
    for (int i = 0; i < client_count && i < MAX_CLIENTS; i++) {
        client_t client_copy = ws_server.clients[i]; // Atomic copy of client data
        if (client_copy.fd > 0 && client_should_receive_message(&client_copy, filepath)) {
            ssize_t bytes_sent = send(client_copy.fd, frame, frame_len, MSG_NOSIGNAL | MSG_DONTWAIT);
            if (bytes_sent < 0) {
                if (errno != EAGAIN && errno != EWOULDBLOCK) {
                    printf("DEBUG: Failed to send to client %d from file thread, errno=%d\n", client_copy.fd, errno);
                }
            } else {
                printf("DEBUG: Sent %zd bytes to client %d from file thread (filtered)\n", bytes_sent, client_copy.fd);
            }
        }
    }
    
    printf("DEBUG: send_websocket_message_filtered completed from file thread\n");
    fflush(stdout);
}

// Client subscription management
int client_should_receive_message(client_t *client, const char *filepath) {
    // If no subscription pattern is set, receive all messages (default behavior)
    if (strlen(client->subscription_pattern) == 0) {
        return 1;
    }
    
    printf("DEBUG: Checking if client should receive message for path: %s, pattern: %s\n", 
           filepath, client->subscription_pattern);
    fflush(stdout);
    
    // Try to match against the full relative path
    if (matches_pattern(filepath, client->subscription_pattern)) {
        printf("DEBUG: Full path match found\n");
        fflush(stdout);
        return 1;
    }
    
    // Try matching against just the filename (for patterns like "last.txt" or "*.txt")
    const char *filename = strrchr(filepath, '/');
    if (filename) {
        filename++; // Skip the '/' character
        if (matches_pattern(filename, client->subscription_pattern)) {
            printf("DEBUG: Filename match found: %s\n", filename);
            fflush(stdout);
            return 1;
        }
    } else {
        // No path separator found, the filepath is already just a filename
        if (matches_pattern(filepath, client->subscription_pattern)) {
            printf("DEBUG: Direct filename match found\n");
            fflush(stdout);
            return 1;
        }
    }
    
    printf("DEBUG: No match found for path: %s, pattern: %s\n", filepath, client->subscription_pattern);
    fflush(stdout);
    return 0; // No match found
}

// Directory loop prevention implementation
void init_visited_dirs(visited_dirs_t *visited) {
    visited->path_count = 0;
}

int is_directory_visited(visited_dirs_t *visited, const char *path) {
    char resolved_path[PATH_MAX];
    
    // Resolve the path to handle symlinks
    if (!realpath(path, resolved_path)) {
        return 0; // If we can't resolve it, assume it's not visited
    }
    
    // Check if this resolved path has been visited before
    for (int i = 0; i < visited->path_count; i++) {
        if (strcmp(visited->visited_paths[i], resolved_path) == 0) {
            return 1; // Already visited
        }
    }
    
    return 0; // Not visited yet
}

void add_visited_directory(visited_dirs_t *visited, const char *path) {
    char resolved_path[PATH_MAX];
    
    // Resolve the path to handle symlinks
    if (!realpath(path, resolved_path)) {
        return; // Can't resolve, don't add
    }
    
    // Add to visited list if we have space
    if (visited->path_count < MAX_PATHS) {
        strncpy(visited->visited_paths[visited->path_count], resolved_path, PATH_MAX - 1);
        visited->visited_paths[visited->path_count][PATH_MAX - 1] = '\0';
        visited->path_count++;
    }
}

// WebSocket subscription message handling
void handle_websocket_subscription(int client_fd, const char *pattern) {
    printf("DEBUG: handle_websocket_subscription called with client_fd=%d, pattern='%s'\n", client_fd, pattern);
    fflush(stdout);
    
    printf("DEBUG: About to acquire mutex lock...\n");
    fflush(stdout);
    
    pthread_mutex_lock(&ws_server.mutex);
    
    printf("DEBUG: Mutex acquired! Current client count: %d\n", ws_server.client_count);
    for (int i = 0; i < ws_server.client_count; i++) {
        printf("DEBUG: Client %d: fd=%d\n", i, ws_server.clients[i].fd);
    }
    fflush(stdout);
    
    // Find the client in our client list and update subscription
    int client_found = 0;
    for (int i = 0; i < ws_server.client_count; i++) {
        if (ws_server.clients[i].fd == client_fd) {
            printf("DEBUG: Found client in list at index %d\n", i);
            fflush(stdout);
            
            // Update the client's subscription pattern
            strncpy(ws_server.clients[i].subscription_pattern, pattern, 
                    sizeof(ws_server.clients[i].subscription_pattern) - 1);
            ws_server.clients[i].subscription_pattern[sizeof(ws_server.clients[i].subscription_pattern) - 1] = '\0';
            
            printf("Client %d subscribed to pattern: %s\n", client_fd, pattern);
            client_found = 1;
            break;
        }
    }
    
    if (!client_found) {
        printf("DEBUG: Client fd=%d not found in client list!\n", client_fd);
        fflush(stdout);
    }
    
    printf("DEBUG: About to release mutex lock...\n");
    fflush(stdout);
    
    pthread_mutex_unlock(&ws_server.mutex);
    
    printf("DEBUG: Mutex released!\n");
    fflush(stdout);
    
    // Send confirmation message AFTER releasing the mutex to avoid deadlock
    if (client_found) {
        char response[BUFFER_SIZE];
        snprintf(response, sizeof(response), 
            "{\"type\":\"SUBSCRIPTION_CONFIRMED\",\"pattern\":\"%s\",\"timestamp\":%ld}", 
            pattern, time(NULL));
        
        printf("DEBUG: Sending confirmation: %s\n", response);
        fflush(stdout);
        
        send_websocket_message_to_client(client_fd, response);
        
        printf("DEBUG: Confirmation sent\n");
        fflush(stdout);
    }
}

void handle_websocket_message(int client_fd, const char *message) {
    // Parse JSON message to extract subscription requests
    // Expected format: {"action":"subscribe","pattern":"*.txt"}
    
    printf("DEBUG: handle_websocket_message called with message: %s\n", message);
    fflush(stdout);
    
    // Simple JSON parsing for subscription messages
    if (strstr(message, "\"action\":\"subscribe\"") != NULL) {
        printf("DEBUG: Subscribe action detected\n");
        fflush(stdout);
        
        // Extract pattern from JSON
        char *pattern_start = strstr(message, "\"pattern\":\"");
        if (pattern_start) {
            pattern_start += 11; // Skip past "pattern":"
            char *pattern_end = strchr(pattern_start, '"');
            if (pattern_end) {
                char pattern[256];
                int pattern_len = pattern_end - pattern_start;
                if (pattern_len < sizeof(pattern)) {
                    strncpy(pattern, pattern_start, pattern_len);
                    pattern[pattern_len] = '\0';
                    printf("DEBUG: Extracted pattern: %s\n", pattern);
                    fflush(stdout);
                    handle_websocket_subscription(client_fd, pattern);
                }
            }
        }
    } else if (strstr(message, "\"action\":\"unsubscribe\"") != NULL) {
        printf("DEBUG: Unsubscribe action detected\n");
        fflush(stdout);
        // Clear subscription pattern
        handle_websocket_subscription(client_fd, "");
        printf("Client %d unsubscribed from all patterns\n", client_fd);
    }
}

void send_websocket_message_to_client(int client_fd, const char *message) {
    printf("DEBUG: send_websocket_message_to_client called for fd=%d\n", client_fd);
    fflush(stdout);
    
    // WebSocket frame format for text message
    char frame[BUFFER_SIZE + 10];
    int msg_len = strlen(message);
    int frame_len = 0;
    
    frame[0] = 0x81; // FIN=1, opcode=1 (text)
    
    if (msg_len < 126) {
        frame[1] = msg_len;
        frame_len = 2;
    } else if (msg_len < 65536) {
        frame[1] = 126;
        frame[2] = (msg_len >> 8) & 0xFF;
        frame[3] = msg_len & 0xFF;
        frame_len = 4;
    } else {
        frame[1] = 127;
        for (int i = 0; i < 8; i++) {
            frame[2 + i] = (msg_len >> (56 - 8*i)) & 0xFF;
        }
        frame_len = 10;
    }
    
    memcpy(frame + frame_len, message, msg_len);
    frame_len += msg_len;
    
    printf("DEBUG: About to send %d bytes to client %d\n", frame_len, client_fd);
    fflush(stdout);
    
    // Send to specific client with non-blocking and error handling
    ssize_t bytes_sent = send(client_fd, frame, frame_len, MSG_NOSIGNAL | MSG_DONTWAIT);
    if (bytes_sent < 0) {
        if (errno == EAGAIN || errno == EWOULDBLOCK) {
            printf("DEBUG: Client %d receive buffer full, message queued\n", client_fd);
        } else if (errno == EPIPE || errno == ECONNRESET) {
            printf("DEBUG: Client %d disconnected during send\n", client_fd);
        } else {
            printf("DEBUG: Failed to send message to client %d, errno=%d\n", client_fd, errno);
        }
    } else if (bytes_sent < frame_len) {
        printf("DEBUG: Partial send to client %d: %zd of %d bytes\n", client_fd, bytes_sent, frame_len);
    } else {
        printf("DEBUG: Successfully sent %zd bytes to client %d\n", bytes_sent, client_fd);
    }
    fflush(stdout);
}

// File state management functions
file_state_t* find_file_state(const char *filepath) {
    pthread_mutex_lock(&file_cache.mutex);
    for (int i = 0; i < file_cache.file_count; i++) {
        if (strcmp(file_cache.files[i].filepath, filepath) == 0) {
            pthread_mutex_unlock(&file_cache.mutex);
            return &file_cache.files[i];
        }
    }
    pthread_mutex_unlock(&file_cache.mutex);
    return NULL;
}

file_state_t* add_file_state(const char *filepath) {
    pthread_mutex_lock(&file_cache.mutex);
    if (file_cache.file_count >= MAX_PATHS) {
        pthread_mutex_unlock(&file_cache.mutex);
        return NULL;
    }
    
    file_state_t *state = &file_cache.files[file_cache.file_count];
    strncpy(state->filepath, filepath, PATH_MAX - 1);
    state->filepath[PATH_MAX - 1] = '\0';
    state->last_content = NULL;
    state->content_size = 0;
    state->last_modified = 0;
    state->delete_time = 0;
    state->is_deleted = 0;
    state->line_count = 0;
    state->last_line = NULL;
    state->watch_fd = -1;
    state->auto_created = 0;
    file_cache.file_count++;
    pthread_mutex_unlock(&file_cache.mutex);
    return state;
}

char* read_file_content(const char *filepath) {
    struct stat st;
    if (stat(filepath, &st) != 0) return NULL;
    
    // Skip large files
    if (st.st_size > MAX_FILE_SIZE) return NULL;
    
    FILE *file = fopen(filepath, "rb");
    if (!file) return NULL;
    
    char *content = malloc(st.st_size + 1);
    if (!content) {
        fclose(file);
        return NULL;
    }
    
    size_t read_size = fread(content, 1, st.st_size, file);
    content[read_size] = '\0';
    fclose(file);
    
    return content;
}

void update_file_content(const char *filepath) {
    file_state_t *state = find_file_state(filepath);
    if (!state) {
        state = add_file_state(filepath);
        if (!state) return;
    }
    
    char *new_content = read_file_content(filepath);
    if (!new_content) return;
    
    pthread_mutex_lock(&file_cache.mutex);
    if (state->last_content) {
        free(state->last_content);
    }
    state->last_content = new_content;
    state->content_size = strlen(new_content);
    state->last_modified = time(NULL);
    state->is_deleted = 0;
    state->line_count = count_file_lines(filepath);
    
    // Update last line
    if (state->last_line) {
        free(state->last_line);
    }
    state->last_line = strdup(get_last_line(filepath));
    
    pthread_mutex_unlock(&file_cache.mutex);
}

void mark_file_deleted(const char *filepath) {
    file_state_t *state = find_file_state(filepath);
    if (!state) return;
    
    pthread_mutex_lock(&file_cache.mutex);
    state->delete_time = time(NULL);
    state->is_deleted = 1;
    pthread_mutex_unlock(&file_cache.mutex);
}

char* generate_diff(const char *old_content, const char *new_content) {
    if (!old_content || !new_content) return strdup("");
    
    static char diff_result[BUFFER_SIZE * 2];
    char *old_lines[1000], *new_lines[1000];
    int old_count = 0, new_count = 0;
    
    // Simple line-based diff - split into lines
    char *old_copy = strdup(old_content);
    char *new_copy = strdup(new_content);
    
    char *token = strtok(old_copy, "\n");
    while (token && old_count < 1000) {
        old_lines[old_count++] = token;
        token = strtok(NULL, "\n");
    }
    
    token = strtok(new_copy, "\n");
    while (token && new_count < 1000) {
        new_lines[new_count++] = token;
        token = strtok(NULL, "\n");
    }
    
    // Generate simple diff output
    int diff_len = 0;
    diff_len += snprintf(diff_result + diff_len, sizeof(diff_result) - diff_len, 
                        "--- old\\n+++ new\\n");
    
    int max_lines = (old_count > new_count) ? old_count : new_count;
    for (int i = 0; i < max_lines && diff_len < sizeof(diff_result) - 100; i++) {
        if (i < old_count && i < new_count) {
            if (strcmp(old_lines[i], new_lines[i]) != 0) {
                diff_len += snprintf(diff_result + diff_len, sizeof(diff_result) - diff_len,
                                   "-%s\\n+%s\\n", old_lines[i], new_lines[i]);
            }
        } else if (i < old_count) {
            diff_len += snprintf(diff_result + diff_len, sizeof(diff_result) - diff_len,
                               "-%s\\n", old_lines[i]);
        } else if (i < new_count) {
            diff_len += snprintf(diff_result + diff_len, sizeof(diff_result) - diff_len,
                               "+%s\\n", new_lines[i]);
        }
    }
    
    free(old_copy);
    free(new_copy);
    return diff_result;
}

void process_file_event(const char *filepath, const char *event_type) {
    char message[BUFFER_SIZE * 2];
    char *last_line = "";
    char *diff_content = "";
    char *escaped_last_line;
    char *escaped_diff;
    int line_change_detected = 0;
    
    if (strcmp(event_type, "DELETED") == 0) {
        mark_file_deleted(filepath);
    } else if (strcmp(event_type, "CREATED") == 0 || strcmp(event_type, "MODIFIED") == 0) {
        file_state_t *state = find_file_state(filepath);
        
        // Check if this is a recreate after delete (sync scenario)
        if (state && state->is_deleted && (time(NULL) - state->delete_time) <= SYNC_DETECTION_WINDOW) {
            // This is likely a sync operation - compare content and generate diff
            char *new_content = read_file_content(filepath);
            if (new_content && state->last_content) {
                if (strcmp(state->last_content, new_content) != 0) {
                    diff_content = generate_diff(state->last_content, new_content);
                    event_type = "SYNC_MODIFIED"; // Special event type for sync with changes
                } else {
                    event_type = "SYNC_UNCHANGED"; // File was recreated but content is same
                }
            }
            if (new_content) free(new_content);
        }
        
        // Check for line changes (new lines added)
        if (strcmp(event_type, "MODIFIED") == 0) {
            detect_line_changes(filepath);
            file_state_t *current_state = find_file_state(filepath);
            if (current_state && current_state->line_count > 0) {
                line_change_detected = 1;
            }
        }
        
        // Update file state
        update_file_content(filepath);
        
        // Get last line for display (use original filepath for file operations)
        struct stat file_stat;
        if (stat(filepath, &file_stat) == 0 && S_ISREG(file_stat.st_mode)) {
            last_line = get_last_line(filepath);
        }
    }
    
    // Escape content for JSON (use actual file content)
    escaped_last_line = escape_json_string(last_line);
    escaped_diff = escape_json_string(diff_content);
    
    // Get relative path for client (hide server base path) - only for the message
    const char *relative_path = get_relative_path(filepath);
    
    // Enhanced message format with line change info (use relative path for client)
    snprintf(message, sizeof(message), 
        "{\"type\":\"%s\",\"path\":\"%s\",\"timestamp\":%ld,\"lastLine\":\"%s\",\"diff\":\"%s\",\"lineChange\":%s}", 
        event_type, relative_path, time(NULL), escaped_last_line, escaped_diff, 
        line_change_detected ? "true" : "false");
    
    printf("File event: %s\n", message);
    // Use relative path for filtering but keep original filepath for context
    send_websocket_message_filtered(message, relative_path);
}

// Dynamic watch management functions
int add_watch_rule(const char *pattern, const char *base_path) {
    pthread_mutex_lock(&watch_rules.mutex);
    
    if (watch_rules.rule_count >= MAX_FILTERS) {
        pthread_mutex_unlock(&watch_rules.mutex);
        return -1;
    }
    
    watch_rule_t *rule = &watch_rules.rules[watch_rules.rule_count];
    strncpy(rule->pattern, pattern, sizeof(rule->pattern) - 1);
    strncpy(rule->base_path, base_path, sizeof(rule->base_path) - 1);
    rule->active = 1;
    
    watch_rules.rule_count++;
    pthread_mutex_unlock(&watch_rules.mutex);
    
    printf("Added watch rule: pattern=%s, path=%s\n", pattern, base_path);
    
    return 0;
}

int matches_pattern(const char *filename, const char *pattern) {
    // Simple pattern matching with * wildcard support
    const char *p = pattern;
    const char *f = filename;
    
    while (*p && *f) {
        if (*p == '*') {
            // Handle wildcard
            p++;
            if (!*p) return 1; // Pattern ends with *, match rest
            
            // Find next matching character
            while (*f && *f != *p) f++;
            if (!*f) return 0;
        } else if (*p == *f) {
            p++;
            f++;
        } else {
            return 0;
        }
    }
    
    // Handle remaining wildcards at end
    while (*p == '*') p++;
    
    return (!*p && !*f);
}

void detect_line_changes(const char *filepath) {
    file_state_t *state = find_file_state(filepath);
    if (!state) return;
    
    int new_line_count = count_file_lines(filepath);
    int old_line_count = state->line_count;
    
    if (new_line_count > old_line_count) {
        char message[BUFFER_SIZE];
        char *new_last_line = get_last_line(filepath);
        char *escaped_line = escape_json_string(new_last_line);
        
        // Get relative path for client (hide server base path)
        const char *relative_path = get_relative_path(filepath);
        
        snprintf(message, sizeof(message),
            "{\"type\":\"LINE_ADDED\",\"path\":\"%s\",\"timestamp\":%ld,\"newLine\":\"%s\",\"lineCount\":%d,\"prevLineCount\":%d}",
            relative_path, time(NULL), escaped_line, new_line_count, old_line_count);
        
        printf("Line change detected: %s\n", message);
        send_websocket_message_filtered(message, relative_path);
        
        // Update line count
        pthread_mutex_lock(&file_cache.mutex);
        state->line_count = new_line_count;
        if (state->last_line) free(state->last_line);
        state->last_line = strdup(new_last_line);
        pthread_mutex_unlock(&file_cache.mutex);
    }
}

int count_file_lines(const char *filepath) {
    FILE *file = fopen(filepath, "r");
    if (!file) return 0;
    
    int lines = 0;
    char ch;
    while ((ch = fgetc(file)) != EOF) {
        if (ch == '\n') lines++;
    }
    
    fclose(file);
    return lines;
}

void check_for_new_files(monitor_config_t *config) {
    pthread_mutex_lock(&watch_rules.mutex);
    
    for (int i = 0; i < watch_rules.rule_count; i++) {
        watch_rule_t *rule = &watch_rules.rules[i];
        if (!rule->active) continue;
        
        DIR *dir = opendir(rule->base_path);
        if (!dir) continue;
        
        struct dirent *entry;
        while ((entry = readdir(dir)) != NULL) {
            if (strcmp(entry->d_name, ".") == 0 || strcmp(entry->d_name, "..") == 0) {
                continue;
            }
            
            if (matches_pattern(entry->d_name, rule->pattern)) {
                char full_path[PATH_MAX];
                snprintf(full_path, sizeof(full_path), "%s/%s", rule->base_path, entry->d_name);
                
                // Avoid infinite loops by checking if path points to itself or parent
                char resolved_path[PATH_MAX];
                if (realpath(full_path, resolved_path)) {
                    // Check if this resolves to any of the base paths we're monitoring
                    int is_self_reference = 0;
                    for (int j = 0; j < config->path_count; j++) {
                        char resolved_base[PATH_MAX];
                        if (realpath(config->watch_paths[j], resolved_base)) {
                            if (strstr(resolved_path, resolved_base) == resolved_path) {
                                is_self_reference = 1;
                                break;
                            }
                        }
                    }
                    
                    if (is_self_reference) {
                        continue; // Skip self-referencing paths
                    }
                }
                
                // Check if we're already watching this file
                int already_watched = 0;
                for (int j = 0; j < file_cache.file_count; j++) {
                    if (strcmp(file_cache.files[j].filepath, full_path) == 0) {
                        already_watched = 1;
                        break;
                    }
                }
                
                if (!already_watched) {
                    printf("Auto-adding watch for new file: %s\n", full_path);
                    // Add to file cache and start monitoring
                    file_state_t *state = add_file_state(full_path);
                    if (state) {
                        state->auto_created = 1;
                        state->line_count = count_file_lines(full_path);
                        update_file_content(full_path);
                        
                        // Send notification about new file being watched
                        char message[BUFFER_SIZE];
                        snprintf(message, sizeof(message),
                            "{\"type\":\"WATCH_ADDED\",\"path\":\"%s\",\"timestamp\":%ld,\"pattern\":\"%s\"}",
                            full_path, time(NULL), rule->pattern);
                        send_websocket_message_filtered(message, full_path);
                    }
                }
            }
        }
        
        closedir(dir);
    }
    
    pthread_mutex_unlock(&watch_rules.mutex);
}

void remove_old_daily_watches(const char *base_path) {
    time_t now = time(NULL);
    struct tm *tm_now = localtime(&now);
    char today_pattern[32];
    snprintf(today_pattern, sizeof(today_pattern), "ARC-%04d-%02d-%02d.txt", 
             tm_now->tm_year + 1900, tm_now->tm_mon + 1, tm_now->tm_mday);
    
    pthread_mutex_lock(&file_cache.mutex);
    
    for (int i = 0; i < file_cache.file_count; i++) {
        file_state_t *state = &file_cache.files[i];
        if (state->auto_created && strstr(state->filepath, "ARC-") && 
            strstr(state->filepath, ".txt") && !strstr(state->filepath, today_pattern)) {
            
            printf("Removing old daily watch: %s\n", state->filepath);
            
            // Send notification about watch being removed
            char message[BUFFER_SIZE];
            snprintf(message, sizeof(message),
                "{\"type\":\"WATCH_REMOVED\",\"path\":\"%s\",\"timestamp\":%ld,\"reason\":\"daily_rotation\"}",
                state->filepath, time(NULL));
            send_websocket_message_filtered(message, state->filepath);
            
            // Cleanup state
            if (state->last_content) {
                free(state->last_content);
                state->last_content = NULL;
            }
            if (state->last_line) {
                free(state->last_line);
                state->last_line = NULL;
            }
            
            // Shift remaining entries
            for (int j = i; j < file_cache.file_count - 1; j++) {
                file_cache.files[j] = file_cache.files[j + 1];
            }
            file_cache.file_count--;
            i--; // Adjust index since we removed an entry
        }
    }
    
    pthread_mutex_unlock(&file_cache.mutex);
}

void cleanup_watch_rules(void) {
    pthread_mutex_lock(&watch_rules.mutex);
    
    for (int i = 0; i < watch_rules.rule_count; i++) {
        watch_rules.rules[i].active = 0;
    }
    watch_rules.rule_count = 0;
    
    pthread_mutex_unlock(&watch_rules.mutex);
}

#ifdef FCGI_SUPPORT
// FastCGI implementation

char* fcgi_get_query_param(FCGX_Request *request, const char *param_name) {
    char *query_string = FCGX_GetParam("QUERY_STRING", request->envp);
    if (!query_string) return NULL;
    
    static char param_value[BUFFER_SIZE];
    char *param_start = strstr(query_string, param_name);
    if (!param_start) return NULL;
    
    param_start += strlen(param_name);
    if (*param_start != '=') return NULL;
    param_start++; // Skip '='
    
    char *param_end = strchr(param_start, '&');
    size_t param_len;
    if (param_end) {
        param_len = param_end - param_start;
    } else {
        param_len = strlen(param_start);
    }
    
    if (param_len >= sizeof(param_value)) {
        param_len = sizeof(param_value) - 1;
    }
    
    strncpy(param_value, param_start, param_len);
    param_value[param_len] = '\0';
    
    return param_value;
}

void fcgi_output_json_header(FCGX_Request *request) {
    FCGX_FPrintF(request->out, "Content-Type: application/json\r\n");
    FCGX_FPrintF(request->out, "Access-Control-Allow-Origin: *\r\n");
    FCGX_FPrintF(request->out, "Cache-Control: no-cache\r\n");
    FCGX_FPrintF(request->out, "\r\n");
}

void fcgi_output_html_header(FCGX_Request *request) {
    FCGX_FPrintF(request->out, "Content-Type: text/html\r\n");
    FCGX_FPrintF(request->out, "Access-Control-Allow-Origin: *\r\n");
    FCGX_FPrintF(request->out, "Cache-Control: no-cache\r\n");
    FCGX_FPrintF(request->out, "\r\n");
}

void fcgi_send_error(FCGX_Request *request, int status, const char *message) {
    FCGX_FPrintF(request->out, "Status: %d\r\n", status);
    fcgi_output_json_header(request);
    FCGX_FPrintF(request->out, "{\"error\":\"%s\",\"status\":%d}\n", message, status);
}

void fcgi_send_file_content(FCGX_Request *request, const char *filepath) {
    FILE *file = fopen(filepath, "r");
    if (!file) {
        fcgi_send_error(request, 404, "File not found");
        return;
    }
    
    struct stat st;
    if (stat(filepath, &st) != 0) {
        fclose(file);
        fcgi_send_error(request, 500, "Cannot stat file");
        return;
    }
    
    if (st.st_size > MAX_FILE_SIZE) {
        fclose(file);
        fcgi_send_error(request, 413, "File too large");
        return;
    }
    
    fcgi_output_json_header(request);
    
    FCGX_FPrintF(request->out, "{\"filepath\":\"%s\",\"size\":%ld,\"modified\":%ld,\"content\":\"", 
                 get_relative_path(filepath), st.st_size, st.st_mtime);
    
    char buffer[BUFFER_SIZE];
    while (fgets(buffer, sizeof(buffer), file)) {
        // Escape content for JSON
        char *escaped = escape_json_string(buffer);
        FCGX_FPrintF(request->out, "%s", escaped);
    }
    
    FCGX_FPrintF(request->out, "\"}\n");
    fclose(file);
}

void fcgi_send_file_status(FCGX_Request *request, const char *filepath) {
    struct stat st;
    if (stat(filepath, &st) != 0) {
        fcgi_send_error(request, 404, "File not found");
        return;
    }
    
    fcgi_output_json_header(request);
    
    char *last_line = get_last_line(filepath);
    char *escaped_last_line = escape_json_string(last_line);
    
    FCGX_FPrintF(request->out, 
                 "{\"filepath\":\"%s\",\"size\":%ld,\"modified\":%ld,\"lines\":%d,\"last_line\":\"%s\"}\n",
                 get_relative_path(filepath), st.st_size, st.st_mtime, 
                 count_file_lines(filepath), escaped_last_line);
}

void fcgi_send_file_list(FCGX_Request *request, monitor_config_t *config) {
    fcgi_output_json_header(request);
    
    FCGX_FPrintF(request->out, "{\"files\":[\n");
    
    int first = 1;
    pthread_mutex_lock(&file_cache.mutex);
    
    for (int i = 0; i < file_cache.file_count; i++) {
        file_state_t *state = &file_cache.files[i];
        if (state->is_deleted) continue;
        
        struct stat st;
        if (stat(state->filepath, &st) != 0) continue;
        
        if (!first) {
            FCGX_FPrintF(request->out, ",\n");
        }
        first = 0;
        
        char *escaped_last_line = escape_json_string(state->last_line ? state->last_line : "");
        
        FCGX_FPrintF(request->out, 
                     "  {\"filepath\":\"%s\",\"size\":%ld,\"modified\":%ld,\"lines\":%d,\"last_line\":\"%s\"}",
                     get_relative_path(state->filepath), st.st_size, st.st_mtime, 
                     state->line_count, escaped_last_line);
    }
    
    pthread_mutex_unlock(&file_cache.mutex);
    
    FCGX_FPrintF(request->out, "\n],\"timestamp\":%ld}\n", time(NULL));
}

void handle_fcgi_request(FCGX_Request *request, monitor_config_t *config) {
    char *request_uri = FCGX_GetParam("REQUEST_URI", request->envp);
    char *request_method = FCGX_GetParam("REQUEST_METHOD", request->envp);
    
    if (!request_uri || !request_method) {
        fcgi_send_error(request, 400, "Invalid request");
        return;
    }
    
    printf("FastCGI Request: %s %s\n", request_method, request_uri);
    
    if (strcmp(request_method, "GET") != 0) {
        fcgi_send_error(request, 405, "Method not allowed");
        return;
    }
    
    // Parse request path
    if (strstr(request_uri, "/api/files") == request_uri) {
        char *action = fcgi_get_query_param(request, "action");
        char *filepath = fcgi_get_query_param(request, "file");
        
        if (!action) {
            // Default action: list files
            fcgi_send_file_list(request, config);
        } else if (strcmp(action, "list") == 0) {
            fcgi_send_file_list(request, config);
        } else if (strcmp(action, "content") == 0 && filepath) {
            fcgi_send_file_content(request, filepath);
        } else if (strcmp(action, "status") == 0 && filepath) {
            fcgi_send_file_status(request, filepath);
        } else {
            fcgi_send_error(request, 400, "Invalid action or missing parameters");
        }
    } else if (strstr(request_uri, "/api/status") == request_uri) {
        fcgi_output_json_header(request);
        FCGX_FPrintF(request->out, 
                     "{\"status\":\"running\",\"mode\":\"fcgi\",\"files_monitored\":%d,\"timestamp\":%ld}\n",
                     file_cache.file_count, time(NULL));
    } else {
        fcgi_send_error(request, 404, "Not found");
    }
}

void *fcgi_server_thread(void *arg) {
    monitor_config_t *config = (monitor_config_t *)arg;
    FCGX_Request request;
    
    if (FCGX_Init() != 0) {
        printf("Failed to initialize FastCGI\n");
        return NULL;
    }
    
    if (FCGX_InitRequest(&request, 0, 0) != 0) {
        printf("Failed to initialize FastCGI request\n");
        return NULL;
    }
    
    printf("FastCGI server started\n");
    g_fcgi_running = 1;
    
    while (running && g_fcgi_running) {
        int rc = FCGX_Accept_r(&request);
        if (rc < 0) {
            if (running && g_fcgi_running) {
                printf("FastCGI accept failed: %d\n", rc);
            }
            break;
        }
        
        handle_fcgi_request(&request, config);
        FCGX_Finish_r(&request);
    }
    
    FCGX_Free(&request, 1);
    printf("FastCGI server stopped\n");
    g_fcgi_running = 0;
    return NULL;
}
#endif

#ifdef __linux__
// Linux inotify implementation
int add_recursive_watches_with_depth(const char *path, int inotify_fd, monitor_config_t *config, int current_depth, visited_dirs_t *visited) {
    DIR *dir;
    struct dirent *entry;
    struct stat statbuf;
    char full_path[PATH_MAX];
    
    // Check if we've already visited this directory (prevents infinite loops)
    if (is_directory_visited(visited, path)) {
        printf("Skipping already visited directory: %s\n", path);
        return 0;
    }
    
    // Add this directory to the visited list
    add_visited_directory(visited, path);
    
    int wd = inotify_add_watch(inotify_fd, path, 
        IN_CREATE | IN_DELETE | IN_MODIFY | IN_MOVED_FROM | IN_MOVED_TO);
    
    if (wd < 0) {
        perror("inotify_add_watch");
        return -1;
    }
    
    if (watch_count < MAX_PATHS) {
        watch_descriptors[watch_count].wd = wd;
        strncpy(watch_descriptors[watch_count].path, path, PATH_MAX - 1);
        watch_count++;
    }
    
    if (!config->recursive || (config->max_depth != -1 && current_depth >= config->max_depth)) return 0;
    
    dir = opendir(path);
    if (!dir) return -1;
    
    while ((entry = readdir(dir)) != NULL) {
        if (strcmp(entry->d_name, ".") == 0 || strcmp(entry->d_name, "..") == 0) {
            continue;
        }
        
        snprintf(full_path, sizeof(full_path), "%s/%s", path, entry->d_name);
        
        // Use lstat to not follow symlinks when checking if it's a directory
        if (lstat(full_path, &statbuf) == 0 && S_ISDIR(statbuf.st_mode)) {
            add_recursive_watches_with_depth(full_path, inotify_fd, config, current_depth + 1, visited);
        }
    }
    
    closedir(dir);
    return 0;
}

int add_recursive_watches(const char *path, int inotify_fd, monitor_config_t *config) {
    visited_dirs_t visited;
    init_visited_dirs(&visited);
    return add_recursive_watches_with_depth(path, inotify_fd, config, 0, &visited);
}

void monitor_files_linux(monitor_config_t *config) {
    int inotify_fd;
    char buffer[BUFFER_SIZE];
    struct inotify_event *event;
    char message[BUFFER_SIZE];
    time_t last_check_time = 0;
    
    inotify_fd = inotify_init();
    if (inotify_fd < 0) {
        perror("inotify_init");
        return;
    }
    
    // Add watches for all specified paths
    for (int i = 0; i < config->path_count; i++) {
        add_recursive_watches(config->watch_paths[i], inotify_fd, config);
    }
    
    printf("Monitoring %d paths on Linux...\n", config->path_count);
    
    while (running) {
        fd_set read_fds;
        struct timeval timeout;
        
        FD_ZERO(&read_fds);
        FD_SET(inotify_fd, &read_fds);
        timeout.tv_sec = 1;
        timeout.tv_usec = 0;
        
        int ready = select(inotify_fd + 1, &read_fds, NULL, NULL, &timeout);
        
        if (ready < 0) {
            if (errno == EINTR) continue;
            perror("select");
            break;
        }
        
        // Periodic checks even when no file events
        time_t current_time = time(NULL);
        if (current_time - last_check_time >= SCAN_INTERVAL) {
            // Check for new files matching watch rules
            check_for_new_files(config);
            
            // Remove old daily watches (for daily rotation)
            static time_t last_daily_check = 0;
            if (current_time - last_daily_check >= 3600) { // Check hourly
                for (int i = 0; i < config->path_count; i++) {
                    remove_old_daily_watches(config->watch_paths[i]);
                }
                last_daily_check = current_time;
            }
            
            last_check_time = current_time;
        }
        
        if (ready == 0) continue;
        
        ssize_t len = read(inotify_fd, buffer, sizeof(buffer));
        if (len < 0) {
            perror("read");
            continue;
        }
        
        for (char *ptr = buffer; ptr < buffer + len; ) {
            event = (struct inotify_event *)ptr;
            
            if (event->len > 0) {
                // Find the path for this watch descriptor
                char *watch_path = NULL;
                for (int i = 0; i < watch_count; i++) {
                    if (watch_descriptors[i].wd == event->wd) {
                        watch_path = watch_descriptors[i].path;
                        break;
                    }
                }
                
                if (watch_path && should_monitor_file(event->name, config)) {
                    const char *event_type = "UNKNOWN";
                    if (event->mask & IN_CREATE) event_type = "CREATED";
                    else if (event->mask & IN_DELETE) event_type = "DELETED";
                    else if (event->mask & IN_MODIFY) event_type = "MODIFIED";
                    else if (event->mask & IN_MOVED_FROM) event_type = "MOVED_FROM";
                    else if (event->mask & IN_MOVED_TO) event_type = "MOVED_TO";
                    
                    char full_file_path[PATH_MAX];
                    snprintf(full_file_path, sizeof(full_file_path), "%s/%s", watch_path, event->name);
                    
                    // Use the new process_file_event function
                    process_file_event(full_file_path, event_type);
                    
                    // Add watch for new directories
                    if ((event->mask & IN_CREATE) && (event->mask & IN_ISDIR) && config->recursive) {
                        char new_path[PATH_MAX];
                        snprintf(new_path, sizeof(new_path), "%s/%s", watch_path, event->name);
                        add_recursive_watches(new_path, inotify_fd, config);
                    }
                }
            }
            
            ptr += sizeof(struct inotify_event) + event->len;
        }
    }
    
    close(inotify_fd);
}
#endif

#ifdef __APPLE__
// Forward declaration for macOS file watching
int add_file_watch(const char *filepath, int kqueue_fd, monitor_config_t *config);
void scan_directory_for_files(const char *dir_path, int kqueue_fd, monitor_config_t *config);
void scan_directory_for_files_with_depth(const char *dir_path, int kqueue_fd, monitor_config_t *config, int current_depth, visited_dirs_t *visited);

// macOS kqueue implementation - only watch files, not directories
int add_recursive_watches(const char *path, int kqueue_fd, monitor_config_t *config) {
    struct stat statbuf;
    
    // Check if path exists and is accessible
    if (stat(path, &statbuf) < 0) {
        printf("Warning: Cannot stat path %s: %s\n", path, strerror(errno));
        return -1;
    }
    
    if (!S_ISDIR(statbuf.st_mode)) {
        printf("Warning: %s is not a directory\n", path);
        return -1;
    }
    
    printf("Scanning directory for files: %s\n", path);
    scan_directory_for_files(path, kqueue_fd, config);
    
    return 0;
}

// Scan directory and add watches for matching files with depth limit
void scan_directory_for_files_with_depth(const char *dir_path, int kqueue_fd, monitor_config_t *config, int current_depth, visited_dirs_t *visited) {
    DIR *dir;
    struct dirent *entry;
    struct stat statbuf;
    char full_path[PATH_MAX];
    
    // Check if we've already visited this directory (prevents infinite loops)
    if (is_directory_visited(visited, dir_path)) {
        printf("Skipping already visited directory: %s\n", dir_path);
        return;
    }
    
    // Add this directory to the visited list
    add_visited_directory(visited, dir_path);
    
    dir = opendir(dir_path);
    if (!dir) {
        printf("Warning: Cannot open directory %s: %s\n", dir_path, strerror(errno));
        return;
    }
    
    while ((entry = readdir(dir)) != NULL) {
        if (strcmp(entry->d_name, ".") == 0 || strcmp(entry->d_name, "..") == 0) {
            continue;
        }
        
        snprintf(full_path, sizeof(full_path), "%s/%s", dir_path, entry->d_name);
        
        // Use lstat to not follow symlinks when checking file type
        if (lstat(full_path, &statbuf) == 0) {
            if (S_ISREG(statbuf.st_mode)) {
                // Add watch for individual files that match our filters
                if (should_monitor_file(entry->d_name, config)) {
                    // Check if already being watched
                    int already_watched = 0;
                    for (int k = 0; k < watch_count; k++) {
                        if (strcmp(watch_descriptors[k].path, full_path) == 0) {
                            already_watched = 1;
                            break;
                        }
                    }
                    
                    if (!already_watched) {
                        add_file_watch(full_path, kqueue_fd, config);
                    }
                }
            } else if (S_ISDIR(statbuf.st_mode) && config->recursive && (config->max_depth == -1 || current_depth < config->max_depth)) {
                // Recursively scan subdirectories (but only if not a symlink to prevent loops)
                scan_directory_for_files_with_depth(full_path, kqueue_fd, config, current_depth + 1, visited);
            }
        }
    }
    
    closedir(dir);
}

// Scan directory and add watches for matching files
void scan_directory_for_files(const char *dir_path, int kqueue_fd, monitor_config_t *config) {
    visited_dirs_t visited;
    init_visited_dirs(&visited);
    scan_directory_for_files_with_depth(dir_path, kqueue_fd, config, 0, &visited);
}

// Add watch for individual file
int add_file_watch(const char *filepath, int kqueue_fd, monitor_config_t *config) {
    int fd = open(filepath, O_RDONLY);
    if (fd < 0) {
        printf("Warning: Cannot open file %s: %s\n", filepath, strerror(errno));
        return -1;
    }
    
    struct kevent ke;
    EV_SET(&ke, fd, EVFILT_VNODE, EV_ADD | EV_CLEAR, 
           NOTE_WRITE | NOTE_DELETE | NOTE_RENAME | NOTE_REVOKE, 0, NULL);
    
    if (kevent(kqueue_fd, &ke, 1, NULL, 0, NULL) < 0) {
        printf("Warning: kevent failed for file %s: %s\n", filepath, strerror(errno));
        close(fd);
        return -1;
    }
    
    if (watch_count < MAX_PATHS) {
        watch_descriptors[watch_count].fd = fd;
        watch_descriptors[watch_count].is_directory = 0;
        strncpy(watch_descriptors[watch_count].path, filepath, PATH_MAX - 1);
        watch_descriptors[watch_count].path[PATH_MAX - 1] = '\0';
        watch_count++;
        printf("Added file watch for: %s (fd: %d)\n", filepath, fd);
        return 0;
    } else {
        printf("Warning: Maximum watch limit reached, cannot watch file %s\n", filepath);
        close(fd);
        return -1;
    }
}

void monitor_files_macos(monitor_config_t *config) {
    int kqueue_fd;
    struct kevent events[10];
    char message[BUFFER_SIZE];
    time_t last_scan_time = 0;
    const int SCAN_INTERVAL = 5; // Rescan for new files every 5 seconds
    
    kqueue_fd = kqueue();
    if (kqueue_fd < 0) {
        perror("kqueue");
        return;
    }
    
    // Initial scan: Add watches for all existing files in specified paths
    for (int i = 0; i < config->path_count; i++) {
        printf("Initial scan of path: %s\n", config->watch_paths[i]);
        if (add_recursive_watches(config->watch_paths[i], kqueue_fd, config) < 0) {
            printf("Failed to scan path: %s\n", config->watch_paths[i]);
        }
    }
    
    printf("Monitoring %d file watches on macOS...\n", watch_count);
    last_scan_time = time(NULL);
    
    while (running) {
        struct timespec timeout = {1, 0}; // 1 second timeout
        
        int nevents = kevent(kqueue_fd, NULL, 0, events, 10, &timeout);
        
        if (nevents < 0) {
            if (errno == EINTR) continue;
            perror("kevent");
            break;
        }
        
        // Process file events
        for (int i = 0; i < nevents; i++) {
            // Find the file path for this file descriptor
            char *file_path = NULL;
            int watch_index = -1;
            
            for (int j = 0; j < watch_count; j++) {
                if (watch_descriptors[j].fd == (int)events[i].ident) {
                    file_path = watch_descriptors[j].path;
                    watch_index = j;
                    break;
                }
            }
            
            if (file_path) {
                const char *event_type = "UNKNOWN";
                if (events[i].fflags & NOTE_WRITE) event_type = "MODIFIED";
                else if (events[i].fflags & NOTE_DELETE) event_type = "DELETED";
                else if (events[i].fflags & NOTE_RENAME) event_type = "RENAMED";
                else if (events[i].fflags & NOTE_REVOKE) event_type = "REVOKED";
                
                printf("Detected %s event on file: %s\n", event_type, file_path);
                
                // Use the new process_file_event function
                process_file_event(file_path, event_type);
                
                // If file was deleted or renamed, remove it from our watch list
                if (events[i].fflags & (NOTE_DELETE | NOTE_RENAME)) {
                    close(watch_descriptors[watch_index].fd);
                    // Shift remaining watches down
                    for (int k = watch_index; k < watch_count - 1; k++) {
                        watch_descriptors[k] = watch_descriptors[k + 1];
                    }
                    watch_count--;
                    printf("Removed watch for file: %s\n", file_path);
                }
            }
        }
        
        // Periodically rescan directories for new files (simple polling approach)
        time_t current_time = time(NULL);
        printf("DEBUG: current_time=%ld, last_scan_time=%ld, diff=%ld, SCAN_INTERVAL=%d\n", 
               current_time, last_scan_time, current_time - last_scan_time, SCAN_INTERVAL);
        fflush(stdout);
        
        if (current_time - last_scan_time >= SCAN_INTERVAL) {
            printf("Rescanning directories for new files...\n");
            
            // Check if date has changed and update patterns
            if (g_date_filtering_enabled && has_date_changed()) {
                printf("Updating date patterns and rescanning all directories...\n");
                
                // Send WebSocket notification about date change
                char date_change_message[BUFFER_SIZE];
                snprintf(date_change_message, sizeof(date_change_message),
                    "{\"type\":\"DATE_CHANGED\",\"timestamp\":%ld,\"previousDate\":\"%s\",\"newDate\":\"%s\",\"datePattern\":\"%s\",\"reason\":\"midnight_transition\"}",
                    time(NULL), g_current_date, "", g_date_pattern);
                
                update_date_strings();
                
                // Update the message with the new current date
                snprintf(date_change_message, sizeof(date_change_message),
                    "{\"type\":\"DATE_CHANGED\",\"timestamp\":%ld,\"previousDate\":\"%s\",\"newDate\":\"%s\",\"datePattern\":\"%s\",\"reason\":\"midnight_transition\"}",
                    time(NULL), g_previous_date, g_current_date, g_date_pattern);
                
                printf("Sending date change notification: %s\n", date_change_message);
                send_websocket_message(date_change_message);
                
                // Remove all current file watches
                for (int i = 0; i < watch_count; i++) {
                    if (watch_descriptors[i].fd >= 0) {
                        close(watch_descriptors[i].fd);
                    }
                }
                watch_count = 0;
                
                // Re-scan all directories with new date patterns
                for (int i = 0; i < config->path_count; i++) {
                    scan_directory_for_files(config->watch_paths[i], kqueue_fd, config);
                }
            } else {
                // Normal scanning for new files
                for (int i = 0; i < config->path_count; i++) {
                    scan_directory_for_files(config->watch_paths[i], kqueue_fd, config);
                }
            }
            
            // Check for new files matching watch rules
            check_for_new_files(config);
            
            // Remove old daily watches (for daily rotation)
            static time_t last_daily_check = 0;
            if (current_time - last_daily_check >= 3600) { // Check hourly
                for (int i = 0; i < config->path_count; i++) {
                    remove_old_daily_watches(config->watch_paths[i]);
                }
                last_daily_check = current_time;
            }
            
            last_scan_time = current_time;
            printf("DEBUG: Updated last_scan_time to %ld\n", last_scan_time);
            fflush(stdout);
        }
    }
    
    // Clean up
    for (int i = 0; i < watch_count; i++) {
        close(watch_descriptors[i].fd);
    }
    close(kqueue_fd);
}
#endif

// Base64 encoding for WebSocket handshake
static const char base64_chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

void base64_encode(const unsigned char *input, int length, char *output) {
    int i, j;
    for (i = 0, j = 0; i < length; i += 3, j += 4) {
        unsigned int a = i < length ? input[i] : 0;
        unsigned int b = i + 1 < length ? input[i + 1] : 0;
        unsigned int c = i + 2 < length ? input[i + 2] : 0;

        unsigned int combined = (a << 16) | (b << 8) | c;

        output[j] = base64_chars[(combined >> 18) & 0x3F];
        output[j + 1] = base64_chars[(combined >> 12) & 0x3F];
        output[j + 2] = i + 1 < length ? base64_chars[(combined >> 6) & 0x3F] : '=';
        output[j + 3] = i + 2 < length ? base64_chars[combined & 0x3F] : '=';
    }
    output[j] = '\0';
}

// WebSocket server implementation
char *create_websocket_response(const char *key) {
    static char response[BUFFER_SIZE];
    char accept_key[256];
    
    // WebSocket magic string
    char combined[512];
    snprintf(combined, sizeof(combined), "%s258EAFA5-E914-47DA-95CA-C5AB0DC85B11", key);
    
#ifdef __APPLE__
    // Calculate SHA-1 hash using CommonCrypto
    unsigned char hash[CC_SHA1_DIGEST_LENGTH];
    CC_SHA1(combined, strlen(combined), hash);
    
    // Base64 encode the hash
    base64_encode(hash, CC_SHA1_DIGEST_LENGTH, accept_key);
#elif __linux__
    // Calculate SHA-1 hash using OpenSSL
    unsigned char hash[SHA_DIGEST_LENGTH];
    SHA1((unsigned char*)combined, strlen(combined), hash);
    
    // Base64 encode the hash
    base64_encode(hash, SHA_DIGEST_LENGTH, accept_key);
#else
    // Fallback for systems without crypto libraries
    snprintf(accept_key, sizeof(accept_key), "dGhlIHNhbXBsZSBub25jZQ==");
#endif
    
    snprintf(response, sizeof(response),
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Accept: %s\r\n"
        "\r\n", accept_key);
    
    return response;
}

void websocket_handshake(int client_fd, const char *request) {
    char *key_start = strstr(request, "Sec-WebSocket-Key: ");
    if (!key_start) return;
    
    key_start += strlen("Sec-WebSocket-Key: ");
    char *key_end = strstr(key_start, "\r\n");
    if (!key_end) return;
    
    char key[256];
    int key_len = key_end - key_start;
    strncpy(key, key_start, key_len);
    key[key_len] = '\0';
    
    char *response = create_websocket_response(key);
    send(client_fd, response, strlen(response), 0);
    
    // Set socket to non-blocking mode for better performance
    int flags = fcntl(client_fd, F_GETFL, 0);
    if (flags != -1) {
        fcntl(client_fd, F_SETFL, flags | O_NONBLOCK);
        printf("DEBUG: Set client fd=%d to non-blocking mode\n", client_fd);
    }
    
    pthread_mutex_lock(&ws_server.mutex);
    if (ws_server.client_count < MAX_CLIENTS) {
        ws_server.clients[ws_server.client_count].fd = client_fd;
        // Initialize subscription pattern to empty (receives all messages by default)
        ws_server.clients[ws_server.client_count].subscription_pattern[0] = '\0';
        ws_server.client_count++;
        printf("WebSocket client connected. Total clients: %d\n", ws_server.client_count);
    }
    pthread_mutex_unlock(&ws_server.mutex);
}

void handle_websocket_client(int client_fd) {
    printf("DEBUG: handle_websocket_client called with fd=%d\n", client_fd);
    fflush(stdout);
    char buffer[BUFFER_SIZE];
    ssize_t bytes_read = recv(client_fd, buffer, sizeof(buffer) - 1, 0);
    
    printf("DEBUG: recv returned %zd bytes\n", bytes_read);
    fflush(stdout);
    if (bytes_read > 0) {
        buffer[bytes_read] = '\0';
        printf("DEBUG: Received data: %.100s...\n", buffer);
        fflush(stdout);
        
        if (strstr(buffer, "GET") && strstr(buffer, "Upgrade: websocket")) {
            websocket_handshake(client_fd, buffer);
        } else {
            // Handle WebSocket frame after handshake
            if (bytes_read >= 2) {
                unsigned char *frame = (unsigned char *)buffer;
                
                // Check if this is a text frame (opcode 0x1)
                if ((frame[0] & 0x0F) == 0x01) {
                    int payload_len = frame[1] & 0x7F;
                    int mask_offset = 2;
                    
                    // Handle extended payload length
                    if (payload_len == 126) {
                        payload_len = (frame[2] << 8) | frame[3];
                        mask_offset = 4;
                    } else if (payload_len == 127) {
                        // For simplicity, we'll limit to smaller messages
                        return;
                    }
                    
                    // Check if message is masked (should be for client messages)
                    if (frame[1] & 0x80) {
                        unsigned char *mask = &frame[mask_offset];
                        unsigned char *payload = &frame[mask_offset + 4];
                        
                        // Unmask the payload
                        for (int i = 0; i < payload_len; i++) {
                            payload[i] ^= mask[i % 4];
                        }
                        
                        // Null terminate the message
                        payload[payload_len] = '\0';
                        
                        // Handle the subscription message
                        handle_websocket_message(client_fd, (char *)payload);
                    }
                }
            }
        }
    }
    // Don't close the connection here - it should remain open for subscription messages
    // The connection will be closed when the client disconnects or there's an error
}

void *websocket_server_thread(void *arg) {
    int server_fd, client_fd;
    struct sockaddr_in server_addr, client_addr;
    socklen_t client_len = sizeof(client_addr);
    
    server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("socket");
        return NULL;
    }
    
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(WEBSOCKET_PORT);
    
    if (bind(server_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0) {
        perror("bind");
        close(server_fd);
        return NULL;
    }
    
    if (listen(server_fd, 5) < 0) {
        perror("listen");
        close(server_fd);
        return NULL;
    }
    
    printf("WebSocket server listening on port %d\n", WEBSOCKET_PORT);
    
    while (running) {
        fd_set read_fds;
        struct timeval timeout;
        
        FD_ZERO(&read_fds);
        FD_SET(server_fd, &read_fds);
        int max_fd = server_fd;
        
        // Add all connected client sockets to the select set
        pthread_mutex_lock(&ws_server.mutex);
        for (int i = 0; i < ws_server.client_count; i++) {
            FD_SET(ws_server.clients[i].fd, &read_fds);
            if (ws_server.clients[i].fd > max_fd) {
                max_fd = ws_server.clients[i].fd;
            }
        }
        pthread_mutex_unlock(&ws_server.mutex);
        
        timeout.tv_sec = 1;
        timeout.tv_usec = 0;
        
        int ready = select(max_fd + 1, &read_fds, NULL, NULL, &timeout);
        
        // Check for shutdown signal
        if (!running) {
            printf("WebSocket server shutting down...\n");
            break;
        }
        
        if (ready > 0) {
            // Check for new connections
            if (FD_ISSET(server_fd, &read_fds)) {
                printf("DEBUG: Incoming connection attempt\n");
                fflush(stdout);
                client_fd = accept(server_fd, (struct sockaddr *)&client_addr, &client_len);
                if (client_fd >= 0) {
                    printf("DEBUG: Client accepted, fd=%d\n", client_fd);
                    fflush(stdout);
                    handle_websocket_client(client_fd);
                } else {
                    printf("DEBUG: Failed to accept client, errno=%d\n", errno);
                    fflush(stdout);
                }
            }
            
            // Check for messages from existing clients
            pthread_mutex_lock(&ws_server.mutex);
            
            // Process messages from clients (may need to restart loop if mutex is released)
            int restart_client_loop = 1;
            while (restart_client_loop) {
                restart_client_loop = 0;
                
                for (int i = 0; i < ws_server.client_count; i++) {
                    if (FD_ISSET(ws_server.clients[i].fd, &read_fds)) {
                        printf("DEBUG: Message from client fd=%d\n", ws_server.clients[i].fd);
                        fflush(stdout);
                        
                        char buffer[BUFFER_SIZE];
                        ssize_t bytes_read = recv(ws_server.clients[i].fd, buffer, sizeof(buffer) - 1, 0);
                        
                        if (bytes_read > 0) {
                            buffer[bytes_read] = '\0';
                            printf("DEBUG: Received %zd bytes from client\n", bytes_read);
                            fflush(stdout);
                            
                            // Handle WebSocket frame after handshake
                            if (bytes_read >= 2) {
                                unsigned char *frame = (unsigned char *)buffer;
                                
                                printf("DEBUG: Frame bytes: %02x %02x (first 2 bytes)\n", frame[0], frame[1]);
                                fflush(stdout);
                                
                                // Check if this is a text frame (opcode 0x1)
                                if ((frame[0] & 0x0F) == 0x01) {
                                    printf("DEBUG: Text frame detected\n");
                                    fflush(stdout);
                                    
                                    int payload_len = frame[1] & 0x7F;
                                    int mask_offset = 2;
                                    
                                    printf("DEBUG: Payload length: %d\n", payload_len);
                                    fflush(stdout);
                                    
                                    // Handle extended payload length
                                    if (payload_len == 126) {
                                        payload_len = (frame[2] << 8) | frame[3];
                                        mask_offset = 4;
                                    } else if (payload_len == 127) {
                                        // For simplicity, we'll limit to smaller messages
                                        printf("DEBUG: Large payload (>65535), skipping\n");
                                        fflush(stdout);
                                        continue;
                                    }
                                    
                                    // Check if message is masked (should be for client messages)
                                    if (frame[1] & 0x80) {
                                        printf("DEBUG: Message is masked\n");
                                        fflush(stdout);
                                        
                                        unsigned char *mask = &frame[mask_offset];
                                        unsigned char *payload = &frame[mask_offset + 4];
                                        
                                        // Unmask the payload
                                        for (int j = 0; j < payload_len; j++) {
                                            payload[j] ^= mask[j % 4];
                                        }
                                        
                                        // Null terminate the message
                                        payload[payload_len] = '\0';
                                        
                                        printf("DEBUG: Decoded message: %s\n", (char *)payload);
                                        fflush(stdout);
                                        
                                        // Store message details for processing outside mutex
                                        int client_fd_copy = ws_server.clients[i].fd;
                                        char message_copy[BUFFER_SIZE];
                                        strncpy(message_copy, (char *)payload, sizeof(message_copy) - 1);
                                        message_copy[sizeof(message_copy) - 1] = '\0';
                                        
                                        // Release mutex before handling subscription message to avoid deadlock
                                        pthread_mutex_unlock(&ws_server.mutex);
                                        
                                        // Handle the subscription message outside the lock
                                        handle_websocket_message(client_fd_copy, message_copy);
                                        
                                        // Re-acquire mutex and restart client processing
                                        pthread_mutex_lock(&ws_server.mutex);
                                        restart_client_loop = 1;
                                        break;
                                    } else {
                                        printf("DEBUG: Message is not masked (unexpected for client message)\n");
                                        fflush(stdout);
                                    }
                                } else {
                                    printf("DEBUG: Not a text frame, opcode: 0x%02x\n", frame[0] & 0x0F);
                                    fflush(stdout);
                                }
                            } else {
                                printf("DEBUG: Message too short (%zd bytes)\n", bytes_read);
                                fflush(stdout);
                            }
                    } else if (bytes_read == 0) {
                        // Client disconnected
                        printf("DEBUG: Client fd=%d disconnected\n", ws_server.clients[i].fd);
                        fflush(stdout);
                        close(ws_server.clients[i].fd);
                        
                        // Remove client from array
                        for (int j = i; j < ws_server.client_count - 1; j++) {
                            ws_server.clients[j] = ws_server.clients[j + 1];
                        }
                        ws_server.client_count--;
                        i--; // Adjust index since we removed an element
                        printf("DEBUG: Client removed. Total clients: %d\n", ws_server.client_count);
                        fflush(stdout);
                    } else {
                        // Error reading from client or would block
                        if (errno == EAGAIN || errno == EWOULDBLOCK) {
                            // Non-blocking socket would block, this is normal
                            printf("DEBUG: Client fd=%d would block, continuing\n", ws_server.clients[i].fd);
                        } else {
                            printf("DEBUG: Error reading from client fd=%d (errno=%d), removing\n", ws_server.clients[i].fd, errno);
                            fflush(stdout);
                            close(ws_server.clients[i].fd);
                            
                            // Remove client from array
                            for (int j = i; j < ws_server.client_count - 1; j++) {
                                ws_server.clients[j] = ws_server.clients[j + 1];
                            }
                            ws_server.client_count--;
                            i--; // Adjust index since we removed an element
                        }
                    }
                }
            } // End of for loop
            } // End of while loop
            
            pthread_mutex_unlock(&ws_server.mutex);
        }
    }
    
    close(server_fd);
    return NULL;
}

// Print usage information
void print_usage(const char *program_name) {
    printf("Usage: %s [OPTIONS] [PATH1] [PATH2] ...\n", program_name);
    printf("\nOptions:\n");
    printf("  --filter PATTERN     Only monitor files containing PATTERN in filename\n");
    printf("  --date-filter        Only monitor files containing current or previous date\n");
    printf("  --date-pattern FORMAT Date format pattern (default: %%Y-%%m-%%d for yyyy-mm-dd)\n");
    printf("  --no-recursive        Disable recursive directory monitoring\n");
    printf("  --max-depth DEPTH     Limit recursive scanning to DEPTH levels (0=current dir only)\n");
    printf("  --watch-pattern PATTERN PATH  Add dynamic watch rule for pattern in path\n");
    printf("  --watch-lines         Enable line-level change detection\n");
    printf("  --watch-daily         Enable daily archive file rotation (ARC-YYYY-MM-DD.txt)\n");
#ifdef FCGI_SUPPORT
    printf("  --fcgi               Run as FastCGI application\n");
    printf("  --both               Run both WebSocket and FastCGI servers\n");
#endif
    printf("  --help               Show this help message\n");
    printf("\nFeatures:\n");
    printf("  - Sync Detection: Automatically detects when files are deleted and recreated\n");
    printf("    (common in sync operations) and generates diff information\n");
    printf("  - Content Tracking: Monitors file content changes and provides diffs\n");
    printf("  - Line Change Detection: Detects when new lines are added to files\n");
    printf("  - Dynamic Watch Rules: Auto-watch new files matching patterns\n");
    printf("  - Daily File Rotation: Auto-manage daily archive files\n");
    printf("  - WebSocket API: Real-time file change notifications via WebSocket\n");
#ifdef FCGI_SUPPORT
    printf("  - FastCGI API: HTTP-based file access and status via FastCGI\n");
#endif
    printf("\nEvent Types:\n");
    printf("  CREATED, DELETED, MODIFIED - Standard file system events\n");
    printf("  SYNC_MODIFIED - File recreated with different content (sync detected)\n");
    printf("  SYNC_UNCHANGED - File recreated with same content (sync detected)\n");
    printf("  LINE_ADDED - New line(s) added to file (with line count info)\n");
    printf("  WATCH_ADDED - New file watch automatically added\n");
    printf("  WATCH_REMOVED - File watch removed (e.g., daily rotation)\n");
    printf("  DATE_CHANGED - Server date changed (midnight transition for date filtering)\n");
    printf("\nWebSocket Message Format:\n");
    printf("  {\"type\":\"EVENT_TYPE\",\"path\":\"/file/path\",\"timestamp\":1234567890,\n");
    printf("   \"lastLine\":\"last line of file\",\"diff\":\"unified diff\",\n");
    printf("   \"lineChange\":true,\"lineCount\":123}\n");
    printf("\nExamples:\n");
    printf("  %s /var/log                           # Monitor /var/log recursively\n", program_name);
    printf("  %s --filter .log /var/log             # Monitor only .log files in /var/log\n", program_name);
    printf("  %s --date-filter /data                # Monitor files with today's and yesterday's date\n", program_name);
    printf("  %s --date-filter --date-pattern \"%%Y%%m%%d\" /data  # Use YYYYMMDD date format\n", program_name);
    printf("  %s --filter last.txt --date-filter /data  # Monitor 'last.txt' OR files with date (OR logic)\n", program_name);
    printf("  %s --max-depth 2 /home/user           # Monitor /home/user up to 2 levels deep\n", program_name);
    printf("  %s --watch-pattern \"last.txt\" /data   # Auto-watch last.txt files in /data\n", program_name);
    printf("  %s --watch-pattern \"ARC-*.txt\" /archive --watch-daily  # Daily archive rotation\n", program_name);
    printf("  %s --watch-lines --watch-pattern \"*.log\" /logs  # Line-level log monitoring\n", program_name);
    printf("\nClient Integration for Date Transitions:\n");
    printf("  WebSocket clients can detect date changes by listening for DATE_CHANGED events.\n");
    printf("  When received, clients should update their subscriptions to new date files.\n");
    printf("  Example: Subscribe to 'ARC-2025-08-28.txt', receive DATE_CHANGED, then subscribe to 'ARC-2025-08-29.txt'\n");
    printf("\nWebSocket server will be available on port %d\n", WEBSOCKET_PORT);
#ifdef FCGI_SUPPORT
    printf("FastCGI API endpoints:\n");
    printf("  /api/files?action=list        - List all monitored files\n");
    printf("  /api/files?action=content&file=PATH - Get file content\n");
    printf("  /api/files?action=status&file=PATH  - Get file status\n");
    printf("  /api/status                   - Get server status\n");
    printf("\nLighttpd FastCGI Configuration:\n");
    printf("  Add to lighttpd.conf:\n");
    printf("    fastcgi.server = (\n");
    printf("      \"/api/\" => ((\n");
    printf("        \"socket\" => \"/tmp/socketserver-fcgi.sock\",\n");
    printf("        \"bin-path\" => \"/path/to/socketserver_r\",\n");
    printf("        \"bin-environment\" => ( \"FCGI_SOCKET_PATH\" => \"/tmp/socketserver-fcgi.sock\" ),\n");
    printf("        \"max-procs\" => 1,\n");
    printf("        \"check-local\" => \"disable\"\n");
    printf("      ))\n");
    printf("    )\n");
    printf("\nWebSocket Proxy Configuration:\n");
    printf("  For WebSocket support, add to lighttpd.conf:\n");
    printf("    proxy.server = (\n");
    printf("      \"/ws\" => ((\n");
    printf("        \"host\" => \"127.0.0.1\",\n");
    printf("        \"port\" => %d\n", WEBSOCKET_PORT);
    printf("      ))\n");
    printf("    )\n");
#endif
    printf("Sync detection window: %d seconds\n", SYNC_DETECTION_WINDOW);
    printf("\nCompilation:\n");
    printf("  macOS:  gcc -o socketserver_recursive socketserver_recursive.c -lpthread\n");
    printf("  Linux:  gcc -o socketserver_recursive socketserver_recursive.c -lpthread -lssl -lcrypto\n");
#ifdef FCGI_SUPPORT
    printf("  With FastCGI support:\n");
    printf("    macOS:  gcc -DFCGI_SUPPORT -o socketserver_recursive socketserver_recursive.c -lpthread -lfcgi\n");
    printf("    Linux:  gcc -DFCGI_SUPPORT -o socketserver_recursive socketserver_recursive.c -lpthread -lssl -lcrypto -lfcgi\n");
#endif
}

// Main function
int main(int argc, char *argv[]) {
    monitor_config_t config = {0};
    pthread_t websocket_thread;
    
    // Parse command line arguments
    config.recursive = 1; // Default to recursive
    config.max_depth = -1; // Default to unlimited depth (-1 means no limit)
    config.filters = malloc(MAX_FILTERS * sizeof(char*));
    config.watch_paths = malloc(MAX_PATHS * sizeof(char*));
    
    int watch_lines = 0;
    int watch_daily = 0;
    
    // Default path is current directory
    if (argc < 2) {
        config.watch_paths[0] = strdup(".");
        config.path_count = 1;
    } else {
        for (int i = 1; i < argc && config.path_count < MAX_PATHS; i++) {
            if (strcmp(argv[i], "--filter") == 0 && i + 1 < argc) {
                config.filters[config.filter_count++] = strdup(argv[++i]);
            } else if (strcmp(argv[i], "--date-filter") == 0) {
                g_date_filtering_enabled = 1;
            } else if (strcmp(argv[i], "--date-pattern") == 0 && i + 1 < argc) {
                strncpy(g_date_pattern, argv[++i], sizeof(g_date_pattern) - 1);
                g_date_pattern[sizeof(g_date_pattern) - 1] = '\0';
            } else if (strcmp(argv[i], "--no-recursive") == 0) {
                config.recursive = 0;
            } else if (strcmp(argv[i], "--max-depth") == 0 && i + 1 < argc) {
                config.max_depth = atoi(argv[++i]);
                if (config.max_depth < 0) {
                    printf("Warning: Invalid max-depth value, using unlimited depth\n");
                    config.max_depth = -1;
                }
            } else if (strcmp(argv[i], "--watch-pattern") == 0 && i + 2 < argc) {
                char *pattern = argv[++i];
                char *path = argv[++i];
                add_watch_rule(pattern, path);
            } else if (strcmp(argv[i], "--watch-lines") == 0) {
                watch_lines = 1;
            } else if (strcmp(argv[i], "--watch-daily") == 0) {
                watch_daily = 1;
                // Add default daily archive pattern
                add_watch_rule("ARC-*.txt", ".");
#ifdef FCGI_SUPPORT
            } else if (strcmp(argv[i], "--fcgi") == 0) {
                g_operation_mode = MODE_FCGI;
            } else if (strcmp(argv[i], "--both") == 0) {
                g_operation_mode = MODE_BOTH;
#endif
            } else if (strcmp(argv[i], "--help") == 0 || strcmp(argv[i], "-h") == 0) {
                print_usage(argv[0]);
                return 0;
            } else {
                config.watch_paths[config.path_count++] = strdup(argv[i]);
            }
        }
    }
    
    // Set base path for relative path conversion (use first watch path)
    if (config.path_count > 0) {
        set_base_path(config.watch_paths[0]);
    }
    
    // Initialize mutexes
    pthread_mutex_init(&ws_server.mutex, NULL);
    pthread_mutex_init(&file_cache.mutex, NULL);
    pthread_mutex_init(&watch_rules.mutex, NULL);
    
    // Initialize date filtering if enabled
    if (g_date_filtering_enabled) {
        update_date_strings();
    }
    
    // Set up signal handlers
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    signal(SIGALRM, alarm_handler);
    
    // Start servers based on operation mode
    printf("Operation mode: ");
    switch (g_operation_mode) {
        case MODE_WEBSOCKET:
            printf("WebSocket only\n");
            break;
        case MODE_FCGI:
            printf("FastCGI only\n");
            break;
        case MODE_BOTH:
            printf("WebSocket + FastCGI\n");
            break;
    }
    
    if (g_operation_mode == MODE_WEBSOCKET || g_operation_mode == MODE_BOTH) {
        // Start WebSocket server
        if (pthread_create(&websocket_thread, NULL, websocket_server_thread, NULL) != 0) {
            perror("pthread_create for WebSocket");
            return 1;
        }
    }
    
#ifdef FCGI_SUPPORT
    if (g_operation_mode == MODE_FCGI || g_operation_mode == MODE_BOTH) {
        // Start FastCGI server
        if (pthread_create(&g_fcgi_thread, NULL, fcgi_server_thread, &config) != 0) {
            perror("pthread_create for FastCGI");
            return 1;
        }
    }
#endif
    
    // Start file monitoring
    printf("Configuration:\n");
    printf("  Recursive: %s\n", config.recursive ? "yes" : "no");
    if (config.recursive) {
        if (config.max_depth == -1) {
            printf("  Max depth: unlimited\n");
        } else {
            printf("  Max depth: %d\n", config.max_depth);
        }
    }
    printf("  Paths: %d\n", config.path_count);
    printf("  Filters: %d\n", config.filter_count);
    printf("\n");
    
#ifdef __linux__
    monitor_files_linux(&config);
#elif __APPLE__
    monitor_files_macos(&config);
#else
    printf("Unsupported platform\n");
    return 1;
#endif
    
    // Clean up
    if (g_operation_mode == MODE_WEBSOCKET || g_operation_mode == MODE_BOTH) {
        printf("Waiting for WebSocket server thread to finish...\n");
        pthread_join(websocket_thread, NULL);
    }
    
#ifdef FCGI_SUPPORT
    if (g_operation_mode == MODE_FCGI || g_operation_mode == MODE_BOTH) {
        printf("Stopping FastCGI server...\n");
        g_fcgi_running = 0;
        pthread_join(g_fcgi_thread, NULL);
    }
#endif
    
    // Close any remaining client connections
    pthread_mutex_lock(&ws_server.mutex);
    for (int i = 0; i < ws_server.client_count; i++) {
        close(ws_server.clients[i].fd);
    }
    pthread_mutex_unlock(&ws_server.mutex);
    
    pthread_mutex_destroy(&ws_server.mutex);
    pthread_mutex_destroy(&file_cache.mutex);
    pthread_mutex_destroy(&watch_rules.mutex);
    
    // Free file cache content
    for (int i = 0; i < file_cache.file_count; i++) {
        if (file_cache.files[i].last_content) {
            free(file_cache.files[i].last_content);
        }
        if (file_cache.files[i].last_line) {
            free(file_cache.files[i].last_line);
        }
    }
    
    // Cleanup watch rules
    cleanup_watch_rules();
    
    // Free allocated memory
    for (int i = 0; i < config.filter_count; i++) {
        free(config.filters[i]);
    }
    for (int i = 0; i < config.path_count; i++) {
        free(config.watch_paths[i]);
    }
    free(config.filters);
    free(config.watch_paths);
    
    printf("File monitor shutdown complete.\n");
    return 0;
}