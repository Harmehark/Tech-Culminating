/* ══════════════════════════════════════════════════════════
   LUSION-STYLE ANIMATION ENGINE — animations.js
   Drop <script src="animations.js" defer></script> into
   every page's <head> or before </body>
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── 1. Scroll progress bar ──
  var progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.prepend(progressBar);

  window.addEventListener('scroll', function () {
    var scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    progressBar.style.width = (scrolled * 100).toFixed(2) + '%';
  }, { passive: true });

  // ── 2. Custom cursor (desktop only) ──
  if (window.matchMedia('(hover: hover)').matches) {
    var cursor     = document.createElement('div');
    var cursorRing = document.createElement('div');
    cursor.className     = 'lusion-cursor';
    cursorRing.className = 'lusion-cursor-ring';
    document.body.appendChild(cursor);
    document.body.appendChild(cursorRing);

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      cursor.style.left = mx + 'px';
      cursor.style.top  = my + 'px';
    });

    // Ring follows with lag
    (function ringLoop() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      cursorRing.style.left = rx + 'px';
      cursorRing.style.top  = ry + 'px';
      requestAnimationFrame(ringLoop);
    })();

    // Hover state on interactive elements
    var hoverEls = 'a, button, .btn, .card, .faq-question, .magnetic, input, select, textarea';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(hoverEls)) {
        cursor.classList.add('cursor-hover');
        cursorRing.classList.add('cursor-hover');
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(hoverEls)) {
        cursor.classList.remove('cursor-hover');
        cursorRing.classList.remove('cursor-hover');
      }
    });
  }

  // ── 3. Page transition overlay ──
  var overlay = document.createElement('div');
  overlay.className = 'page-transition-overlay';
  document.body.appendChild(overlay);

  // Slide out on load (reveals page)
  window.addEventListener('load', function () {
    setTimeout(function () {
      overlay.classList.add('slide-out');
    }, 80);
  });

  // Slide in before navigating away (internal links only)
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    // Skip anchors, external links, and blank targets
    if (!href || href.startsWith('#') || href.startsWith('http') ||
        href.startsWith('mailto') || link.target === '_blank') return;
    e.preventDefault();
    overlay.classList.remove('slide-out');
    overlay.classList.add('slide-in');
    setTimeout(function () {
      window.location.href = href;
    }, 520);
  });

  // ── 4. Smooth scroll with easing (replaces CSS scroll-behavior) ──
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id     = link.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation(); // prevent page-transition from firing

      var start    = window.scrollY;
      var end      = target.getBoundingClientRect().top + window.scrollY - 72;
      var distance = end - start;
      var duration = Math.min(Math.max(Math.abs(distance) * 0.6, 500), 1200);
      var startTime = null;

      function easeInOutExpo(t) {
        return t === 0 ? 0 : t === 1 ? 1 :
          t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 :
          (2 - Math.pow(2, -20 * t + 10)) / 2;
      }

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        window.scrollTo(0, start + distance * easeInOutExpo(progress));
        if (progress < 1) requestAnimationFrame(step);
        else {
          // Pulse the section after scroll lands
          target.classList.add('section-pulse');
          setTimeout(function () { target.classList.remove('section-pulse'); }, 1050);
        }
      }
      requestAnimationFrame(step);
    });
  });

  // ── 5. Active nav highlight on scroll ──
  (function () {
    var sections = Array.from(document.querySelectorAll('section[id], [id].anim-section'));
    var navLinks = Array.from(document.querySelectorAll(
      'nav a[href^="#"], .top-nav a[href^="#"], .navbar a[href^="#"]'
    ));
    if (!sections.length || !navLinks.length) return;

    function setActive(id) {
      navLinks.forEach(function (a) {
        a.classList.toggle('nav-active', a.getAttribute('href').slice(1) === id);
      });
    }

    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
    }, { threshold: 0.3 }).observe && sections.forEach(function (s) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
      }, { threshold: 0.3 }).observe(s);
    });
  })();

  // ── 6. Section entrance (.anim-section) ──
  (function () {
    var els = document.querySelectorAll('.anim-section, .clip-reveal');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  })();

  // ── 7. Element-level animations ([data-anim]) ──
  (function () {
    var els = document.querySelectorAll('[data-anim]');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('anim-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  })();

  // ── 8. Text character split reveal (.reveal-text) ──
  (function () {
    var els = document.querySelectorAll('.reveal-text');
    if (!els.length) return;

    els.forEach(function (el) {
      var words = el.textContent.trim().split(' ');
      el.innerHTML = words.map(function (word) {
        var chars = word.split('').map(function (ch, i) {
          return '<span class="char" style="transition-delay:' + (i * 38) + 'ms">' + ch + '</span>';
        }).join('');
        return '<span style="display:inline-block;white-space:nowrap">' + chars + '</span>';
      }).join('<span style="display:inline-block;width:0.28em"> </span>');
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
      });
    }, { threshold: 0.3 });
    els.forEach(function (el) { io.observe(el); });
  })();

  // ── 9. Magnetic hover effect (.magnetic) ──
  (function () {
    if (!window.matchMedia('(hover: hover)').matches) return;
    document.querySelectorAll('.magnetic').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var rect   = el.getBoundingClientRect();
        var cx     = rect.left + rect.width  / 2;
        var cy     = rect.top  + rect.height / 2;
        var dx     = (e.clientX - cx) * 0.38;
        var dy     = (e.clientY - cy) * 0.38;
        el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  })();

  // ── 10. Parallax images (.parallax-img) ──
  (function () {
    var imgs = Array.from(document.querySelectorAll('.parallax-img'));
    if (!imgs.length) return;
    window.addEventListener('scroll', function () {
      var sy = window.scrollY;
      imgs.forEach(function (img) {
        var rect   = img.closest('.parallax-wrap') || img;
        var bounds = rect.getBoundingClientRect();
        var center = bounds.top + bounds.height / 2;
        var offset = (window.innerHeight / 2 - center) * 0.18;
        img.style.transform = 'scale(1.12) translateY(' + offset + 'px)';
      });
    }, { passive: true });
  })();

})();