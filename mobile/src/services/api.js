import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LAN_IP = '192.168.1.7';
const PORT = '3000';

function getInitialDefaultUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    if (window.location.port === PORT) return window.location.origin;
    return `http://${window.location.hostname || 'localhost'}:${PORT}`;
  }
  if (Platform.OS === 'android') {
    return `http://${LAN_IP}:${PORT}`;
  }
  return `http://${LAN_IP}:${PORT}`;
}

let currentServerUrl = getInitialDefaultUrl();
let currentToken = null;

export const ApiService = {
  async init() {
    try {
      const savedUrl = await AsyncStorage.getItem('hammer_server_url');
      if (savedUrl && savedUrl.trim()) {
        currentServerUrl = savedUrl.trim();
      } else {
        currentServerUrl = getInitialDefaultUrl();
      }
      const savedToken = await AsyncStorage.getItem('hammer_token');
      if (savedToken) currentToken = savedToken;
    } catch (e) {
      console.warn('Storage init error:', e);
    }
    return { serverUrl: currentServerUrl, token: currentToken };
  },

  getServerUrl() {
    return currentServerUrl;
  },

  async setServerUrl(url) {
    let clean = url ? url.trim() : getInitialDefaultUrl();
    if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    if (clean.endsWith('/')) clean = clean.slice(0, -1);
    currentServerUrl = clean;
    await AsyncStorage.setItem('hammer_server_url', clean);
    return clean;
  },

  getToken() {
    return currentToken;
  },

  async setToken(token) {
    currentToken = token;
    if (token) {
      await AsyncStorage.setItem('hammer_token', token);
    } else {
      await AsyncStorage.removeItem('hammer_token');
    }
  },

  // Fast auto-discovery for local dev / mobile networks
  async autoDiscoverServer() {
    const candidates = [
      currentServerUrl,
      `http://${LAN_IP}:${PORT}`,
      `http://localhost:${PORT}`,
      `http://127.0.0.1:${PORT}`,
      `http://10.0.2.2:${PORT}`
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    for (const testUrl of candidates) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${testUrl}/health`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        });
        clearTimeout(tid);
        if (res.ok) {
          await this.setServerUrl(testUrl);
          return testUrl;
        }
      } catch (_) {
        // try next candidate
      }
    }
    return currentServerUrl;
  },

  async request(path, options = {}) {
    const url = `${currentServerUrl}${path}`;
    const timeoutMs = options.timeoutMs || 8000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers,
      signal: controller.signal
    };

    try {
      const res = await fetch(url, config);
      clearTimeout(timeoutId);

      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }

      if (!res.ok) {
        const err = new Error(data?.error || `HTTP ${res.status}: ${res.statusText}`);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Connection to auction server timed out (${timeoutMs}ms). Check if server is running at ${currentServerUrl}`);
      }
      throw err;
    }
  },

  // Auth
  async login(username, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (data.token) {
      await this.setToken(data.token);
      await AsyncStorage.setItem('hammer_user', JSON.stringify(data.user));
    }
    return data;
  },

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    await this.setToken(null);
    await AsyncStorage.removeItem('hammer_user');
  },

  async getMe() {
    return this.request('/api/auth/me');
  },

  // Auction State & Data
  async getState() {
    return this.request('/api/auction/state');
  },

  async getPlayers() {
    const res = await this.request('/api/players?limit=100');
    return Array.isArray(res) ? res : (res?.players || []);
  },

  async getTeams() {
    return this.request('/api/teams');
  },

  async getHistory() {
    return this.request('/api/auction/history');
  },

  async getActivity() {
    const res = await this.request('/api/auction/activity');
    if (Array.isArray(res)) return res;
    return res?.events || [];
  },

  async getCaptains() {
    return this.request('/api/auction/captains');
  },

  async getNetworkInfo() {
    return this.request('/api/network-info');
  },

  // Actions
  async placeBid(expectedBid) {
    return this.request('/api/auction/bid', {
      method: 'POST',
      body: JSON.stringify({ expectedBid })
    });
  },

  async startAuction(playerId) {
    return this.request('/api/auction/start', {
      method: 'POST',
      body: JSON.stringify({ playerId })
    });
  },

  async gavel(stage) {
    return this.request('/api/auction/gavel', {
      method: 'POST',
      body: JSON.stringify({ stage })
    });
  },

  async sold() {
    return this.request('/api/auction/sold', { method: 'POST' });
  },

  async unsold() {
    return this.request('/api/auction/unsold', { method: 'POST' });
  },

  async pause() {
    return this.request('/api/auction/pause', { method: 'POST' });
  },

  async resume() {
    return this.request('/api/auction/resume', { method: 'POST' });
  },

  async addTimer(seconds = 10) {
    return this.request('/api/auction/timer/add', {
      method: 'POST',
      body: JSON.stringify({ seconds })
    });
  },

  async resetTimer() {
    return this.request('/api/auction/timer/reset', { method: 'POST' });
  },

  async setTimerSettings(settings) {
    return this.request('/api/auction/timer/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  },

  async retainCaptains() {
    return this.request('/api/auction/captain-retention', { method: 'POST' });
  },

  async resetAuction() {
    return this.request('/api/auction/reset', { method: 'POST' });
  }
};
