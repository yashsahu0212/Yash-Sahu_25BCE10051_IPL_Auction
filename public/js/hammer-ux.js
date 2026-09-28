/**
 * HAMMER — Editorial Audio-Visual & UX Engine
 * Web Audio sound synthesis, animated tickers, 3D card flips. (Normal browser cursor restored)
 */
(function(window) {
  'use strict';

  // ─── 1. WEB AUDIO SYNTHESIZER (ZERO ASSET DEPENDENCY) ─────
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Resonant wooden auction gavel sound
  function playGavelStrike() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Primary wood impact osc
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);

      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      // Wooden resonance filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);

      // Secondary wood crack noise
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.015));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
    } catch (e) {}
  }

  // Tactile bid button click sound
  function playBidClick() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
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

  // Clock tension tick
  function playClockTick() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
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

  // ─── 2. MOBILE TAP FLIP CARD INTERACTION ───────────────────
  function initMobileTouchFlip() {
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.flip-card');
      if (!card) return;

      // Only on touch or when clicked directly
      if (window.matchMedia('(hover: none)').matches || e.pointerType === 'touch') {
        card.classList.toggle('is-flipped');
      }
    });
  }

  // ─── 3. ANIMATED NUMBER TICKER ────────────────────────────
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

  // Clean up any existing cursor elements in DOM
  function cleanupCustomCursor() {
    const dot = document.querySelector('.hammer-cursor-dot');
    if (dot) dot.remove();
    const ring = document.querySelector('.hammer-cursor-ring');
    if (ring) ring.remove();
  }

  // Expose on window.HammerUX
  window.HammerUX = {
    playGavelStrike,
    playBidClick,
    playClockTick,
    initMobileTouchFlip,
    animateCurrencyNumber
  };

  document.addEventListener('DOMContentLoaded', () => {
    cleanupCustomCursor();
    initMobileTouchFlip();
  });
})(window);
