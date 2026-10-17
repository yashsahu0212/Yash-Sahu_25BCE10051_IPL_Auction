/**
 * HAMMER — Editorial Audio-Visual & UX Engine
 * Authentic Web Audio sound synthesis, chess-style countdown warning,
 * authoritative state transition tracking, duplicate sound prevention,
 * and 3D collectible card interactions.
 */
(function(window) {
  'use strict';

  // ─── 1. AUDIO SETTINGS MANAGEMENT ──────────────────────────
  const AudioSettings = {
    get master() {
      const v = localStorage.getItem('hammer_audio_master');
      return v === null ? true : v === 'true';
    },
    set master(val) {
      localStorage.setItem('hammer_audio_master', Boolean(val));
    },

    get hammer() {
      const v = localStorage.getItem('hammer_audio_hammer');
      return v === null ? true : v === 'true';
    },
    set hammer(val) {
      localStorage.setItem('hammer_audio_hammer', Boolean(val));
    },

    get countdown() {
      const v = localStorage.getItem('hammer_audio_countdown');
      return v === null ? true : v === 'true';
    },
    set countdown(val) {
      localStorage.setItem('hammer_audio_countdown', Boolean(val));
    },

    getAll() {
      return {
        master: this.master,
        hammer: this.hammer,
        countdown: this.countdown
      };
    },

    set(key, val) {
      if (key in this) {
        this[key] = val;
      }
    }
  };

  // ─── 2. WEB AUDIO SYNTHESIZER (ZERO ASSET DEPENDENCY) ─────
  let audioCtx = null;
  let audioUnlocked = false;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended' && audioUnlocked) {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function unlockAudio() {
    if (audioUnlocked) return;
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          audioUnlocked = true;
        }).catch(() => {});
      } else {
        audioUnlocked = true;
      }
    }
  }

  // Bind unlock to common user gestures (click, tap, keypress)
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, unlockAudio, { once: false, passive: true });
  });

  // ─── HAMMER STRIKE SOUND (WHEN SOLD) ──────────────────────
  // Realistic physical wooden auction gavel impact
  function playGavelStrike() {
    if (!AudioSettings.master || !AudioSettings.hammer) return;
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state === 'suspended') return;
      const now = ctx.currentTime;

      // 1. Primary impact transient (wood block thud)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(36, now + 0.14);

      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      // Wooden resonance filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);

      // 2. High-frequency wood strike snap (micro-crack noise)
      const bufferSize = Math.floor(ctx.sampleRate * 0.04);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.012));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1400, now);
      noiseFilter.Q.setValueAtTime(2.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.45, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
    } catch (e) {
      // Gracefully silence blocked audio
    }
  }

  // ─── CHESS.COM-STYLE LAST-SECONDS TIMER SOUND ─────────────
  // Distinct, subtle countdown warning tick (5, 4, 3, 2, 1)
  function playCountdownBeep(secondsRemaining) {
    if (!AudioSettings.master || !AudioSettings.countdown) return;
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state === 'suspended') return;
      const now = ctx.currentTime;

      // Escalating frequency as seconds run out
      const freqMap = {
        5: 580,
        4: 640,
        3: 720,
        2: 820,
        1: 960
      };
      const freq = freqMap[secondsRemaining] || 700;

      // Crisp percussive tension pip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.75, now + 0.045);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  }

  // Tactile bid button click sound
  function playBidClick() {
    if (!AudioSettings.master) return;
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state === 'suspended') return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.04);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  }

  // Clock tick tension
  function playClockTick() {
    if (!AudioSettings.master) return;
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state === 'suspended') return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.02);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  // ─── 3. STATE TRACKER & DUPLICATE AUDIO PREVENTION ─────────
  let _lastAnnouncedSecond = null;
  let _lastSoldEventKey = null;

  function handleTimerTick(timer, status) {
    const s = Number(timer);
    if (status !== 'live' || isNaN(s) || s > 5 || s <= 0) {
      _lastAnnouncedSecond = null;
      return;
    }

    // Only trigger once per specific remaining second (5, 4, 3, 2, 1)
    if (s <= 5 && s >= 1 && _lastAnnouncedSecond !== s) {
      _lastAnnouncedSecond = s;
      playCountdownBeep(s);
    }
  }

  function handleAuctionSold(data) {
    _lastAnnouncedSecond = null; // Stop any ongoing countdown

    // Generate unique key for this sold event to prevent duplicates
    const eventKey = `${data?.player?.id || 'lot'}-${data?.team?.id || data?.team?.shortName || 'tm'}-${data?.price || 0}`;
    if (_lastSoldEventKey !== eventKey) {
      _lastSoldEventKey = eventKey;
      playGavelStrike();
    }
  }

  function handleAuctionUnsold(data) {
    _lastAnnouncedSecond = null;
    // Unsold does NOT play hammer strike
  }

  function handleAuctionBid(data) {
    // Valid bid resets timer — cancel countdown trigger ref
    _lastAnnouncedSecond = null;
    playBidClick();
  }

  function handleAuctionPause() {
    _lastAnnouncedSecond = null;
  }

  function handleAuctionReset() {
    _lastAnnouncedSecond = null;
    _lastSoldEventKey = null;
  }

  // ─── 4. MOBILE TAP FLIP CARD INTERACTION ───────────────────
  function initMobileTouchFlip() {
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.flip-card');
      if (!card) return;

      // Only on touch devices or explicit pointerType touch
      if (window.matchMedia('(hover: none)').matches || e.pointerType === 'touch') {
        card.classList.toggle('is-flipped');
      }
    });
  }

  // ─── 5. ANIMATED NUMBER TICKER ────────────────────────────
  function animateCurrencyNumber(el, targetLakhs, prefix = '', suffix = '') {
    if (!el) return;
    const formatted = window.Hammer && typeof window.Hammer.formatCurrency === 'function'
      ? window.Hammer.formatCurrency(targetLakhs)
      : (Number(targetLakhs) >= 100 ? `₹${(Number(targetLakhs) / 100).toFixed(2)} CR` : `₹${Number(targetLakhs)} L`);

    el.classList.remove('animate-number-roll');
    void el.offsetWidth;
    el.classList.add('animate-number-roll');
    el.textContent = `${prefix}${formatted}${suffix}`;
  }

  // Clean up any cursor remnants in DOM
  function cleanupCustomCursor() {
    const dot = document.querySelector('.hammer-cursor-dot');
    if (dot) dot.remove();
    const ring = document.querySelector('.hammer-cursor-ring');
    if (ring) ring.remove();
  }

  // ─── 6. MOBILE NAVIGATION CONTROLLER ──────────────────────
  function initMobileNavigation() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const closeBtn = document.getElementById('mobile-nav-close');
    const drawer = document.getElementById('mobile-nav-drawer');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    const menuIcon = document.getElementById('mobile-menu-icon');

    if (!drawer) return;

    function openMenu() {
      drawer.classList.remove('translate-x-full', 'pointer-events-none');
      drawer.classList.add('translate-x-0', 'pointer-events-auto');
      drawer.setAttribute('aria-hidden', 'false');

      if (backdrop) {
        backdrop.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
        backdrop.classList.add('opacity-100', 'pointer-events-auto');
        backdrop.setAttribute('aria-hidden', 'false');
      }

      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'true');
      }
      if (menuIcon) {
        menuIcon.textContent = 'close';
      }
      document.body.classList.add('overflow-hidden');
    }

    function closeMenu() {
      drawer.classList.add('translate-x-full', 'pointer-events-none');
      drawer.classList.remove('translate-x-0', 'pointer-events-auto');
      drawer.setAttribute('aria-hidden', 'true');

      if (backdrop) {
        backdrop.classList.remove('opacity-100', 'pointer-events-auto');
        backdrop.classList.add('opacity-0', 'pointer-events-none');
        backdrop.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
          if (backdrop.classList.contains('opacity-0')) {
            backdrop.classList.add('hidden');
          }
        }, 280);
      }

      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
      if (menuIcon) {
        menuIcon.textContent = 'menu';
      }
      document.body.classList.remove('overflow-hidden');
    }

    function toggleMenu() {
      const isOpen = drawer.classList.contains('translate-x-0');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    if (toggleBtn && !toggleBtn._hammerBound) {
      toggleBtn._hammerBound = true;
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
      });
    }

    if (closeBtn && !closeBtn._hammerBound) {
      closeBtn._hammerBound = true;
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
      });
    }

    if (backdrop && !backdrop._hammerBound) {
      backdrop._hammerBound = true;
      backdrop.addEventListener('click', (e) => {
        e.preventDefault();
        closeMenu();
      });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('translate-x-0')) {
        closeMenu();
      }
    });

    // Close drawer when tapping any link inside
    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    // Automatically close drawer if window expands beyond mobile breakpoint (1280px / xl)
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1280 && drawer.classList.contains('translate-x-0')) {
        closeMenu();
      }
    });

    // Highlight active link based on current page path
    const currentPath = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    drawer.querySelectorAll('[data-mobile-link]').forEach(link => {
      const target = link.getAttribute('data-mobile-link');
      const isCurrent =
        (target === 'index' && (currentPath === '' || currentPath === 'index.html' || currentPath === 'index')) ||
        (currentPath.includes(target));

      if (isCurrent) {
        link.classList.add('bg-hm-elevated', 'border-hm-border-s', 'text-hm-text', 'font-bold');
        link.classList.remove('text-hm-muted', 'border-transparent');
      } else {
        link.classList.remove('bg-hm-elevated', 'border-hm-border-s', 'text-hm-text', 'font-bold');
        link.classList.add('text-hm-muted', 'border-transparent');
      }
    });

    // Realtime Drawer Clock
    const drawerClock = document.getElementById('mobile-drawer-clock');
    if (drawerClock) {
      const updateClock = () => {
        const d = new Date();
        drawerClock.textContent = d.toLocaleTimeString('en-IN', { hour12: false });
      };
      updateClock();
      setInterval(updateClock, 1000);
    }
  }

  // ─── EXPOSE ON WINDOW.HAMMERUX ─────────────────────────────
  window.HammerUX = {
    AudioSettings,
    getAudioSettings: () => AudioSettings.getAll(),
    setAudioSetting: (k, v) => AudioSettings.set(k, v),
    unlockAudio,
    playGavelStrike,
    playCountdownBeep,
    playBidClick,
    playClockTick,
    handleTimerTick,
    handleAuctionSold,
    handleAuctionUnsold,
    handleAuctionBid,
    handleAuctionPause,
    handleAuctionReset,
    initMobileTouchFlip,
    initMobileNavigation,
    animateCurrencyNumber
  };

  function setup() {
    cleanupCustomCursor();
    initMobileTouchFlip();
    initMobileNavigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

})(window);

