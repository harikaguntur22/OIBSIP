/**
 * PulseChat Client Application Logic
 * Integrates WebSockets (Socket.IO), Authentication, Multi-Room Switching,
 * Message History, Emoji Shortcodes, and Desktop/Audio Notifications.
 */

// Application State
let currentUser = null;
let activeRoom = 'General';
let socket = null;
let notificationsEnabled = false;
let isTabFocused = true;
let unreadCount = 0;

// Emoji Shortcodes Dictionary
const EMOJI_MAP = {
    ':smile:': '😊',
    ':laughing:': '😆',
    ':wink:': '😉',
    ':cool:': '😎',
    ':heart:': '❤️',
    ':thumbsup:': '👍',
    ':fire:': '🔥',
    ':rocket:': '🚀',
    ':party:': '🎉',
    ':star:': '⭐',
    ':skull:': '💀',
    ':eyes:': '👀',
    ':sparkles:': '✨',
    ':check:': '✅',
    ':cat:': '🐱',
    ':coffee:': '☕',
    ':100:': '💯',
    ':thinking:': '🤔',
    ':pray:': '🙏',
    ':clap:': '👏',
    ':muscle:': '💪',
    ':sun:': '☀️',
    ':wave:': '👋',
    ':ghost:': '👻'
};

// Document Lifecycle Initialization
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    renderEmojiGrid();
    setupWindowFocusListeners();
});

// Window Focus / Blur Listeners for Desktop & Title Notifications
function setupWindowFocusListeners() {
    window.addEventListener('focus', () => {
        isTabFocused = true;
        unreadCount = 0;
        document.title = 'PulseChat - Real-Time Messaging App';
    });

    window.addEventListener('blur', () => {
        isTabFocused = false;
    });
}

// Web Audio API Sound Synthesizer (Notification Chime)
function playNotifySound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
        console.warn('Audio playback error:', e);
    }
}

// Request Browser Desktop Notification Permissions
function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert('Desktop notifications are not supported in this browser.');
        return;
    }

    Notification.requestPermission().then(permission => {
        const bellIcon = document.getElementById('bell-icon');
        if (permission === 'granted') {
            notificationsEnabled = true;
            if (bellIcon) {
                bellIcon.className = 'fa-solid fa-bell text-success';
            }
            showToast('Desktop notifications enabled!');
        } else {
            notificationsEnabled = false;
            if (bellIcon) {
                bellIcon.className = 'fa-regular fa-bell-slash';
            }
        }
    });
}

// Fire Desktop Notification
function triggerDesktopNotification(author, messageText) {
    if (!isTabFocused) {
        unreadCount++;
        document.title = `(${unreadCount}) PulseChat - New Message!`;
        playNotifySound();

        if (notificationsEnabled && Notification.permission === 'granted') {
            const shortText = messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText;
            new Notification(`New message from ${author} in #${activeRoom}`, {
                body: shortText,
                icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png'
            });
        }
    }
}

// Emoji Parser
function parseEmojiShortcodes(text) {
    if (!text) return '';
    let parsed = text;
    for (const [code, emoji] of Object.entries(EMOJI_MAP)) {
        // Replace all occurrences of shortcode
        parsed = parsed.split(code).join(emoji);
    }
    return parsed;
}

// Render Emoji Picker Grid
function renderEmojiGrid() {
    const grid = document.getElementById('emoji-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    for (const [code, emoji] of Object.entries(EMOJI_MAP)) {
        const item = document.createElement('div');
        item.className = 'emoji-item';
        item.textContent = emoji;
        item.title = code;
        item.onclick = () => insertEmoji(code);
        grid.appendChild(item);
    }
}

function toggleEmojiPicker(forceState) {
    const picker = document.getElementById('emoji-picker');
    if (!picker) return;
    if (typeof forceState === 'boolean') {
        picker.classList.toggle('hidden', !forceState);
    } else {
        picker.classList.toggle('hidden');
    }
}

function insertEmoji(shortcode) {
    const input = document.getElementById('message-input');
    if (!input) return;
    const current = input.value;
    input.value = current ? `${current} ${shortcode} ` : `${shortcode} `;
    input.focus();
    toggleEmojiPicker(false);
}

// Toast Helper
function showToast(msg) {
    console.log('[Toast]', msg);
}

// Auth API Calls & State
function switchAuthTab(tab) {
    const loginTab = document.getElementById('tab-login');
    const regTab = document.getElementById('tab-register');
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-register');
    const alertBox = document.getElementById('auth-alert');

    alertBox.classList.add('hidden');

    if (tab === 'login') {
        loginTab.classList.add('active');
        regTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
    } else {
        regTab.classList.add('active');
        loginTab.classList.remove('active');
        regForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

function showAuthAlert(msg, type = 'error') {
    const alertBox = document.getElementById('auth-alert');
    alertBox.textContent = msg;
    alertBox.className = `alert-box ${type}`;
    alertBox.classList.remove('hidden');
}

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/user');
        const data = await res.json();
        if (data.logged_in) {
            currentUser = data.username;
            initChatApp();
        } else {
            showAuthScreen();
        }
    } catch (e) {
        showAuthScreen();
    }
}

function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('chat-screen').classList.add('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username').value.trim();
    const passwordInput = document.getElementById('login-password').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });
        const data = await res.json();
        if (data.success) {
            currentUser = data.username;
            initChatApp();
        } else {
            showAuthAlert(data.message || 'Login failed.');
        }
    } catch (err) {
        showAuthAlert('Network error. Please try again.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('reg-username').value.trim();
    const passwordInput = document.getElementById('reg-password').value;
    const confirmInput = document.getElementById('reg-password-confirm').value;

    if (passwordInput !== confirmInput) {
        showAuthAlert('Passwords do not match.');
        return;
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });
        const data = await res.json();
        if (data.success) {
            showAuthAlert('Account created successfully! Please sign in.', 'success');
            setTimeout(() => switchAuthTab('login'), 1200);
        } else {
            showAuthAlert(data.message || 'Registration failed.');
        }
    } catch (err) {
        showAuthAlert('Network error. Please try again.');
    }
}

async function handleLogout() {
    if (socket) {
        socket.disconnect();
    }
    await fetch('/api/logout', { method: 'POST' });
    currentUser = null;
    showAuthScreen();
}

// Chat Application Initialization
function initChatApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('chat-screen').classList.remove('hidden');

    // Display user profile info
    document.getElementById('current-user-display').textContent = currentUser;
    document.getElementById('current-user-avatar').textContent = currentUser.charAt(0).toUpperCase();

    // Check Notification status
    if (Notification.permission === 'granted') {
        notificationsEnabled = true;
        const bellIcon = document.getElementById('bell-icon');
        if (bellIcon) bellIcon.className = 'fa-solid fa-bell text-success';
    }

    // Initialize Socket.IO connection
    initSocketIO();

    // Load available rooms list
    fetchRoomsList();
}

// Socket.IO Setup
function initSocketIO() {
    if (socket) {
        socket.disconnect();
    }

    socket = io();

    socket.on('connect', () => {
        const badge = document.getElementById('conn-badge');
        if (badge) badge.innerHTML = '<i class="fa-solid fa-circle text-success"></i> Connected';
        // Join initial active room
        joinRoom(activeRoom);
    });

    socket.on('disconnect', () => {
        const badge = document.getElementById('conn-badge');
        if (badge) badge.innerHTML = '<i class="fa-solid fa-circle text-muted"></i> Disconnected';
    });

    // Received Room Message History from SQLite
    socket.on('room_history', (data) => {
        if (data.room === activeRoom) {
            renderMessageHistory(data.history);
        }
    });

    // Receive New Message
    socket.on('receive_message', (data) => {
        if (data.room === activeRoom) {
            appendMessage(data.username, data.content, data.timestamp, data.username === currentUser);
            if (data.username !== currentUser) {
                triggerDesktopNotification(data.username, data.content);
            }
        }
    });

    // User Joined System Event
    socket.on('user_joined', (data) => {
        if (data.room === activeRoom) {
            appendSystemMessage(`${data.username} joined the room`, data.timestamp);
            updateOnlineUsersList(data.online_users);
        }
    });

    // User Left System Event
    socket.on('user_left', (data) => {
        if (data.room === activeRoom) {
            appendSystemMessage(`${data.username} left the room`, data.timestamp);
            updateOnlineUsersList(data.online_users);
        }
    });

    // New Room Created Notification
    socket.on('room_created', () => {
        fetchRoomsList();
    });
}

// Room Navigation
async function fetchRoomsList() {
    try {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        if (data.success) {
            renderRoomsList(data.rooms);
        }
    } catch (e) {
        console.error('Error fetching rooms:', e);
    }
}

function renderRoomsList(rooms) {
    const list = document.getElementById('rooms-list');
    if (!list) return;
    list.innerHTML = '';

    rooms.forEach(r => {
        const li = document.createElement('li');
        li.className = `room-item ${r.name === activeRoom ? 'active' : ''}`;
        li.onclick = () => selectRoom(r.name);
        li.innerHTML = `
            <i class="fa-solid fa-hashtag"></i>
            <span>${escapeHTML(r.name)}</span>
        `;
        list.appendChild(li);
    });
}

function selectRoom(roomName) {
    if (roomName === activeRoom) return;

    // Leave current room socket channel
    if (socket) {
        socket.emit('leave_room_event', { room: activeRoom, username: currentUser });
    }

    activeRoom = roomName;

    // Update UI Header
    document.getElementById('active-room-title').textContent = activeRoom;
    document.getElementById('active-room-subtitle').textContent = `Room channel for #${activeRoom}`;

    // Update active highlight in sidebar
    const items = document.querySelectorAll('.room-item');
    items.forEach(el => {
        const text = el.querySelector('span')?.textContent;
        if (text === activeRoom) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    // Clear feed & Join new room channel
    clearMessagesFeed();
    joinRoom(activeRoom);
}

function joinRoom(roomName) {
    if (socket && socket.connected) {
        socket.emit('join_room_event', { room: roomName, username: currentUser });
    }
}

// Render Messages & History
function clearMessagesFeed() {
    const feed = document.getElementById('messages-list');
    if (feed) feed.innerHTML = '';
}

function renderMessageHistory(history) {
    clearMessagesFeed();
    if (!history || history.length === 0) {
        appendSystemMessage(`Welcome to #${activeRoom}! No past messages.`, '');
        return;
    }

    history.forEach(msg => {
        appendMessage(msg.username, msg.content, msg.timestamp, msg.username === currentUser);
    });
}

function appendMessage(author, contentText, timestamp, isOwn) {
    const feed = document.getElementById('messages-list');
    if (!feed) return;

    // Convert emoji shortcodes
    const parsedText = parseEmojiShortcodes(escapeHTML(contentText));

    const row = document.createElement('div');
    row.className = `msg-row ${isOwn ? 'own' : 'peer'}`;

    const avatarChar = author ? author.charAt(0).toUpperCase() : '?';

    row.innerHTML = `
        <div class="msg-avatar">${avatarChar}</div>
        <div class="msg-bubble">
            <div class="msg-header">
                <span class="msg-author">${escapeHTML(author)}</span>
                <span class="msg-timestamp">[${escapeHTML(timestamp)}]</span>
            </div>
            <div class="msg-content">${parsedText}</div>
        </div>
    `;

    feed.appendChild(row);
    scrollToBottom();
}

function appendSystemMessage(text, timestamp) {
    const feed = document.getElementById('messages-list');
    if (!feed) return;

    const sys = document.createElement('div');
    sys.className = 'msg-system';
    sys.innerHTML = `
        <i class="fa-solid fa-circle-info"></i>
        <span>${escapeHTML(text)} ${timestamp ? '[' + escapeHTML(timestamp) + ']' : ''}</span>
    `;

    feed.appendChild(sys);
    scrollToBottom();
}

function updateOnlineUsersList(users) {
    const countEl = document.getElementById('online-count');
    const listEl = document.getElementById('online-users-list');

    if (countEl) countEl.textContent = users ? users.length : 0;
    if (!listEl) return;

    listEl.innerHTML = '';
    if (!users) return;

    users.forEach(u => {
        const item = document.createElement('li');
        item.className = 'online-user-item';
        item.innerHTML = `
            <div class="user-indicator"></div>
            <span>${escapeHTML(u)}</span>
        `;
        listEl.appendChild(item);
    });
}

function scrollToBottom() {
    const container = document.getElementById('messages-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// Send Message Handler
function handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('message-input');
    if (!input) return;

    const content = input.value.trim();
    if (!content || !socket) return;

    socket.emit('send_message', {
        room: activeRoom,
        username: currentUser,
        content: content
    });

    input.value = '';
    toggleEmojiPicker(false);
}

// Create Room Modal Operations
function openCreateRoomModal() {
    document.getElementById('create-room-modal').classList.remove('hidden');
    document.getElementById('new-room-name').value = '';
    document.getElementById('room-modal-alert').classList.add('hidden');
}

function closeCreateRoomModal() {
    document.getElementById('create-room-modal').classList.add('hidden');
}

async function handleCreateRoom(e) {
    e.preventDefault();
    const roomInput = document.getElementById('new-room-name').value.trim();
    const alertBox = document.getElementById('room-modal-alert');

    try {
        const res = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: roomInput })
        });
        const data = await res.json();
        if (data.success) {
            closeCreateRoomModal();
            fetchRoomsList();
            selectRoom(data.room);
        } else {
            alertBox.textContent = data.message || 'Failed to create room.';
            alertBox.className = 'alert-box error';
            alertBox.classList.remove('hidden');
        }
    } catch (err) {
        alertBox.textContent = 'Network error.';
        alertBox.className = 'alert-box error';
        alertBox.classList.remove('hidden');
    }
}

// HTML Escaping Utility
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
