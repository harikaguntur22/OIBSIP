"""
Database Layer for Advanced Tier Chat Application.
Uses Python built-in sqlite3 and Werkzeug for password hashing.
"""

import sqlite3
import os
import datetime
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), 'chat.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables and default rooms."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Rooms table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_by TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room TEXT NOT NULL,
            username TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    
    # Insert default rooms if rooms table is empty
    cursor.execute("SELECT COUNT(*) FROM rooms")
    count = cursor.fetchone()[0]
    if count == 0:
        default_rooms = [
            ("General", "System"),
            ("Tech", "System"),
            ("Random", "System")
        ]
        cursor.executemany("INSERT INTO rooms (name, created_by) VALUES (?, ?)", default_rooms)
        conn.commit()
        
    conn.close()

def register_user(username, password):
    """Register a new user with hashed password."""
    username = username.strip()
    if not username or not password:
        return False, "Username and password are required."
    
    if len(username) < 3:
        return False, "Username must be at least 3 characters long."
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    if cursor.fetchone():
        conn.close()
        return False, "Username already exists."
        
    pwd_hash = generate_password_hash(password)
    try:
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, pwd_hash))
        conn.commit()
        conn.close()
        return True, "Registration successful."
    except sqlite3.IntegrityError:
        conn.close()
        return False, "Username already exists."
    except Exception as e:
        conn.close()
        return False, f"Database error: {str(e)}"

def verify_user(username, password):
    """Verify username and password."""
    username = username.strip()
    if not username or not password:
        return False
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        return False
        
    return check_password_hash(user['password_hash'], password)

def create_room(room_name, created_by):
    """Create a new room in SQLite."""
    room_name = room_name.strip()
    if not room_name:
        return False, "Room name cannot be empty."
        
    # Standardize name (alphanumeric & spaces/dashes)
    if len(room_name) < 2 or len(room_name) > 30:
        return False, "Room name must be between 2 and 30 characters."
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM rooms WHERE LOWER(name) = LOWER(?)", (room_name,))
    if cursor.fetchone():
        conn.close()
        return False, "A room with this name already exists."
        
    try:
        cursor.execute("INSERT INTO rooms (name, created_by) VALUES (?, ?)", (room_name, created_by))
        conn.commit()
        conn.close()
        return True, f"Room '{room_name}' created successfully."
    except sqlite3.IntegrityError:
        conn.close()
        return False, "Room already exists."
    except Exception as e:
        conn.close()
        return False, f"Database error: {str(e)}"

def get_all_rooms():
    """Get list of all rooms."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name, created_by, created_at FROM rooms ORDER BY id ASC")
    rooms = cursor.fetchall()
    conn.close()
    return [{"name": r['name'], "created_by": r['created_by']} for r in rooms]

def save_message(room, username, content, timestamp):
    """Save a chat message to history."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (room, username, content, timestamp) VALUES (?, ?, ?, ?)",
        (room, username, content, timestamp)
    )
    conn.commit()
    conn.close()

def get_room_history(room, limit=100):
    """Retrieve message history for a specific room."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT username, content, timestamp FROM messages WHERE room = ? ORDER BY id ASC LIMIT ?",
        (room, limit)
    )
    messages = cursor.fetchall()
    conn.close()
    return [{"username": m['username'], "content": m['content'], "timestamp": m['timestamp']} for m in messages]
