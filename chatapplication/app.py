"""
Advanced Tier: Real-Time Web Chat Application Backend
Built with Flask, Flask-SocketIO, and SQLite.
"""

from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, join_room, leave_room, emit
import datetime
import database

app = Flask(__name__)
app.config['SECRET_KEY'] = 'super-secret-chat-key-antigravity-2026'

# Initialize Flask-SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent' if 'gevent' in globals() else 'threading')

# In-memory tracking of active room members: { room_name: { socket_id: username } }
room_members = {}

def get_current_timestamp():
    return datetime.datetime.now().strftime("%H:%M")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json() or {}
    username = data.get('username', '')
    password = data.get('password', '')
    
    success, message = database.register_user(username, password)
    if success:
        return jsonify({'success': True, 'message': message}), 200
    else:
        return jsonify({'success': False, 'message': message}), 400

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    username = data.get('username', '')
    password = data.get('password', '')
    
    if database.verify_user(username, password):
        session['username'] = username
        return jsonify({'success': True, 'username': username}), 200
    else:
        return jsonify({'success': False, 'message': 'Invalid username or password.'}), 401

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.pop('username', None)
    return jsonify({'success': True}), 200

@app.route('/api/user', methods=['GET'])
def api_user():
    if 'username' in session:
        return jsonify({'logged_in': True, 'username': session['username']})
    return jsonify({'logged_in': False})

@app.route('/api/rooms', methods=['GET', 'POST'])
def api_rooms():
    if request.method == 'GET':
        rooms = database.get_all_rooms()
        return jsonify({'success': True, 'rooms': rooms})
    elif request.method == 'POST':
        if 'username' not in session:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
            
        data = request.get_json() or {}
        room_name = data.get('name', '')
        success, message = database.create_room(room_name, session['username'])
        
        if success:
            # Broadcast room list update to all connected sockets
            socketio.emit('room_created', {'room': room_name, 'created_by': session['username']})
            return jsonify({'success': True, 'message': message, 'room': room_name}), 200
        else:
            return jsonify({'success': False, 'message': message}), 400

# SocketIO Events

@socketio.on('connect')
def handle_connect():
    pass

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    # Clean up user from active rooms
    for room, members in list(room_members.items()):
        if sid in members:
            username = members.pop(sid)
            leave_room(room)
            online_list = list(set(members.values()))
            emit('user_left', {
                'username': username,
                'room': room,
                'timestamp': get_current_timestamp(),
                'online_users': online_list
            }, to=room)

@socketio.on('join_room_event')
def handle_join_room(data):
    room = data.get('room', 'General')
    username = data.get('username') or session.get('username', 'Anonymous')
    sid = request.sid
    
    join_room(room)
    
    if room not in room_members:
        room_members[room] = {}
    room_members[room][sid] = username
    
    online_list = list(set(room_members[room].values()))
    
    # 1. Fetch message history from SQLite DB
    history = database.get_room_history(room, limit=100)
    
    # Send history directly back to joining client
    emit('room_history', {
        'room': room,
        'history': history
    }, room=sid)
    
    # Notify room members that user joined
    emit('user_joined', {
        'username': username,
        'room': room,
        'timestamp': get_current_timestamp(),
        'online_users': online_list
    }, to=room)

@socketio.on('leave_room_event')
def handle_leave_room(data):
    room = data.get('room')
    username = data.get('username') or session.get('username', 'Anonymous')
    sid = request.sid
    
    leave_room(room)
    
    if room in room_members and sid in room_members[room]:
        del room_members[room][sid]
        online_list = list(set(room_members[room].values()))
    else:
        online_list = []
        
    emit('user_left', {
        'username': username,
        'room': room,
        'timestamp': get_current_timestamp(),
        'online_users': online_list
    }, to=room)

@socketio.on('send_message')
def handle_send_message(data):
    room = data.get('room', 'General')
    username = data.get('username') or session.get('username', 'Anonymous')
    content = data.get('content', '').strip()
    
    if not content:
        return
        
    timestamp = get_current_timestamp()
    
    # Save message to SQLite database
    database.save_message(room, username, content, timestamp)
    
    # Broadcast message to room
    emit('receive_message', {
        'room': room,
        'username': username,
        'content': content,
        'timestamp': timestamp
    }, to=room)

if __name__ == '__main__':
    database.init_db()
    print("=== Advanced Tier Chat Application Server Starting ===")
    print("Serving on http://127.0.0.1:5000")
    socketio.run(app, host='127.0.0.1', port=5000, debug=True, allow_unsafe_werkzeug=True)

