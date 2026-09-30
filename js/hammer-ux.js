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
    animateCurrencyNumber
  };

  document.addEventListener('DOMContentLoaded', () => {
    cleanupCustomCursor();
    initMobileTouchFlip();
  });

})(window);
