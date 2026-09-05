"""
Beginner Tier: Command-Line Multi-User / Two-User Chat Server
Built using Python raw sockets and threading.

Features:
- Listens for incoming TCP client connections on localhost:5000.
- Handles bidirectional communication concurrently using threads.
- Formats messages with timestamp prefix e.g., [14:35] Alice: Hello
- Handles graceful disconnections and notifies active clients.
"""

import socket
import threading
import datetime
import sys

HOST = '127.0.0.1'
PORT = 5001


clients = {}  # socket -> username
clients_lock = threading.Lock()

def format_timestamp():
    return datetime.datetime.now().strftime("%H:%M")

def broadcast(message, sender_socket=None):
    """Broadcast a message to all connected clients except sender (or all if sender is None)."""
    with clients_lock:
        to_remove = []
        for client_socket in clients:
            if client_socket != sender_socket:
                try:
                    client_socket.sendall(message.encode('utf-8'))
                except Exception:
                    to_remove.append(client_socket)
        
        for dead_socket in to_remove:
            username = clients.pop(dead_socket, "Unknown")
            try:
                dead_socket.close()
            except Exception:
                pass
            print(f"[{format_timestamp()}] System: Cleaned up disconnected client '{username}'.")

def handle_client(client_socket, client_address):
    """Handle communication with a connected client."""
    timestamp = format_timestamp()
    print(f"[{timestamp}] System: New connection from {client_address[0]}:{client_address[1]}")
    
    username = "Anonymous"
    try:
        # First message expected is the username
        client_socket.sendall("ENTER_USERNAME".encode('utf-8'))
        raw_username = client_socket.recv(1024).decode('utf-8').strip()
        if raw_username:
            username = raw_username
        
        with clients_lock:
            clients[client_socket] = username
        
        welcome_msg = f"[{format_timestamp()}] System: Welcome {username}! Type your message or '/quit' to leave.\n"
        client_socket.sendall(welcome_msg.encode('utf-8'))
        
        join_msg = f"[{format_timestamp()}] System: {username} has joined the chat."
        print(join_msg)
        broadcast(join_msg, sender_socket=client_socket)
        
        while True:
            data = client_socket.recv(1024)
            if not data:
                break
            
            message_text = data.decode('utf-8').strip()
            if not message_text:
                continue
                
            if message_text == "/quit":
                break
                
            formatted_msg = f"[{format_timestamp()}] {username}: {message_text}"
            print(formatted_msg)
            # Echo to sender and broadcast to others
            broadcast(formatted_msg, sender_socket=None)

    except (ConnectionResetError, BrokenPipeError, OSError):
        pass
    finally:
        with clients_lock:
            removed_user = clients.pop(client_socket, username)
        
        try:
            client_socket.close()
        except Exception:
            pass
            
        leave_msg = f"[{format_timestamp()}] System: {removed_user} has disconnected."
        print(leave_msg)
        broadcast(leave_msg, sender_socket=None)

def main():
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    # Allow address reuse
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        server_socket.bind((HOST, PORT))
        server_socket.listen(5)
        print(f"=== Beginner Chat Server Running on {HOST}:{PORT} ===")
        print("Press Ctrl+C to stop the server.\n")
        
        while True:
            client_socket, client_address = server_socket.accept()
            client_thread = threading.Thread(
                target=handle_client,
                args=(client_socket, client_address),
                daemon=True
            )
            client_thread.start()
            
    except KeyboardInterrupt:
        print("\nShutting down server...")
    finally:
        with clients_lock:
            for s in clients:
                try:
                    s.close()
                except Exception:
                    pass
            clients.clear()
        server_socket.close()
        print("Server stopped.")

if __name__ == '__main__':
    main()
