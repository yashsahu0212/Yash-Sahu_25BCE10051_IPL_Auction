import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_SERVER_URL = 'http://172.25.241.119:3000';
let currentServerUrl = DEFAULT_SERVER_URL;
let currentToken = null;

export const ApiService = {
  async init() {
    try {
      const savedUrl = await AsyncStorage.getItem('hammer_server_url');
      if (savedUrl) currentServerUrl = savedUrl;
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
    let clean = url ? url.trim() : DEFAULT_SERVER_URL;
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

  async request(path, options = {}) {
    const url = `${currentServerUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    const res = await fetch(url, config);
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
    return this.request('/api/auction/activity');
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
