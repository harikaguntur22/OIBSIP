"""
Beginner Tier: Command-Line Multi-User / Two-User Chat Client
Built using Python raw sockets and threading.

Features:
- Connects to localhost:5000.
- Prompts for username.
- Spawns a background thread to receive messages continuously.
- Main thread sends user input to the server.
- Handles graceful quit with /quit command.
"""

import socket
import threading
import sys

HOST = '127.0.0.1'
PORT = 5001


running = True

def receive_messages(sock):
    """Background thread function to listen for messages from the server."""
    global running
    while running:
        try:
            message = sock.recv(1024).decode('utf-8')
            if not message:
                print("\n[System] Server closed connection.")
                running = False
                break
            
            # Print incoming message
            print(f"\r{message}\n> ", end='', flush=True)
        except (ConnectionResetError, OSError):
            if running:
                print("\n[System] Connection to server lost.")
            running = False
            break

def main():
    global running
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    
    try:
        client_socket.connect((HOST, PORT))
    except ConnectionRefusedError:
        print(f"[Error] Could not connect to server at {HOST}:{PORT}. Is beginner_server.py running?")
        sys.exit(1)
        
    print("=== Connected to Beginner Chat Server ===")
    
    # Receive initial handshake prompt
    try:
        initial = client_socket.recv(1024).decode('utf-8')
        if "ENTER_USERNAME" in initial:
            username = input("Enter your username: ").strip()
            while not username:
                username = input("Username cannot be empty. Enter username: ").strip()
            client_socket.sendall(username.encode('utf-8'))
        else:
            print(initial)
    except Exception as e:
        print(f"[Error] Handshake failed: {e}")
        client_socket.close()
        sys.exit(1)
        
    # Start receiver thread
    receiver_thread = threading.Thread(target=receive_messages, args=(client_socket,), daemon=True)
    receiver_thread.start()
    
    try:
        while running:
            try:
                user_input = input("> ").strip()
            except (EOFError, KeyboardInterrupt):
                user_input = "/quit"
                
            if not running:
                break
                
            if not user_input:
                continue
                
            client_socket.sendall(user_input.encode('utf-8'))
            
            if user_input == "/quit":
                print("[System] Disconnecting...")
                running = False
                break
    finally:
        running = False
        try:
            client_socket.close()
        except Exception:
            pass
        print("Disconnected.")

if __name__ == '__main__':
    main()
