import { io } from 'socket.io-client';

// Determine the correct socket URL
// If VITE_SOCKET_URL is defined and absolute, use it.
// If it's relative ('/') or undefined, use the window origin (protocol + host + port).
const envUrl = import.meta.env.VITE_SOCKET_URL;
let SOCKET_URL = envUrl;

if ((!envUrl || envUrl === '/') && typeof window !== 'undefined') {
  SOCKET_URL = window.location.origin;
}

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) {
      return;
    }

    const token = localStorage.getItem('token');

    try {
      // If SOCKET_URL is undefined, it connects to window.location.host
      // If it's a full URL, it connects there.
      this.socket = io(SOCKET_URL, {
        auth: {
          token: token
        },
        // Remove specific transport forcing to allow polling -> upgrade (more robust)
      });
    } catch (err) {
      console.error('Socket initialization failed:', err);
      return;
    }

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.socket) {
      this.connect();
    }

    this.socket.on(event, callback);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }

    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  sendCommand(command) {
    this.emit('command', command);
  }
}

export default new SocketService();