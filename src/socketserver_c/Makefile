# Makefile for socketserver_recursive with optional FastCGI support
#
# Usage:
#   make                    # Build without FastCGI support
#   make fcgi              # Build with FastCGI support
#   make clean             # Clean build files

CC=gcc
CFLAGS=-Wall -Wextra -std=c99 -O2
#LIBS=-lwebsockets -lcurl -lssl -lcrypto -lpthread
LIBS=-lpthread

# Platform-specific settings
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
    LIBS += -lssl -lcrypto
endif

# Default target - build without FastCGI
socketserver_r: socketserver_recursive.c
	$(CC) $(CFLAGS) -o $@ $< $(LIBS)

# FastCGI-enabled target
fcgi: CFLAGS += -DFCGI_SUPPORT
fcgi: LIBS += -lfcgi
fcgi: socketserver_r_fcgi

socketserver_r_fcgi: socketserver_recursive.c
	$(CC) $(CFLAGS) -o socketserver_r $< $(LIBS)

# Installation target
install: socketserver_r
	cp socketserver_r /usr/local/bin/

# Help target
help:
	@echo "Available targets:"
	@echo "  socketserver_r        - Build without FastCGI support (default)"
	@echo "  fcgi                  - Build with FastCGI support"
	@echo "  install               - Install to /usr/local/bin"
	@echo "  clean                 - Remove build artifacts"
	@echo "  help                  - Show this help"
	@echo ""
	@echo "FastCGI Requirements:"
	@echo "  On Ubuntu/Debian: sudo apt-get install libfcgi-dev"
	@echo "  On CentOS/RHEL:   sudo yum install fcgi-devel"
	@echo "  On macOS:         brew install fcgi"

clean:
	rm -f socketserver_r

.PHONY: fcgi clean install help