import { io } from 'socket.io-client';
import { ApiService } from './api';

let socket = null;
let listeners = new Map(); // event -> Set of callbacks
let isConnecting = false;
let pingTime = 0;

export const SocketService = {
  connect() {
    const url = ApiService.getServerUrl();
    const token = ApiService.getToken();

    if (socket && socket.connected) {
      if (token) {
        socket.emit('auth', { token });
      }
      return socket;
    }

    if (isConnecting) return socket;
    isConnecting = true;

    if (socket) {
      try {
        socket.disconnect();
      } catch (_) {}
    }

    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: { token },
      timeout: 10000
    });

    socket.on('connect', () => {
      isConnecting = false;
      this.emitInternal('connection:change', { connected: true, id: socket.id });

      const currentToken = ApiService.getToken();
      if (currentToken) {
        socket.emit('auth', { token: currentToken }, (ack) => {
          this.emitInternal('auth:ack', ack);
        });
      }
    });

    socket.on('disconnect', (reason) => {
      isConnecting = false;
      this.emitInternal('connection:change', { connected: false, reason });
    });

    socket.on('connect_error', (error) => {
      isConnecting = false;
      this.emitInternal('connection:error', error);
    });

    // Realtime Auction Events
    const events = [
      'auction:state',
      'auction:timer',
      'auction:bid',
      'auction:sold',
      'auction:unsold',
      'auction:started',
      'auction:paused',
      'auction:resumed',
      'auction:timer_settings',
      'teams:update',
      'auction:event',
      'activity_created',
      'error'
    ];

    events.forEach(eventName => {
      socket.on(eventName, (data) => {
        this.emitInternal(eventName, data);
      });
    });

    return socket;
  },

  disconnect() {
    if (socket) {
      try {
        socket.disconnect();
      } catch (_) {}
      socket = null;
      isConnecting = false;
    }
  },

  isConnected() {
    return !!(socket && socket.connected);
  },

  authenticate(token) {
    if (socket && socket.connected) {
      socket.emit('auth', { token }, (ack) => {
        this.emitInternal('auth:ack', ack);
      });
    }
  },

  placeBid(expectedBid) {
    return new Promise((resolve, reject) => {
      if (!socket || !socket.connected) {
        // Fallback to REST API if socket isn't connected
        return ApiService.placeBid(expectedBid).then(resolve).catch(reject);
      }

      socket.emit('bid:place', { expectedBid }, (result) => {
        if (!result) return resolve({ success: true });
        if (result.error) {
          return reject(new Error(result.error));
        }
        resolve(result);
      });
    });
  },

  on(eventName, callback) {
    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }
    listeners.get(eventName).add(callback);

    // Return cleanup unsubscribe function
    return () => {
      const set = listeners.get(eventName);
      if (set) {
        set.delete(callback);
        if (set.size === 0) listeners.delete(eventName);
      }
    };
  },

  emitInternal(eventName, data) {
    const set = listeners.get(eventName);
    if (set) {
      set.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.warn(`Error in listener for ${eventName}:`, e);
        }
      });
    }
  }
};
