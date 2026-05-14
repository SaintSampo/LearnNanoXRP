// ============================================================
//  LearnNanoXRP – SCORM Runtime
//  Provides SCORM 1.2 API shim (for real LMS) and a postMessage
//  bridge (for GitHub Pages iframe mode).
//  Include this BEFORE any lesson-specific script.
// ============================================================

(function () {
  'use strict';

  // ── Detect mode ──────────────────────────────────────────
  // If an LMS provides window.API we're in SCORM mode.
  // Otherwise we use postMessage to report back to the parent site.
  const SCORM_MODE   = !!window.API;
  const IFRAME_MODE  = !SCORM_MODE && window.parent !== window;

  // ── Internal state ────────────────────────────────────────
  const _store = {};
  let   _initialized = false;

  // ── SCORM 1.2 shim ───────────────────────────────────────
  // When hosted inside an LMS the LMS provides window.API.
  // When hosted on GitHub Pages we create our own shim that
  // persists data to localStorage (keyed by lesson ID).
  if (!SCORM_MODE) {
    window.API = {
      LMSInitialize: function (str) {
        _initialized = true;
        return 'true';
      },
      LMSFinish: function (str) {
        _initialized = false;
        return 'true';
      },
      LMSGetValue: function (element) {
        return _store[element] || '';
      },
      LMSSetValue: function (element, value) {
        _store[element] = String(value);
        // Mirror to localStorage so progress survives page reload
        try {
          const raw = JSON.parse(localStorage.getItem('scorm_data') || '{}');
          raw[element] = String(value);
          localStorage.setItem('scorm_data', JSON.stringify(raw));
        } catch {}
        return 'true';
      },
      LMSCommit: function (str) {
        return 'true';
      },
      LMSGetLastError: function ()         { return '0'; },
      LMSGetErrorString: function (code)   { return ''; },
      LMSGetDiagnostic: function (code)    { return ''; },
    };

    // Pre-populate from localStorage
    try {
      const raw = JSON.parse(localStorage.getItem('scorm_data') || '{}');
      Object.assign(_store, raw);
    } catch {}
  }

  // ── Profile-aware progress key ───────────────────────────
  function progressKey() {
    try {
      const p = localStorage.getItem('learnNanoXRP_currentProfile');
      return p ? 'learnNanoXRP_progress_' + p : 'learnNanoXRP_progress';
    } catch { return 'learnNanoXRP_progress'; }
  }

  // ── Public LessonRuntime API ─────────────────────────────
  // lesson HTML files call these helpers instead of using the
  // raw SCORM API directly.

  window.LessonRuntime = {

    // Call at lesson start
    init: function (lessonId) {
      this._lessonId = lessonId;
      window.API.LMSInitialize('');
      window.API.LMSSetValue('cmi.core.lesson_status', 'incomplete');

      // Notify parent (GitHub Pages mode)
      if (IFRAME_MODE) {
        try {
          window.parent.postMessage({ type: 'LESSON_PROGRESS', lessonId }, '*');
        } catch {}
      }
    },

    // Call when the student passes the quiz / completes the lesson
    complete: function (score) {
      const pct = Math.round(score);
      window.API.LMSSetValue('cmi.core.lesson_status', 'passed');
      window.API.LMSSetValue('cmi.core.score.raw',     String(pct));
      window.API.LMSSetValue('cmi.core.score.min',     '0');
      window.API.LMSSetValue('cmi.core.score.max',     '100');
      window.API.LMSCommit('');
      window.API.LMSFinish('');

      // Also save completion to localStorage directly
      try {
        const prog = JSON.parse(localStorage.getItem(progressKey()) || '{}');
        prog[this._lessonId] = 'complete';
        localStorage.setItem(progressKey(), JSON.stringify(prog));
      } catch {}

      // Notify parent window (GitHub Pages mode)
      if (IFRAME_MODE) {
        try {
          window.parent.postMessage({
            type:     'LESSON_COMPLETE',
            lessonId: this._lessonId,
            score:    pct,
          }, '*');
        } catch {}
      }
    },

    // Check if this lesson was already completed
    wasCompleted: function () {
      try {
        const prog = JSON.parse(localStorage.getItem(progressKey()) || '{}');
        return prog[this._lessonId] === 'complete';
      } catch { return false; }
    },
  };

  // On production (GitHub Pages / SCORM), image-loader.js doesn't run.
  // Convert data-src → src here so lesson images still load.
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('img[data-src]').forEach(function (img) {
        img.src = img.getAttribute('data-src');
      });
    });
  }

})();
