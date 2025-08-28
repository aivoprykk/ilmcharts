CC=gcc
CFLAGS=-Wall -Wextra -std=c99
#LIBS=-lwebsockets -lcurl -lssl -lcrypto -lpthread
LIBS=-lpthread

socketserver_r: socketserver_recursive.c
	$(CC) $(CFLAGS) -o $@ $< $(LIBS)

clean:
	rm -f socketserver_r