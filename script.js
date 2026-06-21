// ============================================================
//  Personalized Calorie Intake Meal Planner — script.js
// ============================================================
(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function clamp(n, lo, hi) { return Math.min(Math.max(n, lo), hi); }

  // ── Toast ──
  function toast(msg) {
    var el = document.getElementById('toast-msg');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-msg';
      el.style.cssText =
        'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);' +
        'background:#1b5e20;color:#fff;padding:11px 24px;border-radius:999px;' +
        'font-size:14px;font-weight:500;z-index:99999;opacity:0;' +
        'transition:opacity 0.3s;pointer-events:none;white-space:nowrap;' +
        'box-shadow:0 4px 20px rgba(0,0,0,0.25);';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.opacity = '0'; }, 3000);
  }

  // ── Scroll reveal animation ──
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in-view'); });
  }

  // ── Header glow on scroll ──
  var header = $('.site-header');
  if (header) {
    function updateHeaderState() {
      header.classList.toggle('scrolled', window.scrollY > 8);
    }
    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, { passive: true });
  }

  // ── Subtle hero parallax ──
  var heroSection = $('.hero');
  var heroCopy = $('.hero-copy');
  var heroPhotos = $('.hero-photos');
  if (heroSection && heroCopy && heroPhotos) {
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      var move = Math.min(y * 0.12, 18);
      heroCopy.style.transform = 'translateY(' + Math.max(0, move * 0.45) + 'px)';
      heroPhotos.style.transform = 'translateY(' + Math.max(0, move * 0.25) + 'px)';
      heroSection.style.setProperty('--parallax', move + 'px');
    }, { passive: true });
  }

  // ── Enable snap page feel on the homepage ──
  document.documentElement.classList.add('snap-page');

  // ══════════════════════════════════════════════════════════
  //  AUTH MODAL
  // ══════════════════════════════════════════════════════════
  function getUser()  { return load('cp_user', null); }
  function getUsers() { return load('cp_users', []); }

  function showScreen(id) {
    ['screen-choice','screen-signup','screen-login','screen-profile'].forEach(function (s) {
      var el = document.getElementById(s);
      if (el) el.style.display = (s === id) ? 'block' : 'none';
    });
  }

  function btnStyle(bg, color) {
    return 'width:100%;padding:12px 20px;background:' + bg + ';color:' + color + ';' +
      'border:none;border-radius:10px;font-size:15px;font-weight:600;' +
      'cursor:pointer;font-family:inherit;transition:opacity 0.15s;display:block;text-align:center;';
  }
  function linkBtnStyle() {
    return 'background:none;border:none;color:#2e7d32;font-weight:600;' +
      'font-size:13px;cursor:pointer;text-decoration:underline;font-family:inherit;padding:0;';
  }
  function fieldHTML(id, type, label, placeholder, autocomplete) {
    return '<div style="margin-bottom:14px">' +
      '<label for="' + id + '" style="display:block;font-size:13px;font-weight:600;color:#1b5e20;margin-bottom:5px">' + label + '</label>' +
      '<input id="' + id + '" type="' + type + '" placeholder="' + placeholder + '" autocomplete="' + autocomplete + '" ' +
      'style="width:100%;padding:11px 13px;border:1.5px solid #d0e8d0;border-radius:8px;font-size:15px;' +
      'font-family:inherit;background:#f4f7f2;color:#1a2e1a;box-sizing:border-box;" ' +
      'onfocus="this.style.borderColor=\'#4caf50\';this.style.boxShadow=\'0 0 0 3px rgba(76,175,80,0.2)\';this.style.background=\'#fff\'" ' +
      'onblur="this.style.borderColor=\'#d0e8d0\';this.style.boxShadow=\'none\';this.style.background=\'#f4f7f2\'" /></div>';
  }
  function profileRow(label, value) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;' +
      'padding:9px 12px;background:#f4f7f2;border-radius:8px;border:1px solid #d0e8d0;font-size:13px;margin-bottom:6px">' +
      '<span style="color:#6b7f6b;font-weight:600">' + label + '</span>' +
      '<span style="color:#1a2e1a;font-weight:500">' + value + '</span></div>';
  }
  function showErr(el, msg) { el.textContent = msg; el.style.display = 'block'; }

  function openModal(screen) {
    var old = document.getElementById('auth-modal');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id = 'auth-modal';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.55);' +
      'backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;' +
      'padding:16px;opacity:0;transition:opacity 0.22s;overflow-y:auto;';

    var box = document.createElement('div');
    box.style.cssText =
      'background:#fff;border-radius:20px;width:100%;max-width:420px;padding:36px 32px;' +
      'position:relative;box-shadow:0 24px 64px rgba(0,0,0,0.22);max-height:92vh;overflow-y:auto;margin:auto;font-family:inherit;';

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label','Close');
    closeBtn.style.cssText =
      'position:absolute;top:14px;right:14px;background:#f4f7f2;border:1px solid #d0e8d0;' +
      'border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:14px;color:#6b7f6b;' +
      'display:flex;align-items:center;justify-content:center;';
    closeBtn.onclick = closeModal;
    box.appendChild(closeBtn);

    // Screen: Choice
    var sc = document.createElement('div');
    sc.id = 'screen-choice';
    sc.innerHTML =
      '<div style="font-size:52px;text-align:center;margin-bottom:12px">🥗</div>' +
      '<h2 style="text-align:center;margin:0 0 6px;font-size:22px;color:#1b5e20">Welcome!</h2>' +
      '<p style="text-align:center;color:#6b7f6b;font-size:14px;margin:0 0 28px">Get personalized meal plans tailored just for you.</p>' +
      '<div style="display:flex;flex-direction:column;gap:12px">' +
        '<button id="btn-go-signup" style="' + btnStyle('#2e7d32','#fff') + '">✨ Sign Up — Create Account</button>' +
        '<button id="btn-go-login"  style="' + btnStyle('#e8f5e9','#1b5e20') + '">🔑 Log In — I have an account</button>' +
        '<button id="btn-guest"     style="' + btnStyle('#f4f7f2','#6b7f6b') + '">→ Continue as Guest</button>' +
      '</div>';
    box.appendChild(sc);

    // Screen: Sign Up
    var ss = document.createElement('div');
    ss.id = 'screen-signup';
    ss.innerHTML =
      '<h2 style="margin:0 0 4px;font-size:22px;color:#1b5e20">Create Account</h2>' +
      '<p style="color:#6b7f6b;font-size:14px;margin:0 0 24px">Fill in your details to get started.</p>' +
      fieldHTML('su-name',     'text',     'Full Name', 'e.g. Alex Johnson',     'name') +
      fieldHTML('su-email',    'email',    'Email',     'you@example.com',        'email') +
      fieldHTML('su-password', 'password', 'Password',  'At least 6 characters', 'new-password') +
      '<div id="su-err" style="display:none;background:#fdecea;border:1px solid #f5c6c6;' +
        'color:#c62828;border-radius:8px;padding:9px 12px;font-size:13px;margin-bottom:12px"></div>' +
      '<button id="btn-do-signup" style="' + btnStyle('#2e7d32','#fff') + ';margin-bottom:14px" type="button">Create Account →</button>' +
      '<p style="text-align:center;font-size:13px;color:#6b7f6b;margin:0">Already have an account? ' +
        '<button id="btn-to-login" style="' + linkBtnStyle() + '" type="button">Log in</button></p>';
    box.appendChild(ss);

    // Screen: Log In
    var sl = document.createElement('div');
    sl.id = 'screen-login';
    sl.innerHTML =
      '<h2 style="margin:0 0 4px;font-size:22px;color:#1b5e20">Welcome Back</h2>' +
      '<p style="color:#6b7f6b;font-size:14px;margin:0 0 24px">Log in to access your saved plans.</p>' +
      fieldHTML('li-email',    'email',    'Email',    'you@example.com', 'email') +
      fieldHTML('li-password', 'password', 'Password', 'Your password',   'current-password') +
      '<div id="li-err" style="display:none;background:#fdecea;border:1px solid #f5c6c6;' +
        'color:#c62828;border-radius:8px;padding:9px 12px;font-size:13px;margin-bottom:12px"></div>' +
      '<button id="btn-do-login" style="' + btnStyle('#2e7d32','#fff') + ';margin-bottom:14px" type="button">Log In →</button>' +
      '<p style="text-align:center;font-size:13px;color:#6b7f6b;margin:0">No account yet? ' +
        '<button id="btn-to-signup" style="' + linkBtnStyle() + '" type="button">Sign up</button></p>';
    box.appendChild(sl);

    // Screen: Auth Profile view
    var sp = document.createElement('div');
    sp.id = 'screen-profile';
    var user = getUser();
    var prof = load('cp_profile', {});
    sp.innerHTML =
      '<div style="font-size:52px;text-align:center;margin-bottom:8px">👤</div>' +
      '<h2 style="text-align:center;margin:0 0 20px;font-size:20px;color:#1b5e20">' + (user ? user.name : 'Profile') + '</h2>' +
      '<div style="margin-bottom:20px">' +
        profileRow('📧 Email', user ? user.email : '—') +
        profileRow('👤 Name',  user ? user.name  : '—') +
        (prof.age    ? profileRow('🎂 Age',    prof.age + ' yrs') : '') +
        (prof.height ? profileRow('📏 Height', prof.height + ' cm') : '') +
        (prof.weight ? profileRow('⚖️ Weight', prof.weight + ' kg') : '') +
        (prof.diet   ? profileRow('🥗 Diet',   prof.diet) : '') +
        (prof.allergies && prof.allergies.length ? profileRow('⚠️ Allergies', prof.allergies.join(', ')) : '') +
        (user && user.created ? profileRow('📅 Member since', new Date(user.created).toLocaleDateString()) : '') +
      '</div>' +
      '<button id="btn-do-logout" style="' + btnStyle('#c62828','#fff') + '" type="button">🚪 Log Out</button>';
    box.appendChild(sp);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.style.opacity = '1'; });
    });

    showScreen(screen || 'screen-choice');

    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

    overlay.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var su = document.getElementById('screen-signup');
      var li = document.getElementById('screen-login');
      if (su && su.style.display === 'block') document.getElementById('btn-do-signup').click();
      if (li && li.style.display === 'block') document.getElementById('btn-do-login').click();
    });

    document.getElementById('btn-go-signup').onclick = function () { showScreen('screen-signup'); };
    document.getElementById('btn-go-login').onclick  = function () { showScreen('screen-login');  };
    document.getElementById('btn-guest').onclick     = function () { save('cp_modal_shown', true); closeModal(); };
    document.getElementById('btn-to-login').onclick  = function () { showScreen('screen-login');  };
    document.getElementById('btn-to-signup').onclick = function () { showScreen('screen-signup'); };

    document.getElementById('btn-do-signup').onclick = function () {
      var name  = document.getElementById('su-name').value.trim();
      var email = document.getElementById('su-email').value.trim().toLowerCase();
      var pass  = document.getElementById('su-password').value;
      var err   = document.getElementById('su-err');
      err.style.display = 'none';
      if (!name)                          { showErr(err, '⚠️ Please enter your full name.'); return; }
      if (!email || !email.includes('@')) { showErr(err, '⚠️ Please enter a valid email address.'); return; }
      if (pass.length < 6)                { showErr(err, '⚠️ Password must be at least 6 characters.'); return; }
      var users = getUsers();
      if (users.find(function (u) { return u.email === email; })) {
        showErr(err, '⚠️ An account with this email already exists. Try logging in.'); return;
      }
      var newUser = { name: name, email: email, password: pass, created: new Date().toISOString() };
      users.push(newUser);
      save('cp_users', users);
      save('cp_user',  newUser);
      save('cp_modal_shown', true);
      updateAuthNav();
      toast('✅ Account created! Welcome, ' + name + '!');
      closeModal();
    };

    document.getElementById('btn-do-login').onclick = function () {
      var email = document.getElementById('li-email').value.trim().toLowerCase();
      var pass  = document.getElementById('li-password').value;
      var err   = document.getElementById('li-err');
      err.style.display = 'none';
      if (!email) { showErr(err, '⚠️ Please enter your email.'); return; }
      if (!pass)  { showErr(err, '⚠️ Please enter your password.'); return; }
      var users = getUsers();
      var found = users.find(function (u) { return u.email === email && u.password === pass; });
      if (!found) { showErr(err, '⚠️ Incorrect email or password. Please try again.'); return; }
      save('cp_user', found);
      save('cp_modal_shown', true);
      updateAuthNav();
      toast('✅ Welcome back, ' + found.name + '!');
      closeModal();
    };

    var logoutBtn = document.getElementById('btn-do-logout');
    if (logoutBtn) {
      logoutBtn.onclick = function () {
        localStorage.removeItem('cp_user');
        updateAuthNav();
        toast('👋 You have been logged out.');
        closeModal();
      };
    }
  }

  function closeModal() {
    var m = document.getElementById('auth-modal');
    if (!m) return;
    m.style.opacity = '0';
    setTimeout(function () { var el = document.getElementById('auth-modal'); if (el) el.remove(); }, 240);
  }

  function updateAuthNav() {
    var user      = getUser();
    var liLogin   = document.getElementById('li-login-btn');
    var liSignup  = document.getElementById('li-signup-btn');
    var liLogout  = document.getElementById('li-logout-btn');
    var liProfile = document.getElementById('li-profile-btn');
    var profileA  = document.getElementById('nav-profile-btn');
    if (user) {
      if (liLogin)   liLogin.style.display   = 'none';
      if (liSignup)  liSignup.style.display  = 'none';
      if (liLogout)  liLogout.style.display  = 'list-item';
      if (liProfile) liProfile.style.display = 'list-item';
      if (profileA)  profileA.textContent    = '👤 ' + (user.name || 'Profile');
    } else {
      if (liLogin)   liLogin.style.display   = 'list-item';
      if (liSignup)  liSignup.style.display  = 'list-item';
      if (liLogout)  liLogout.style.display  = 'none';
      if (liProfile) liProfile.style.display = 'none';
    }
  }

  function wireNavAuth() {
    var loginBtn   = document.getElementById('nav-login-btn');
    var signupBtn  = document.getElementById('nav-signup-btn');
    var logoutBtn  = document.getElementById('nav-logout-btn');
    var profileBtn = document.getElementById('nav-profile-btn');
    if (loginBtn)  loginBtn.addEventListener('click',  function (e) { e.preventDefault(); openModal('screen-login');  });
    if (signupBtn) signupBtn.addEventListener('click', function (e) { e.preventDefault(); openModal('screen-signup'); });
    if (logoutBtn) logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      localStorage.removeItem('cp_user');
      updateAuthNav();
      toast('👋 You have been logged out.');
    });
    if (profileBtn) profileBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openModal(getUser() ? 'screen-profile' : 'screen-login');
    });
  }
  wireNavAuth();
  updateAuthNav();

  if (!load('cp_modal_shown', false)) {
    setTimeout(function () { openModal('screen-choice'); }, 900);
  }

  // ── Mobile nav ──
  var navToggle = $('.nav-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      var menu = $('#nav-menu');
      var expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      if (menu) menu.classList.toggle('show');
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.top-nav')) {
        var menu = $('#nav-menu');
        if (menu) menu.classList.remove('show');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  //  SNAP SCROLL + DOT NAV (index.html only)
  // ══════════════════════════════════════════════════════════
  var snapSections = $$('.snap-section');
  var dotsNav      = document.getElementById('snap-dots');
  if (snapSections.length) {
    var LABELS = ['Home','Nutrition','Article','FAQ','About'];
    if (dotsNav) {
      snapSections.forEach(function (sec, i) {
        var dot = document.createElement('button');
        dot.className = 'snap-dot';
        dot.title     = LABELS[i] || ('Section ' + (i + 1));
        dot.setAttribute('aria-label', LABELS[i] || ('Section ' + (i + 1)));
        dot.onclick   = function () { sec.scrollIntoView({ behavior: 'smooth' }); };
        dotsNav.appendChild(dot);
      });
    }
    var dots = $$('.snap-dot');
    var snapIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var idx = snapSections.indexOf(entry.target);
        entry.target.classList.add('in-view');
        dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
      });
    }, { threshold: 0.5 });
    snapSections.forEach(function (s) { snapIO.observe(s); });
  }

  // ── FAQ accordion behavior ──
  var faqButtons = $$('.faq-question');
  faqButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var isOpen = item && item.classList.contains('open');
      var icon = btn.querySelector('.faq-icon');

      faqButtons.forEach(function (otherBtn) {
        var otherItem = otherBtn.closest('.faq-item');
        var otherIcon = otherBtn.querySelector('.faq-icon');
        if (otherItem && otherItem !== item) {
          otherItem.classList.remove('open');
          otherBtn.setAttribute('aria-expanded', 'false');
          if (otherIcon) otherIcon.textContent = '＋';
        }
      });

      if (item) {
        item.classList.toggle('open', !isOpen);
        btn.setAttribute('aria-expanded', String(!isOpen));
        if (icon) icon.textContent = !isOpen ? '-' : '+';
      }
    });
  });

  // ══════════════════════════════════════════════════════════
  //  MEAL PLANNER
  // ══════════════════════════════════════════════════════════
  function mifflinStJeor(o) {
    var base = (10 * o.weightKg) + (6.25 * o.heightCm) - (5 * o.age);
    return o.sex === 'Female' ? base - 161 : base + 5;
  }
  function applyGoal(tdee, goal) {
    var map = { 'maintain':1.0,'mild-loss':0.9,'loss':0.8,'mild-gain':1.1,'gain':1.2 };
    return Math.round(tdee * (map[goal] || 1.0));
  }
  function getAgeGroup(age) {
    if (age <= 13) return { key:'preteens',           label:'Preteens (9–13)'           };
    if (age <= 18) return { key:'teens',              label:'Teens (14–18)'              };
    if (age <= 30) return { key:'young-adults',       label:'Young Adults (19–30)'       };
    if (age <= 50) return { key:'middle-aged-adults', label:'Middle-Aged Adults (31–50)' };
    return               { key:'older-adults',       label:'Older Adults (51+)'         };
  }
  function getActivityChoice(a) {
    if (a <= 1.375) return '1';
    if (a <= 1.55)  return '2';
    return '3';
  }

  var MEAL_PLANS = {
    'preteens': {
      '1': { activity:'Low', calories:1600,
        breakfasts:['Oatmeal with banana slices','Scrambled eggs with whole wheat toast','Yogurt parfait with berries','Whole-grain cereal with strawberries','Pancakes with fruit salad'],
        lunches:   ['Turkey sandwich with carrots','Chicken rice bowl with veggies','Tomato soup with crackers','Pasta salad with chicken and veggies','Cheese quesadilla with salsa and salad'],
        dinners:   ['Baked chicken with rice and green beans','Spaghetti with tomato sauce and salad','Beef tacos with lettuce','Salmon with mashed potatoes and broccoli','Stir-fry chicken with vegetables','Homemade pizza with veggie toppings'],
        snacks:    ['Apple slices','Orange slices','Fresh berries','Banana','Fruit cup','Cucumber slices'] },
      '2': { activity:'Moderate', calories:2000,
        breakfasts:['Avocado toast with fruit','Oatmeal with berries','Whole grain waffles with yogurt','Smoothie bowl with banana','Egg sandwich with turkey'],
        lunches:   ['Chicken wrap with veggies','Rice bowl with beef and broccoli','Turkey burger with roasted potatoes','Mac and cheese','Chicken rice bowl'],
        dinners:   ['Grilled salmon with rice and asparagus','Chicken with broccoli','Beef stir-fry with noodles','Vegetable lasagna','Baked chicken with sweet potatoes','BBQ chicken with corn'],
        snacks:    ['Granola bar','Cheese stick and grapes','Fruit and yogurt dip','Fruit bowl','Banana'] },
      '3': { activity:'High', calories:2600,
        breakfasts:['Large oatmeal bowl with nuts and fruit','Smoothie with oats and banana','French toast with berries','Large breakfast bowl with fruit'],
        lunches:   ['Chicken burrito bowl with rice and beans','Beef pasta','Turkey sandwich with soup and fruit','Salmon rice bowl with vegetables','Mac and cheese with chicken'],
        dinners:   ['Steak with mashed potatoes and vegetables','Chicken stir-fry with rice','Baked salmon with pasta salad','Beef tacos with rice and beans','Chicken parmesan with spaghetti','Shrimp fried rice with vegetables'],
        snacks:    ['Banana','Fruit smoothie','Granola','Fruit cup','String cheese'] }
    },
    'teens': {
      '1': { activity:'Low', calories:2000,
        breakfasts:['Whole grain toast with fruit','Yogurt with berries','Avocado toast','Oatmeal with banana'],
        lunches:   ['Turkey sandwich with veggies','Rice bowl with chicken and vegetables','Veggie pizza with salad','Burrito bowl with beans and rice'],
        dinners:   ['Grilled chicken with roasted vegetables','Beef tacos with rice','Spaghetti with marinara','Stir-fry noodles with chicken','Salmon with quinoa and broccoli'],
        snacks:    ['Apple slices','Fruit cup','Fruit smoothie','Popcorn','Melon'] },
      '2': { activity:'Moderate', calories:2400,
        breakfasts:['Protein pancakes','Protein smoothie with oats','Waffles with yogurt and berries','French toast'],
        lunches:   ['Chicken burrito bowl','Turkey burger with sweet potato fries','Steak salad','Rice bowl with beef and broccoli','Quinoa bowl'],
        dinners:   ['Steak with potatoes and vegetables','Salmon with rice and asparagus','Chicken Alfredo pasta','Beef stir-fry with noodles','Chicken parmesan with spaghetti'],
        snacks:    ['Banana smoothie','Fruit bowl','Hummus and veggies','Fruit cup'] },
      '3': { activity:'High', calories:3300,
        breakfasts:['Large omelet with fruit','French toast with yogurt','Oatmeal with nuts and fruit'],
        lunches:   ['Steak sandwich','Chicken pasta','Salmon rice bowl with avocado','Mac and cheese with grilled chicken'],
        dinners:   ['Steak with rice and vegetables','Chicken pasta','Salmon and rice','Beef tacos','Shrimp fried rice','Baked chicken with mashed potatoes'],
        snacks:    ['Chocolate banana','Fruit smoothie','Granola','Fruit cup'] }
    },
    'young-adults': {
      '1': { activity:'Low', calories:2400,
        breakfasts:['Avocado toast with poached eggs','Greek yogurt parfait with fruit','Berry smoothie','Whole-grain cereal','Pancakes with fruit'],
        lunches:   ['Chicken salad','Rice bowl with salmon and vegetables','Quinoa and veggies','Veggie wrap','Burrito bowl with beans and avocado'],
        dinners:   ['Grilled salmon with quinoa','Stir-fry chicken','Steak with sweet potatoes','Turkey meatballs with spaghetti','Beef tacos','Baked chicken with vegetables'],
        snacks:    ['Fruit and nuts','Hummus and veggies','Smoothie','Rice cakes','Fruit cup'] },
      '2': { activity:'Moderate', calories:2600,
        breakfasts:['Protein pancakes','Smoothie bowl','Oatmeal with berries and nuts','French toast with strawberries','Avocado toast'],
        lunches:   ['Grilled chicken wrap','Turkey burger with roasted potatoes','Chicken burrito bowl','Rice bowl','Veggie tacos'],
        dinners:   ['Steak with mashed potatoes','Chicken Alfredo pasta','Salmon quinoa','Turkey meatballs','Homemade pizza with vegetables','Vegetable lasagna'],
        snacks:    ['Banana','Fruit smoothie','Peanut butter toast','Fruit cup'] },
      '3': { activity:'High', calories:3500,
        breakfasts:['Large breakfast platter with eggs and fruit','Peanut butter banana smoothie with oats','Blueberry pancakes','French toast'],
        lunches:   ['Steak bowl','Chicken pasta','Salmon salad','Tuna sandwich','Quinoa power bowl'],
        dinners:   ['Steak with rice and roasted vegetables','Chicken stir-fry','Baked salmon with mashed potatoes','Beef tacos','Turkey burger with fries','Shrimp pasta'],
        snacks:    ['Smoothie','Mixed nuts','Granola','Fruit cup'] }
    },
    'middle-aged-adults': {
      '1': { activity:'Low', calories:2200,
        breakfasts:['Oatmeal with berries and nuts','Avocado toast','Smoothie','Whole-grain cereal','Fruit and granola'],
        lunches:   ['Grilled chicken salad','Quinoa bowl','Turkey sandwich with salad','Vegetable soup','Veggie wrap','Pasta with vegetables and chicken'],
        dinners:   ['Grilled chicken with quinoa','Stir-fry tofu with vegetables','Vegetable curry with rice','Beef stir-fry with vegetables','Pasta primavera','Baked chicken with rice'],
        snacks:    ['Fruit and nuts','Hummus and veggies','Smoothie','Granola bar','Rice cakes'] },
      '2': { activity:'Moderate', calories:2400,
        breakfasts:['Protein pancakes','Smoothie bowl','Oatmeal with berries and nuts','Waffles with yogurt and berries'],
        lunches:   ['Salmon salad','Beef rice bowl with vegetables','Veggie bowl','Burrito bowl with avocado','Grilled chicken sandwich'],
        dinners:   ['Chicken fajitas','Steak with sweet potatoes','Salmon quinoa','Beef tacos with beans','Turkey meatballs','Vegetable lasagna'],
        snacks:    ['Nuts','Fruit smoothie','Boiled eggs','Fruit cup'] },
      '3': { activity:'High', calories:3200,
        breakfasts:['Omelette with fruit','Protein smoothie','French toast','Oatmeal with nuts and berries'],
        lunches:   ['Steak salad','Chicken pasta','Salmon bowl','Beef burrito','Quinoa chicken bowl'],
        dinners:   ['Steak with veggies','Chicken stir-fry','Baked salmon with mashed potatoes','Beef burgers with roasted potatoes','Chicken parmesan with spaghetti'],
        snacks:    ['Smoothie','Granola','Fruit cup','Fruit and nuts'] }
    },
    'older-adults': {
      '1': { activity:'Low', calories:1800,
        breakfasts:['Oatmeal with banana slices','Whole-grain toast with fruit','Smoothie','Cereal with fruit','Fruit and nuts'],
        lunches:   ['Chicken soup','Vegetable stir-fry with rice','Tuna salad','Quinoa bowl','Veggie wrap','Pasta with marinara'],
        dinners:   ['Spaghetti and meatballs','Grilled chicken with salad','Veggie tacos','Stir-fry tofu and vegetables','Baked salmon','Grilled chicken with roasted vegetables'],
        snacks:    ['Fresh fruit','Hummus and carrots','Mixed berries','Cucumbers','Fruit bowl','Smoothie'] },
      '2': { activity:'Moderate', calories:2200,
        breakfasts:['Oatmeal with almonds and berries','Smoothie','Waffles with yogurt','Pancakes with fruit'],
        lunches:   ['Salmon salad','Quinoa and veggies','Turkey sandwich','Pasta salad','Burrito bowl with avocado'],
        dinners:   ['Grilled salmon','Chicken stir-fry','Pasta primavera','Beef tacos','Homemade pizza','Turkey meatballs'],
        snacks:    ['Nuts','Smoothie','Fruit cup','Granola bar'] },
      '3': { activity:'High', calories:3000,
        breakfasts:['Large omelet with fruit','Protein smoothie','French toast','Oatmeal with nuts and berries'],
        lunches:   ['Steak salad','Chicken pasta','Salmon rice bowl with vegetables','Quinoa power bowl'],
        dinners:   ['Steak with vegetables','Chicken parmesan with spaghetti','Salmon and rice','Beef tacos','Shrimp pasta','Turkey burger'],
        snacks:    ['Smoothie','Mixed nuts','Fruit cup','Granola'] }
    }
  };

  function matchesDiet(text, pref) {
    if (!pref || pref === 'none' || pref === 'non-vegetarian') return true;
    var v = text.toLowerCase();
    var hasMeat   = /chicken|turkey|beef|steak|salmon|tuna|shrimp|fish|sausage|bacon|burger|meatball|lamb|pork/.test(v);
    var hasAnimal = hasMeat || /\begg\b|yogurt|\bmilk\b|cheese|paneer|alfredo|ranch|\bbutter\b/.test(v);
    if (pref === 'vegetarian') return !hasMeat;
    if (pref === 'vegan')      return !hasAnimal;
    return true;
  }
  function matchesAllergies(text, allergies) {
    if (!allergies || !allergies.length) return true;
    var v = text.toLowerCase();
    var checks = {
      'peanuts':   /peanut/.test(v),
      'tree nuts': /\balmonds?\b|walnuts?|cashews?|mixed nuts|trail mix|pecans?/.test(v),
      'dairy':     /yogurt|\bmilk\b|cheese|paneer|alfredo|ranch|\bbutter\b/.test(v),
      'eggs':      /\begg\b|omelet|omelette|scrambled eggs/.test(v),
      'soy':       /\btofu\b|edamame|\bsoy\b/.test(v),
      'gluten':    /\btoast\b|\bbread\b|sandwich|wrap|\bpasta\b|pizza|bagel|waffles|pancakes|granola|muffin|quesadilla|burrito|noodles|lasagna|cereal|crackers/.test(v),
      'shellfish': /shrimp|crab|lobster|scallop/.test(v),
      'fish':      /\bsalmon\b|\btuna\b|\bfish\b/.test(v),
      'sesame':    /sesame|hummus/.test(v)
    };
    return !allergies.some(function (a) { return checks[a.toLowerCase()]; });
  }
  function filterMeals(options, diet, allergies) {
    var f = options.filter(function (o) { return matchesDiet(o, diet) && matchesAllergies(o, allergies); });
    if (f.length) return f;
    var d = options.filter(function (o) { return matchesDiet(o, diet); });
    return d.length ? d : options.slice();
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function buildDay(age, activity, diet, allergies) {
    var g  = getAgeGroup(age);
    var c  = getActivityChoice(parseFloat(activity));
    var m  = MEAL_PLANS[g.key][c];
    var sp = filterMeals(m.snacks, diet, allergies);
    var s1 = pick(sp);
    var remaining = sp.filter(function (s) { return s !== s1; });
    var s2 = remaining.length ? pick(remaining) : s1;
    return {
      ageGroup:      g.label,
      activityLabel: m.activity,
      calories:      m.calories,
      breakfast:     pick(filterMeals(m.breakfasts, diet, allergies)),
      lunch:         pick(filterMeals(m.lunches,    diet, allergies)),
      dinner:        pick(filterMeals(m.dinners,    diet, allergies)),
      snacks:        [s1, s2]
    };
  }
  function buildWeek(age, activity, diet, allergies) {
    return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
      .map(function (day) {
        return Object.assign({ day: day }, buildDay(age, activity, diet, allergies));
      });
  }

  var MEAL_COLORS = {
    breakfast: { bg:'#fff3e0', border:'#ffcc80', icon:'🌅', label:'Breakfast' },
    lunch:     { bg:'#e3f2fd', border:'#90caf9', icon:'☀️', label:'Lunch'     },
    dinner:    { bg:'#f3e5f5', border:'#ce93d8', icon:'🌙', label:'Dinner'    },
    snacks:    { bg:'#e8f5e9', border:'#a5d6a7', icon:'🍎', label:'Snacks'    }
  };

  function renderCalorieBox(el, ctx) {
    el.className = 'calorie-summary-box';
    el.innerHTML =
      '<div class="cal-main">' +
        '<div class="calorie-big">' + ctx.calories.toLocaleString() + '</div>' +
        '<div class="calorie-label">Recommended Daily Calories</div>' +
      '</div>' +
      '<div class="calorie-divider"></div>' +
      '<div class="calorie-meta">' +
        (ctx.name ? '<span>👤 <strong>' + ctx.name + '</strong></span>' : '') +
        '<span>⚧ ' + ctx.sex + ', ' + ctx.age + ' yrs</span>' +
        '<span>📏 ' + ctx.height + ' cm &nbsp;•&nbsp; ⚖️ ' + ctx.weight + ' kg</span>' +
        '<span>🏃 ' + ctx.activityLabel + ' activity &nbsp;•&nbsp; 👥 ' + ctx.ageGroup + '</span>' +
      '</div>' +
      '<div class="calorie-divider"></div>' +
      '<div class="calorie-stats">' +
        '<div class="cal-stat"><div class="cal-stat-val">' + Math.round(ctx.bmr)  + '</div><div class="cal-stat-lbl">BMR (kcal)</div></div>' +
        '<div class="cal-stat"><div class="cal-stat-val">' + Math.round(ctx.tdee) + '</div><div class="cal-stat-lbl">TDEE (kcal)</div></div>' +
        '<div class="cal-stat"><div class="cal-stat-val">' + ctx.calories.toLocaleString() + '</div><div class="cal-stat-lbl">Goal Target</div></div>' +
      '</div>';
    el.classList.remove('hidden');
  }

  function renderDayTabs(tabsEl, panelsEl, plan) {
    tabsEl.innerHTML = panelsEl.innerHTML = '';
    plan.forEach(function (d, i) {
      var btn = document.createElement('button');
      btn.className = 'day-tab' + (i === 0 ? ' active' : '');
      btn.innerHTML =
        '<span class="tab-day-short">' + d.day.slice(0,3) + '</span>' +
        '<span class="tab-day-full">'  + d.day + '</span>';
      btn.setAttribute('role','tab');
      btn.setAttribute('aria-selected', String(i === 0));
      btn.onclick = function () {
        $$('.day-tab').forEach(function (t)  { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
        $$('.day-panel').forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        btn.setAttribute('aria-selected','true');
        document.getElementById('panel-' + i).classList.add('active');
      };
      tabsEl.appendChild(btn);

      var meals = [
        { key:'breakfast', text: d.breakfast },
        { key:'lunch',     text: d.lunch },
        { key:'dinner',    text: d.dinner },
        { key:'snacks',    text: d.snacks.join(' • ') }
      ];
      var panel = document.createElement('div');
      panel.className = 'day-panel' + (i === 0 ? ' active' : '');
      panel.id = 'panel-' + i;
      panel.setAttribute('role','tabpanel');
      panel.innerHTML =
        '<div class="day-panel-header">' +
          '<h4>📅 ' + d.day + '\'s Meal Plan</h4>' +
          '<span class="day-panel-badge">' + d.calories.toLocaleString() + ' kcal/day</span>' +
        '</div>' +
        '<div class="meals-grid">' +
          meals.map(function (m) {
            var c = MEAL_COLORS[m.key];
            return '<div class="meal-item" style="background:' + c.bg + ';border-color:' + c.border + '">' +
              '<div class="meal-icon" style="background:' + c.border + '">' + c.icon + '</div>' +
              '<div class="meal-info">' +
                '<div class="meal-type">' + c.label + '</div>' +
                '<div class="meal-name">' + m.text + '</div>' +
              '</div></div>';
          }).join('') +
        '</div>';
      panelsEl.appendChild(panel);
    });
  }

  function getChecked(name) {
    return $$('input[name="' + name + '"]:checked').map(function (i) { return i.value.toLowerCase(); });
  }

  function downloadPDF(payload) {
    if (!payload) { toast('No plan to download.'); return; }
    var meta = payload.meta;
    var plan = payload.plan;
    var win  = window.open('', '_blank');
    if (!win) { toast('Please allow popups to download PDF.'); return; }
    var css =
      'body{font-family:Arial,sans-serif;margin:32px;color:#1a2e1a}' +
      'h1{color:#2e7d32;border-bottom:3px solid #4caf50;padding-bottom:8px}' +
      '.meta{background:#e8f5e9;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:14px}' +
      '.day{page-break-inside:avoid;margin-bottom:20px;border:1px solid #d0e8d0;border-radius:8px;overflow:hidden}' +
      '.day-title{background:#2e7d32;color:#fff;padding:10px 16px;font-weight:700}' +
      '.meal-row{padding:8px 16px;border-bottom:1px solid #e8f5e9;font-size:14px}' +
      '.meal-label{font-weight:700;color:#2e7d32;display:inline-block;width:90px}' +
      '.footer{margin-top:32px;font-size:12px;color:#6b7f6b;border-top:1px solid #d0e8d0;padding-top:12px}';
    win.document.write(
      '<!DOCTYPE html><html><head><title>7-Day Meal Plan</title><style>' + css + '</style></head><body>' +
      '<h1>🥗 Your 7-Day Personalized Meal Plan</h1>' +
      '<div class="meta">' +
        '<strong>Name:</strong> ' + (meta.name || '—') +
        ' &nbsp;|&nbsp; <strong>Target:</strong> ' + (meta.calories || 0).toLocaleString() + ' kcal' +
        ' &nbsp;|&nbsp; <strong>Diet:</strong> ' + (meta.diet || '—') +
        ' &nbsp;|&nbsp; <strong>Generated:</strong> ' + new Date(meta.created).toLocaleDateString() +
      '</div>' +
      plan.map(function (d) {
        return '<div class="day"><div class="day-title">📅 ' + d.day + '</div>' +
          '<div class="meal-row"><span class="meal-label">🌅 Breakfast</span>' + d.breakfast + '</div>' +
          '<div class="meal-row"><span class="meal-label">☀️ Lunch</span>'     + d.lunch     + '</div>' +
          '<div class="meal-row"><span class="meal-label">🌙 Dinner</span>'    + d.dinner    + '</div>' +
          '<div class="meal-row"><span class="meal-label">🍎 Snacks</span>'    + d.snacks.join(' • ') + '</div></div>';
      }).join('') +
      '<div class="footer">Generated by Personalized Calorie Intake Meal Planner • ' + new Date().toLocaleDateString() + '</div>' +
      '</body></html>'
    );
    win.document.close();
    setTimeout(function () { win.focus(); win.print(); }, 400);
  }

  // ══════════════════════════════════════════════════════════
  //  PAGE: FORM
  // ══════════════════════════════════════════════════════════
  var plannerForm = document.getElementById('planner-form');
  if (plannerForm) {

    var draft = load('cp_form_draft', null) || load('cp_profile', null);
    if (draft) {
      ['name','age','sex','height','weight','activity','diet','goals'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && draft[id] != null && draft[id] !== '') el.value = draft[id];
      });
      var aSet = new Set((draft.allergies || []).map(function (a) { return a.toLowerCase(); }));
      $$('input[name="allergies"]').forEach(function (cb) {
        cb.checked = aSet.has(cb.value.toLowerCase());
      });
    }

    plannerForm.addEventListener('change', function () {
      save('cp_form_draft', {
        name:      (document.getElementById('name')     || {}).value || '',
        age:       (document.getElementById('age')      || {}).value || '',
        sex:       (document.getElementById('sex')      || {}).value || '',
        height:    (document.getElementById('height')   || {}).value || '',
        weight:    (document.getElementById('weight')   || {}).value || '',
        activity:  (document.getElementById('activity') || {}).value || '',
        diet:      (document.getElementById('diet')     || {}).value || '',
        goals:     (document.getElementById('goals')    || {}).value || '',
        allergies: getChecked('allergies')
      });
    });

    var resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        plannerForm.reset();
        localStorage.removeItem('cp_form_draft');
      });
    }

    plannerForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var ageEl      = document.getElementById('age');
      var sexEl      = document.getElementById('sex');
      var heightEl   = document.getElementById('height');
      var weightEl   = document.getElementById('weight');
      var activityEl = document.getElementById('activity');
      var dietEl     = document.getElementById('diet');
      var goalsEl    = document.getElementById('goals');
      var nameEl     = document.getElementById('name');

      if (!ageEl.value || !sexEl.value || !heightEl.value || !weightEl.value || !activityEl.value) {
        toast('⚠️ Please fill in all required fields.');
        return;
      }

      var name      = nameEl  ? nameEl.value.trim() : '';
      var age       = clamp(parseInt(ageEl.value, 10), 9, 100);
      var sex       = sexEl.value || 'Female';
      var height    = clamp(parseInt(heightEl.value, 10), 120, 230);
      var weight    = clamp(parseFloat(weightEl.value), 30, 250);
      var activity  = parseFloat(activityEl.value || '1.2');
      var diet      = dietEl  ? (dietEl.value  || 'none')     : 'none';
      var goal      = goalsEl ? (goalsEl.value || 'maintain') : 'maintain';
      var allergies = getChecked('allergies');

      var bmr      = mifflinStJeor({ sex: sex, weightKg: weight, heightCm: height, age: age });
      var tdee     = bmr * activity;
      var plan     = buildWeek(age, activity, diet, allergies);
      var calories = applyGoal(tdee, goal);

      var payload = {
        id:   Date.now().toString(),
        meta: {
          name: name, age: age, sex: sex, height: height, weight: weight,
          activity: activity, diet: diet, goal: goal, allergies: allergies,
          ageGroup: plan[0].ageGroup, activityLabel: plan[0].activityLabel,
          calories: calories, bmr: bmr, tdee: tdee,
          created: new Date().toISOString()
        },
        plan: plan
      };

      save('cp_latest', payload);
      save('cp_profile', {
        name: name, age: age, sex: sex, height: height,
        weight: weight, activity: activity, diet: diet, allergies: allergies
      });
      save('cp_form_draft', {
        name: name, age: age, sex: sex, height: height,
        weight: weight, activity: activity, diet: diet,
        goals: goal, allergies: allergies
      });

      window.location.href = 'result.html';
    });
  }

  // ══════════════════════════════════════════════════════════
  //  PAGE: RESULT
  // ══════════════════════════════════════════════════════════
  var resultsCal    = document.getElementById('results-calorie-summary');
  var resultsTabsEl = document.getElementById('results-day-tabs');
  var resultsPanels = document.getElementById('results-day-panels');

  if (resultsCal && resultsTabsEl) {
    var latest = load('cp_latest', null);
    if (latest && latest.plan && latest.meta) {
      var m2    = latest.meta;
      var bmr2  = m2.bmr  || mifflinStJeor({ sex: m2.sex, weightKg: m2.weight, heightCm: m2.height, age: m2.age });
      var tdee2 = m2.tdee || bmr2 * m2.activity;
      renderCalorieBox(resultsCal, Object.assign({}, m2, { bmr: bmr2, tdee: tdee2 }));
      renderDayTabs(resultsTabsEl, resultsPanels, latest.plan);
      var tw = document.getElementById('results-tabs-wrapper');
      var rb = document.getElementById('results-buttons');
      if (tw) tw.classList.remove('hidden');
      if (rb) rb.classList.remove('hidden');

      var savePlanBtn = document.getElementById('save-plan-2');
      if (savePlanBtn) {
        savePlanBtn.addEventListener('click', function () {
          var saved = load('cp_saved', []);
          var alreadySaved = saved.find(function (s) { return s.id === latest.id; });
          if (!alreadySaved) {
            saved.unshift(latest);
            save('cp_saved', saved);
            toast('✅ Plan saved!');
          } else {
            toast('This plan is already saved.');
          }
          downloadPDF(latest);
        });
      }
    } else {
      resultsCal.className = 'empty-state card';
      resultsCal.innerHTML =
        '<div style="font-size:48px;margin-bottom:12px">🍽️</div>' +
        '<h3>No plan yet</h3>' +
        '<p style="color:#6b7f6b">Fill in the form to create your personalized plan.</p>' +
        '<a href="form.html" class="btn btn-primary" style="margin-top:16px;display:inline-block">Create Meal Plan →</a>';
      resultsCal.classList.remove('hidden');
    }
  }

  // ══════════════════════════════════════════════════════════
  //  PAGE: ALTERNATIVES
  // ══════════════════════════════════════════════════════════
  var altGrid = document.getElementById('alt-grid');
  if (altGrid) {
    var latestAlt    = load('cp_latest', null);
    var allergiesAlt = (latestAlt && latestAlt.meta && latestAlt.meta.allergies
      ? latestAlt.meta.allergies : []).map(function (a) { return a.toLowerCase().trim(); });

    var ALT_DATA = {
      'peanuts':   { icon:'🥜', nutrient:'Protein & Healthy Fats',       sub:'Helps build muscles and supports heart health.',         avoid:'Peanuts, Peanut butter',                         tryInstead:'Sunflower seed butter, Pumpkin seeds, Chia seeds, Hemp seeds, Tahini' },
      'tree nuts': { icon:'🌰', nutrient:'Healthy Fats & Vitamin E',      sub:'Supports brain health and provides essential vitamins.', avoid:'Almonds, Walnuts, Cashews, Pecans, Mixed nuts',  tryInstead:'Sunflower seeds, Pumpkin seeds, Roasted chickpeas, Flaxseeds, Hemp seeds' },
      'dairy':     { icon:'🥛', nutrient:'Calcium & Vitamin D',           sub:'Supports strong bones and teeth.',                       avoid:'Milk, Cheese, Yogurt, Butter, Cream',            tryInstead:'Fortified almond milk, Oat milk, Calcium-set tofu, Broccoli, Kale' },
      'eggs':      { icon:'🥚', nutrient:'Protein & B Vitamins',          sub:'Complete protein, supports energy metabolism.',          avoid:'Eggs, Omelets, Scrambled eggs',                  tryInstead:'Tofu scramble, Chickpea flour dishes, Lentils, Quinoa, Chia seeds' },
      'soy':       { icon:'🫘', nutrient:'Protein & Iron',                sub:'Plant-based complete protein source.',                   avoid:'Tofu, Edamame, Soy milk, Soy sauce',             tryInstead:'Chicken, Turkey, Lentils, Black beans, Chickpeas, Quinoa' },
      'gluten':    { icon:'🌾', nutrient:'Carbohydrates & Fibre',         sub:'Provides energy and supports digestive health.',         avoid:'Bread, Pasta, Wheat, Barley, Rye, Cereals',      tryInstead:'Rice, Quinoa, Certified GF oats, Buckwheat, Corn tortillas, Sweet potatoes' },
      'shellfish': { icon:'🦐', nutrient:'Protein & Zinc',                sub:'Supports immune function and muscle repair.',            avoid:'Shrimp, Crab, Lobster, Scallops',                tryInstead:'Chicken, Turkey, Lentils, Chickpeas' },
      'fish':      { icon:'🐟', nutrient:'Omega-3 Fatty Acids & Protein', sub:'Supports heart and brain health.',                       avoid:'Salmon, Tuna, Cod, Tilapia',                     tryInstead:'Flaxseeds, Chia seeds, Hemp seeds, Avocado, Olive oil, Walnuts' },
      'sesame':    { icon:'🌿', nutrient:'Healthy Fats & Calcium',        sub:'Provides minerals and supports bone health.',            avoid:'Sesame seeds, Tahini, Hummus, Sesame oil',       tryInstead:'Sunflower seeds, Pumpkin seeds, Olive oil, Avocado oil' }
    };

    function buildAltCard(data) {
      var card = document.createElement('div');
      card.className = 'card alt-card';
      card.innerHTML =
        '<div class="alt-card-header">' +
          '<div class="alt-card-icon">' + data.icon + '</div>' +
          '<div><div class="alt-card-title">' + data.nutrient + '</div>' +
          '<div class="alt-card-sub">' + data.sub + '</div></div>' +
        '</div>' +
        '<div class="alt-row">' +
          '<div class="alt-avoid"><div class="alt-label">⚠️ Avoid</div><div>' + data.avoid + '</div></div>' +
          '<div class="alt-try"><div class="alt-label">✅ Try Instead</div><div class="alt-items">' + data.tryInstead + '</div></div>' +
        '</div>';
      return card;
    }

    var tagsEl    = document.getElementById('alt-allergy-tags');
    var displayEl = document.getElementById('alt-allergies-display');
    var noAlEl    = document.getElementById('alt-no-allergies');
    var noteEl    = document.getElementById('alt-note');

    if (!allergiesAlt.length) {
      if (noAlEl) {
        noAlEl.innerHTML =
          '<div style="font-size:48px;margin-bottom:12px">✅</div>' +
          '<h3>No allergens selected!</h3>' +
          '<p style="color:#6b7f6b">Here are some general healthy swaps you might enjoy:</p>';
        noAlEl.classList.remove('hidden');
      }
      [
        { icon:'🥗', nutrient:'More Vegetables',  sub:'Boost micronutrient intake.',         avoid:'Processed snacks',            tryInstead:'Spinach, Kale, Broccoli, Bell peppers, Carrots' },
        { icon:'🌾', nutrient:'Whole Grains',      sub:'Steady energy and better digestion.', avoid:'White bread, White rice',     tryInstead:'Brown rice, Quinoa, Oats, Whole wheat bread' },
        { icon:'💧', nutrient:'Healthy Drinks',    sub:'Stay hydrated, reduce sugar.',        avoid:'Sugary sodas, Energy drinks', tryInstead:'Water, Herbal tea, Green tea, Coconut water' }
      ].forEach(function (d) { altGrid.appendChild(buildAltCard(d)); });
      altGrid.classList.remove('hidden');
    } else {
      if (tagsEl && displayEl) {
        allergiesAlt.forEach(function (a) {
          var tag = document.createElement('span');
          tag.className   = 'allergy-tag';
          tag.textContent = a.charAt(0).toUpperCase() + a.slice(1);
          tagsEl.appendChild(tag);
        });
        displayEl.classList.remove('hidden');
      }
      allergiesAlt.forEach(function (a) {
        var data = ALT_DATA[a];
        if (data) altGrid.appendChild(buildAltCard(data));
      });
      altGrid.classList.remove('hidden');
      if (noteEl) noteEl.classList.remove('hidden');
    }
  }

  // ══════════════════════════════════════════════════════════
  //  PAGE: SAVED
  // ══════════════════════════════════════════════════════════
  var plansUl = document.getElementById('plans-ul');
  if (plansUl) {
    function refreshSaved() {
      plansUl.innerHTML = '';
      var saved = load('cp_saved', []);
      if (!saved.length) {
        plansUl.innerHTML =
          '<li style="padding:32px;text-align:center;color:#6b7f6b;list-style:none">' +
          '<div style="font-size:40px;margin-bottom:8px">📭</div>' +
          '<strong style="display:block;margin-bottom:8px">No saved plans yet.</strong>' +
          // ✅ FIXED
          '<a href="form.html" class="btn btn-primary" style="display:inline-block;max-width:220px">Create Your First Plan →</a></li>';

        return;
      }
      saved.forEach(function (payload, idx) {
        var meta = payload.meta || {};
        var li   = document.createElement('li');
        li.style.cssText = 'list-style:none;margin-bottom:16px;';
        li.innerHTML =
          '<div class="card saved-plan-card" style="padding:20px 24px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">' +
              '<div>' +
                '<div style="font-size:16px;font-weight:700;color:#1b5e20;margin-bottom:4px">' +
                  '🥗 ' + (meta.name ? meta.name + '\'s Plan' : 'Meal Plan') + ' — ' + (meta.calories || 0).toLocaleString() + ' kcal' +
                '</div>' +
                '<div style="font-size:13px;color:#6b7f6b;">' +
                  (meta.diet ? '🥗 ' + meta.diet + ' &nbsp;•&nbsp; ' : '') +
                  (meta.sex  ? '⚧ '  + meta.sex  + ', '             : '') +
                  (meta.age  ? meta.age + ' yrs &nbsp;•&nbsp; '      : '') +
                  (meta.created ? '📅 ' + new Date(meta.created).toLocaleDateString() : '') +
                '</div>' +
              '</div>' +
              '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                '<button class="btn btn-primary btn-sm view-plan-btn" data-idx="' + idx + '">👁 View</button>' +
                '<button class="btn btn-ghost  btn-sm dl-plan-btn"   data-idx="' + idx + '">⬇️ PDF</button>' +
                '<button class="btn btn-ghost  btn-sm del-plan-btn"  data-idx="' + idx + '" style="color:#c62828;">🗑 Delete</button>' +
              '</div>' +
            '</div>' +
            '<div class="saved-plan-detail hidden" id="saved-detail-' + idx + '" style="margin-top:16px;"></div>' +
          '</div>';
        plansUl.appendChild(li);
      });

      // Wire buttons
      $$('.view-plan-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx     = parseInt(btn.getAttribute('data-idx'), 10);
          var saved   = load('cp_saved', []);
          var payload = saved[idx];
          var detail  = document.getElementById('saved-detail-' + idx);
          if (!detail || !payload) return;
          if (!detail.classList.contains('hidden')) {
            detail.classList.add('hidden');
            detail.innerHTML = '';
            btn.textContent  = '👁 View';
            return;
          }
          var tabsEl   = document.createElement('div');
          tabsEl.className = 'day-tabs';
          var panelsEl = document.createElement('div');
          panelsEl.className = 'day-panels';
          detail.innerHTML = '';
          detail.appendChild(tabsEl);
          detail.appendChild(panelsEl);
          renderDayTabs(tabsEl, panelsEl, payload.plan);
          detail.classList.remove('hidden');
          btn.textContent = '▲ Hide';
        });
      });

      $$('.dl-plan-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx   = parseInt(btn.getAttribute('data-idx'), 10);
          var saved = load('cp_saved', []);
          downloadPDF(saved[idx]);
        });
      });

      $$('.del-plan-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('Delete this saved plan? This cannot be undone.')) return;
          var idx   = parseInt(btn.getAttribute('data-idx'), 10);
          var saved = load('cp_saved', []);
          saved.splice(idx, 1);
          save('cp_saved', saved);
          toast('🗑 Plan deleted.');
          refreshSaved();
        });
      });
    }

    refreshSaved();

    var clearAllBtn = document.getElementById('clear-all-btn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', function () {
        if (!confirm('Delete ALL saved plans? This cannot be undone.')) return;
        localStorage.removeItem('cp_saved');
        toast('🗑 All plans cleared.');
        refreshSaved();
      });
    }
  }

  // ══════════════════════════════════════════════════════════
  //  PAGE: PROFILE
  // ══════════════════════════════════════════════════════════
  var profileForm = document.getElementById('profile-form');
  if (profileForm) {

    function showProfileBanner(msg, isSuccess) {
      var banner = document.getElementById('profile-banner');
      if (!banner) return;
      banner.textContent       = msg;
      banner.style.display     = 'block';
      banner.style.background  = isSuccess ? '#e8f5e9' : '#fdecea';
      banner.style.border      = '1px solid ' + (isSuccess ? '#a5d6a7' : '#f5c6c6');
      banner.style.color       = isSuccess ? '#1b5e20' : '#c62828';
      clearTimeout(banner._t);
      banner._t = setTimeout(function () { banner.style.display = 'none'; }, 3500);
    }

    // Load saved profile into form on page load
    var savedProfile = load('cp_profile', null);
    if (savedProfile) {
      var pName     = document.getElementById('p-name');
      var pAge      = document.getElementById('p-age');
      var pSex      = document.getElementById('p-sex');
      var pHeight   = document.getElementById('p-height');
      var pWeight   = document.getElementById('p-weight');
      var pActivity = document.getElementById('p-activity');
      var pDiet     = document.getElementById('p-diet');

      if (pName     && savedProfile.name)     pName.value     = savedProfile.name;
      if (pAge      && savedProfile.age)      pAge.value      = savedProfile.age;
      if (pSex      && savedProfile.sex)      pSex.value      = savedProfile.sex;
      if (pHeight   && savedProfile.height)   pHeight.value   = savedProfile.height;
      if (pWeight   && savedProfile.weight)   pWeight.value   = savedProfile.weight;
      if (pActivity && savedProfile.activity) pActivity.value = savedProfile.activity;
      if (pDiet     && savedProfile.diet)     pDiet.value     = savedProfile.diet;

      if (savedProfile.allergies && savedProfile.allergies.length) {
        var allergySet    = new Set(savedProfile.allergies.map(function (a) { return a.toLowerCase().trim(); }));
        var pAllergiesBox = document.getElementById('p-allergies');
        if (pAllergiesBox) {
          pAllergiesBox.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
            cb.checked = allergySet.has(cb.value.toLowerCase().trim());
          });
        }
      }
    }

    // Save button
    var saveProfileBtn = document.getElementById('save-profile');
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', function () {
        var profileData = {
          name:      (document.getElementById('p-name')     || {}).value || '',
          age:       (document.getElementById('p-age')      || {}).value || '',
          sex:       (document.getElementById('p-sex')      || {}).value || 'Female',
          height:    (document.getElementById('p-height')   || {}).value || '',
          weight:    (document.getElementById('p-weight')   || {}).value || '',
          activity:  (document.getElementById('p-activity') || {}).value || '1.2',
          diet:      (document.getElementById('p-diet')     || {}).value || 'none',
          allergies: []
        };

        var pAllergiesBox = document.getElementById('p-allergies');
        if (pAllergiesBox) {
          pAllergiesBox.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
            profileData.allergies.push(cb.value.toLowerCase().trim());
          });
        }

        if (!profileData.age || isNaN(parseInt(profileData.age, 10))) {
          showProfileBanner('⚠️ Please enter at least your age before saving.', false);
          return;
        }

        save('cp_profile', profileData);
        save('cp_form_draft', {
          name:      profileData.name,
          age:       profileData.age,
          sex:       profileData.sex,
          height:    profileData.height,
          weight:    profileData.weight,
          activity:  profileData.activity,
          diet:      profileData.diet,
          goals:     'maintain',
          allergies: profileData.allergies
        });

        showProfileBanner('✅ Profile saved! Your form will now pre-fill automatically.', true);
        toast('✅ Profile saved!');
      });
    }

    // Clear button
    var clearProfileBtn = document.getElementById('clear-profile');
    if (clearProfileBtn) {
      clearProfileBtn.addEventListener('click', function () {
        if (!confirm('Clear your saved profile? This cannot be undone.')) return;
        localStorage.removeItem('cp_profile');
        localStorage.removeItem('cp_form_draft');
        profileForm.reset();
        showProfileBanner('🗑 Profile cleared.', true);
        toast('Profile cleared.');
      });
    }
  }

})();

