# Real-Time Python Chat Application

A complete real-time messaging application implemented in Python featuring both a **Beginner Tier** (raw Sockets & Threading CLI) and an **Advanced Tier** (Flask-SocketIO, SQLite, Modern Responsive Glassmorphic Web UI, Emoji Support, and Desktop Notifications).

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.8+ installed
- Dependencies specified in `requirements.txt` (`Flask`, `Flask-SocketIO`, `python-socketio`, `Werkzeug`)

To install dependencies:
```bash
pip install -r requirements.txt
```

---

## 🟢 1. Beginner Tier (Command-Line Interface)

The Beginner Tier demonstrates core socket networking using Python's built-in `socket` and `threading` modules.

### How to Run:
1. **Start the Server**:
   Open a terminal and run:
   ```bash
   python beginner_server.py
   ```
   *The server listens on `127.0.0.1:5001`.*


2. **Connect Client 1**:
   Open a second terminal window and run:
   ```bash
   python beginner_client.py
   ```
   *Enter a username when prompted (e.g., `Alice`).*

3. **Connect Client 2**:
   Open a third terminal window and run:
   ```bash
   python beginner_client.py
   ```
   *Enter a username when prompted (e.g., `Bob`).*

4. **Features**:
   - Real-time bidirectional message exchange.
   - Timestamps `[HH:MM]` prefixed to all messages (e.g., `[14:35] Alice: Hello`).
   - Graceful disconnect handling (`/quit` command or closing terminal notifies connected peers).

---

## ⚡ 2. Advanced Tier (Full-Featured Web GUI Application)

The Advanced Tier builds a modern Web Chat Application with user authentication, SQLite database persistence, room channels, message history, shortcode emoji rendering, and background notifications.

### How to Run:
1. **Start the Web Application Server**:
   ```bash
   python app.py
   ```
2. **Access in Browser**:
   Open your browser and navigate to `http://127.0.0.1:5000`
3. **Register & Sign In**:
   - Create an account on the registration tab.
   - Sign in with your username and password.
4. **Features**:
   - **Authentication**: User signup and login stored securely in SQLite (`chat.db`).
   - **Multiple Rooms**: Switch between default rooms (`General`, `Tech`, `Random`) or create custom room channels.
   - **Message History**: Past messages for any room are loaded automatically from SQLite when joining.
   - **Emoji Support**: Renders shortcodes like `:smile:` -> 😊, `:fire:` -> 🔥, `:heart:` -> ❤️, `:rocket:` -> 🚀, `:thumbsup:` -> 👍 automatically, plus an interactive popover picker.
   - **Desktop Notifications**: Background notifications, tab title alerts, and audio chimes when messages arrive while unfocused.
   - **Online User Badges**: Real-time room participant tracking.

---

## 📋 Feature Checklist

| Feature | Tier | Status |
| :--- | :--- | :---: |
| Server script listening for socket connections (`beginner_server.py`) | Beginner | ✅ |
| Client script connecting to server (`beginner_client.py`) | Beginner | ✅ |
| Real-time bidirectional message exchange | Beginner | ✅ |
| Messages displayed with timestamp prefix (`[14:35] Alice: Hello`) | Beginner | ✅ |
| Graceful disconnection handling & notification | Beginner | ✅ |
| Localhost execution (`127.0.0.1`) | Beginner | ✅ |
| Modern Web GUI Interface (Flask + Glassmorphism UI) | Advanced | ✅ |
| User registration & login (stored in SQLite) | Advanced | ✅ |
| Multiple chat rooms (create and join named rooms) | Advanced | ✅ |
| Message history persistence & retrieval upon joining | Advanced | ✅ |
| In-app / Desktop Notifications for unfocused window | Advanced | ✅ |
| Emoji shortcode parsing & interactive emoji picker | Advanced | ✅ |
| End-to-end security transparency documentation | Advanced | ✅ |

---

## 🔒 Security Transparency & End-to-End Awareness

This section documents how data is stored, transmitted, and protected in this application, highlighting security boundaries and encryption details.

### 1. User Password Storage
- Passwords are **never stored in plain text**.
- Passwords are hashed using `werkzeug.security.generate_password_hash` which employs **PBKDF2 with SHA-256** and unique per-user random salts.
- The resulting hashes are stored in the `users` table inside `chat.db`.

### 2. Message Data Storage
- Chat messages are saved to the `messages` table in the local SQLite database (`chat.db`).
- **What is NOT Encrypted at Rest**: Messages stored in `chat.db` are kept in **plaintext** on the server's local file system to allow room history retrieval. They are not encrypted with zero-knowledge keys or encrypted-at-rest keys out of the box.

### 3. Data Transmission (Network Transport)
- In the local development environment (`http://127.0.0.1:5000`), communication occurs over unencrypted HTTP and standard WebSockets (`ws://`).
- **What is NOT End-to-End Encrypted (E2EE)**: Messages sent between clients pass through the server unencrypted. The server inspects, logs, and stores message contents. This is **not** an End-to-End Encrypted (E2EE) protocol like Signal or WhatsApp.
- **Production Recommendation**: For production deployment, the application should run behind a TLS reverse proxy (e.g. Nginx or Caddy with Let's Encrypt) to enforce `HTTPS` and Secure WebSockets (`wss://`), protecting data in transit across public networks.
