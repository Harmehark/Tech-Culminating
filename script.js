// ============================================================
//  Personalized Calorie Intake Meal Planner — script.js
//  Shared across all pages
// ============================================================
(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // ── Mobile nav ──
  const toggle = $('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const menu = $('#nav-menu');
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('show');
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.top-nav') && !e.target.closest('.nav-toggle')) {
        $('#nav-menu')?.classList.remove('show');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── Utilities ──
  function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }

  function mifflinStJeor({ sex, weightKg, heightCm, age }) {
    const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);