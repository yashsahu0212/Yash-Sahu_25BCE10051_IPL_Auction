/**
 * HAMMER — Supabase Client Configuration
 * Manages Supabase URL, Publishable Anon Key, and Client Instance.
 */
(function(window) {
  'use strict';

  // Read configuration from environment, window, or localStorage
  const savedUrl = localStorage.getItem('hammer_supabase_url');
  const savedKey = localStorage.getItem('hammer_supabase_anon_key');

  const SUPABASE_CONFIG = {
    // Default placeholders — can be updated in code, via localStorage, or the UI settings modal
    url: savedUrl || window.__HAMMER_SUPABASE_URL__ || 'https://your-project-id.supabase.co',
    anonKey: savedKey || window.__HAMMER_SUPABASE_ANON_KEY__ || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',

    isConfigured() {
      return this.url &&
             this.url.startsWith('https://') &&
             !this.url.includes('your-project-id') &&
             this.anonKey &&
             !this.anonKey.includes('dummy');
    },

    setCredentials(url, anonKey) {
      this.url = url.trim();
      this.anonKey = anonKey.trim();
      localStorage.setItem('hammer_supabase_url', this.url);
      localStorage.setItem('hammer_supabase_anon_key', this.anonKey);
      initClient();
    }
  };

  let client = null;

  function initClient() {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          },
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        });
      } catch (e) {
        console.warn('Supabase client init warning:', e.message);
      }
    }
    return client;
  }

  // Attempt initial client creation
  initClient();

  window.SUPABASE_CONFIG = SUPABASE_CONFIG;
  window.getSupabaseClient = function() {
    if (!client) client = initClient();
    return client;
  };

})(window);
