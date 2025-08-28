class FileMonitorClient {
    constructor() {
        this.ws = null;
        this.files = new Map();
        this.currentFile = null;
        this.isConnected = false;
        
        this.initializeUI();
        this.bindEvents();
    }

    initializeUI() {
        // this.statusDot = document.getElementById('statusDot');
        // this.statusText = document.getElementById('statusText');
        // this.connectBtn = document.getElementById('connectBtn');
        this.serverUrl = 'ws://localhost:8080';
        // this.fileList = document.getElementById('fileList');
        // this.fileTitle = document.getElementById('fileTitle');
        // this.fileInfo = document.getElementById('fileInfo');
        // this.fileContent = document.getElementById('fileContent');
        // this.activityLog = document.getElementById('activityLog');
        // this.logContent = document.getElementById('logContent');
        // this.toggleLogBtn = document.getElementById('toggleLogBtn');
    }

    bindEvents() {
        this.connectBtn.addEventListener('click', () => {
            if (this.isConnected) {
                this.disconnect();
            } else {
                this.connect();
            }
        });

        this.toggleLogBtn.addEventListener('click', () => {
            this.activityLog.classList.toggle('visible');
        });

        this.serverUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isConnected) {
                this.connect();
            }
        });
    }

    connect() {
        const url = this.serverUrl.value.trim();
        if (!url) {
            this.logActivity('Please enter a valid WebSocket URL', 'error');
            return;
        }

        this.logActivity(`Connecting to ${url}...`);
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            this.isConnected = true;
            this.updateConnectionStatus(true);
            this.logActivity('Connected successfully!', 'success');
        };

        this.ws.onclose = () => {
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.logActivity('Connection closed', 'warning');
        };

        this.ws.onerror = (error) => {
            this.logActivity('Connection error occurred', 'error');
            console.error('WebSocket error:', error);
        };

        this.ws.onmessage = (event) => {
            this.handleFileChange(event.data);
        };
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    updateConnectionStatus(connected) {
        if (connected) {
            this.statusDot.classList.add('connected');
            this.statusText.textContent = 'Connected';
            this.connectBtn.textContent = 'Disconnect';
            this.connectBtn.classList.add('connected');
        } else {
            this.statusDot.classList.remove('connected');
            this.statusText.textContent = 'Disconnected';
            this.connectBtn.textContent = 'Connect';
            this.connectBtn.classList.remove('connected');
        }
    }

    handleFileChange(data) {
        try {
            const change = JSON.parse(data);
            const { type, path, timestamp, lastLine } = change;
            
            this.logActivity(`${type}: ${path.split('/').pop()}`, 'file-change');

            // Get or create file entry
            if (!this.files.has(path)) {
                this.files.set(path, {
                    path: path,
                    content: '',
                    lastModified: timestamp,
                    isLoaded: false,
                    element: null
                });
                this.addFileToList(path);
            }

            const file = this.files.get(path);
            file.lastModified = timestamp;

            // Handle different event types
            if (type === 'DELETED') {
                this.removeFile(path);
                return;
            }

            if (type === 'CREATED') {
                // Load the entire file content for new files
                this.loadFileContent(path);
            } else if (type === 'MODIFIED' && lastLine) {
                // For modifications, append the new last line
                if (file.isLoaded) {
                    this.appendLastLine(path, lastLine);
                } else {
                    // If file isn't loaded yet, load it completely
                    this.loadFileContent(path);
                }
            }

            // Update file item visual indicator
            this.markFileAsUpdated(path);

        } catch (error) {
            this.logActivity('Error parsing file change data', 'error');
            console.error('Parse error:', error);
        }
    }

    async loadFileContent(filePath) {
        const file = this.files.get(filePath);
        if (!file) return;

        try {
            this.logActivity(`Loading ${filePath.split('/').pop()}...`);
            
            // Use fetch to load file content (you may need to serve files via HTTP)
            // For demo, we'll simulate loading and just use the lastLine
            // In production, you'd need an HTTP endpoint to serve file contents
            
            // Simulated file loading - replace with actual XHR/fetch
            const response = await this.simulateFileLoad(filePath);
            file.content = response;
            file.isLoaded = true;

            // If this is the currently selected file, update the display
            if (this.currentFile === filePath) {
                this.displayFileContent(filePath);
            }

            this.logActivity(`Loaded ${filePath.split('/').pop()}`);

        } catch (error) {
            this.logActivity(`Failed to load ${filePath.split('/').pop()}`, 'error');
            console.error('File load error:', error);
        }
    }

    // Simulate file loading - replace with actual HTTP request
    async simulateFileLoad(filePath) {
        // In a real implementation, you would:
        // return fetch(`/api/files?path=${encodeURIComponent(filePath)}`).then(r => r.text());
        
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(`// Content of ${filePath}\n// This would be loaded via XHR from your server\n// Initial file content...\n`);
            }, 500);
        });
    }

    appendLastLine(filePath, lastLine) {
        const file = this.files.get(filePath);
        if (!file || !lastLine.trim()) return;

        // Add the new line to file content
        if (!file.content.endsWith('\n')) {
            file.content += '\n';
        }
        file.content += lastLine;

        // If this is the currently displayed file, update the view
        if (this.currentFile === filePath) {
            this.appendLineToDisplay(lastLine);
        }

        this.logActivity(`New line: ${lastLine.substring(0, 50)}${lastLine.length > 50 ? '...' : ''}`, 'new-line');
    }

    appendLineToDisplay(line) {
        if (!line.trim()) return;

        const contentDiv = this.fileContent;
        
        // Create a new line element with highlight
        const lineElement = document.createElement('div');
        lineElement.className = 'new-line-highlight';
        lineElement.textContent = line;

        contentDiv.appendChild(lineElement);
        
        // Auto-scroll to bottom
        contentDiv.scrollTop = contentDiv.scrollHeight;

        // Remove highlight after animation
        setTimeout(() => {
            lineElement.classList.remove('new-line-highlight');
        }, 2000);
    }

    addFileToList(filePath) {
        const fileName = filePath.split('/').pop();
        const fileDir = filePath.substring(0, filePath.lastIndexOf('/'));

        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.onclick = () => this.selectFile(filePath);

        fileItem.innerHTML = `
            <div class="file-path">${fileDir}</div>
            <div class="file-name">${fileName}</div>
            <div class="file-status">Ready</div>
        `;

        // Remove loading message if it exists
        const loadingMsg = this.fileList.querySelector('.loading');
        if (loadingMsg) {
            loadingMsg.remove();
        }

        this.fileList.appendChild(fileItem);
        this.files.get(filePath).element = fileItem;
    }

    selectFile(filePath) {
        // Update UI selection
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
        });

        const file = this.files.get(filePath);
        if (file && file.element) {
            file.element.classList.add('active');
            file.element.classList.remove('updated'); // Clear update indicator
        }

        this.currentFile = filePath;
        
        // Update file info
        const fileName = filePath.split('/').pop();
        this.fileTitle.textContent = fileName;
        this.fileInfo.textContent = `${filePath} • Last modified: ${new Date(file.lastModified * 1000).toLocaleString()}`;

        // Load and display file content
        if (!file.isLoaded) {
            this.loadFileContent(filePath);
            this.fileContent.innerHTML = '<div class="loading">Loading file content...</div>';
        } else {
            this.displayFileContent(filePath);
        }
    }

    displayFileContent(filePath) {
        const file = this.files.get(filePath);
        if (!file) return;

        this.fileContent.classList.remove('empty');
        this.fileContent.innerHTML = '';

        // Split content into lines and add each one
        const lines = file.content.split('\n');
        lines.forEach(line => {
            const lineDiv = document.createElement('div');
            lineDiv.textContent = line || ' '; // Preserve empty lines
            this.fileContent.appendChild(lineDiv);
        });

        // Auto-scroll to bottom
        this.fileContent.scrollTop = this.fileContent.scrollHeight;
    }

    markFileAsUpdated(filePath) {
        const file = this.files.get(filePath);
        if (file && file.element && this.currentFile !== filePath) {
            file.element.classList.add('updated');
            
            // Update status
            const statusEl = file.element.querySelector('.file-status');
            if (statusEl) {
                statusEl.textContent = 'Updated';
            }
        }
    }

    removeFile(filePath) {
        const file = this.files.get(filePath);
        if (file && file.element) {
            file.element.remove();
        }
        
        this.files.delete(filePath);
        
        if (this.currentFile === filePath) {
            this.currentFile = null;
            this.fileTitle.textContent = 'File deleted';
            this.fileContent.innerHTML = '<div class="error">This file has been deleted</div>';
        }

        this.logActivity(`File deleted: ${filePath.split('/').pop()}`);
    }

    logActivity(message, type = 'info') {
        const logItem = document.createElement('div');
        logItem.className = `activity-item ${type}`;
        logItem.innerHTML = `<strong>${new Date().toLocaleTimeString()}</strong>: ${message}`;
        
        this.logContent.appendChild(logItem);
        this.logContent.scrollTop = this.logContent.scrollHeight;

        // Keep only last 50 log entries
        while (this.logContent.children.length > 50) {
            this.logContent.removeChild(this.logContent.firstChild);
        }
    }
}