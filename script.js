// ============================================================
//  Personalized Calorie Intake Meal Planner — script.js
// ============================================================
(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  function saveToLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
  function loadFromLocal(key, fallback) {
    if (fallback === undefined) fallback = null;
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }

  function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }

  function mifflinStJeor(o) {
    var base = (10 * o.weightKg) + (6.25 * o.heightCm) - (5 * o.age);
    return o.sex === 'Female' ? base - 161 : base + 5;
  }

  function applyGoal(tdee, goal) {
    var map = { 'maintain':1.0,'mild-loss':0.9,'loss':0.8,'mild-gain':1.1,'gain':1.2 };
    return Math.round(tdee * (map[goal] || 1));
  }

  function getAgeGroup(age) {
    if (age >= 9  && age <= 13) return { key:'preteens',           label:'Preteens (9–13)' };
    if (age >= 14 && age <= 18) return { key:'teens',              label:'Teens (14–18)' };
    if (age >= 19 && age <= 30) return { key:'young-adults',       label:'Young Adults (19–30)' };
    if (age >= 31 && age <= 50) return { key:'middle-aged-adults', label:'Middle-Aged Adults (31–50)' };
    return                             { key:'older-adults',       label:'Older Adults (51+)' };
  }

  function getActivityChoice(activity) {
    if (activity <= 1.375) return '1';
    if (activity <= 1.55)  return '2';
    return '3';
  }

  // ── Auth ──
  function getCurrentUser() { return loadFromLocal('cp_user', null); }

  function updateAuthNav() {
    var user      = getCurrentUser();
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

  // ── Mobile nav ──
  var navToggle = $('.nav-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      var menu     = $('#nav-menu');
      var expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      if (menu) menu.classList.toggle('show');
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.top-nav') && !e.target.closest('.nav-toggle')) {
        var menu = $('#nav-menu');
        if (menu) menu.classList.remove('show');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── Modal ──
  // Built fresh on open, removed from DOM on close — can never block scroll

  function buildAndOpenModal(screen) {
    var old = document.getElementById('auth-modal');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id        = 'auth-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
        '<button class="modal-close" id="modal-close-btn" aria-label="Close">✕</button>' +

        '<div id="auth-choice" class="hidden">' +
          '<div class="modal-logo">🥗</div>' +
          '<h2 id="modal-title">Welcome!</h2>' +
          '<p class="modal-sub">Get personalized meal plans tailored just for you.</p>' +
          '<div class="modal-choice-btns">' +
            '<button class="btn btn-primary btn-lg modal-full-btn" id="choice-signup">✨ Sign Up</button>' +
            '<button class="btn btn-secondary btn-lg modal-full-btn" id="choice-login">🔑 Log In</button>' +
            '<button class="btn btn-ghost modal-full-btn" id="choice-guest">→ Continue as Guest</button>' +
          '</div>' +
        '</div>' +

        '<div id="auth-signup" class="hidden">' +
          '<h2>Create Account</h2>' +
          '<p class="modal-sub">Join to save and manage your meal plans.</p>' +
          '<div class="modal-form">' +
            '<div class="modal-field"><label for="su-name">Full Name</label>' +
              '<input id="su-name" type="text" placeholder="Your name" autocomplete="name"/></div>' +
            '<div class="modal-field"><label for="su-email">Email</label>' +
              '<input id="su-email" type="email" placeholder="you@email.com" autocomplete="email"/></div>' +
            '<div class="modal-field"><label for="su-password">Password</label>' +
              '<input id="su-password" type="password" placeholder="At least 6 characters" autocomplete="new-password"/></div>' +
            '<div id="su-error" class="modal-error hidden"></div>' +
            '<button class="btn btn-primary btn-lg modal-full-btn" id="do-signup" type="button">Create Account</button>' +
            '<p class="modal-switch">Already have an account? ' +
              '<button class="modal-link" id="switch-to-login" type="button">Log in</button></p>' +
          '</div>' +
        '</div>' +

        '<div id="auth-login" class="hidden">' +
          '<h2>Welcome Back</h2>' +
          '<p class="modal-sub">Log in to access your saved plans.</p>' +
          '<div class="modal-form">' +
            '<div class="modal-field"><label for="li-email">Email</label>' +
              '<input id="li-email" type="email" placeholder="you@email.com" autocomplete="email"/></div>' +
            '<div class="modal-field"><label for="li-password">Password</label>' +
              '<input id="li-password" type="password" placeholder="Your password" autocomplete="current-password"/></div>' +
            '<div id="li-error" class="modal-error hidden"></div>' +
            '<button class="btn btn-primary btn-lg modal-full-btn" id="do-login" type="button">Log In</button>' +
            '<p class="modal-switch">No account? ' +
              '<button class="modal-link" id="switch-to-signup" type="button">Sign up</button></p>' +
          '</div>' +
        '</div>' +

        '<div id="auth-profile" class="hidden">' +
          '<div class="modal-logo">👤</div>' +
          '<h2 id="profile-name-display">Your Profile</h2>' +
          '<div id="profile-details" class="profile-details"></div>' +
          '<button class="btn btn-danger modal-full-btn" id="do-logout" type="button" style="margin-top:16px">🚪 Log Out</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    showModalScreen(screen || 'auth-choice');

    // Double rAF ensures the transition fires after element is painted
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('open');
      });
    });

    // Wire buttons
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

    document.getElementById('choice-signup').addEventListener('click', function () { showModalScreen('auth-signup'); });
    document.getElementById('choice-login').addEventListener('click',  function () { showModalScreen('auth-login'); });
    document.getElementById('choice-guest').addEventListener('click',  function () { saveToLocal('cp_modal_shown', true); closeModal(); });
    document.getElementById('switch-to-login').addEventListener('click',  function () { showModalScreen('auth-login'); });
    document.getElementById('switch-to-signup').addEventListener('click', function () { showModalScreen('auth-signup'); });

    // Sign up
    document.getElementById('do-signup').addEventListener('click', function () {
      var name     = document.getElementById('su-name').value.trim();
      var email    = document.getElementById('su-email').value.trim();
      var password = document.getElementById('su-password').value;
      var errEl    = document.getElementById('su-error');
      errEl.classList.add('hidden');
      if (!name)                          { showErr(errEl, 'Please enter your name.'); return; }
      if (!email || !email.includes('@')) { showErr(errEl, 'Please enter a valid email.'); return; }
      if (password.length < 6)            { showErr(errEl, 'Password must be at least 6 characters.'); return; }
      var users = loadFromLocal('cp_users', []);
      if (users.find(function (u) { return u.email === email; })) {
        showErr(errEl, 'An account with this email already exists.'); return;
      }
      var newUser = { name: name, email: email, password: password, created: new Date().toISOString() };
      users.push(newUser);
      saveToLocal('cp_users', users);
      saveToLocal('cp_user', newUser);
      saveToLocal('cp_modal_shown', true);
      updateAuthNav();
      toast('✅ Welcome, ' + name + '!');
      closeModal();
    });

    // Log in
    document.getElementById('do-login').addEventListener('click', function () {
      var email    = document.getElementById('li-email').value.trim();
      var password = document.getElementById('li-password').value;
      var errEl    = document.getElementById('li-error');
      errEl.classList.add('hidden');
      var users = loadFromLocal('cp_users', []);
      var user  = users.find(function (u) { return u.email === email && u.password === password; });
      if (!user) { showErr(errEl, 'Incorrect email or password.'); return; }
      saveToLocal('cp_user', user);
      saveToLocal('cp_modal_shown', true);
      updateAuthNav();
      toast('✅ Welcome back, ' + user.name + '!');
      closeModal();
    });

    // Log out (inside profile screen)
    document.getElementById('do-logout').addEventListener('click', function () {
      localStorage.removeItem('cp_user');
      updateAuthNav();
      toast('👋 Logged out.');
      closeModal();
    });
  }

  function showErr(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }

  function showModalScreen(id) {
    ['auth-choice','auth-signup','auth-login','auth-profile'].forEach(function (s) {
      var el = document.getElementById(s);
      if (el) el.classList.toggle('hidden', s !== id);
    });
  }

  function closeModal() {
    var m = document.getElementById('auth-modal');
    if (!m) return;
    m.classList.remove('open');
    // Remove from DOM after fade — physically cannot block scroll
    setTimeout(function () {
      var el = document.getElementById('auth-modal');
      if (el) el.remove();
    }, 280);
  }

  function openProfileModal() {
    var user = getCurrentUser();
    if (!user) { buildAndOpenModal('auth-login'); return; }
    buildAndOpenModal('auth-profile');
    setTimeout(function () {
      var nameEl = document.getElementById('profile-name-display');
      var detEl  = document.getElementById('profile-details');
      if (nameEl) nameEl.textContent = user.name || 'Your Profile';
      if (detEl) {
        var prof = loadFromLocal('cp_profile', {});
        detEl.innerHTML =
          '<div class="profile-row"><span>📧 Email</span><span>' + user.email + '</span></div>' +
          '<div class="profile-row"><span>👤 Name</span><span>' + user.name + '</span></div>' +
          (prof.age    ? '<div class="profile-row"><span>🎂 Age</span><span>' + prof.age + '</span></div>' : '') +
          (prof.height ? '<div class="profile-row"><span>📏 Height</span><span>' + prof.height + ' cm</span></div>' : '') +
          (prof.weight ? '<div class="profile-row"><span>⚖️ Weight</span><span>' + prof.weight + ' kg</span></div>' : '') +
          (prof.diet   ? '<div class="profile-row"><span>🥗 Diet</span><span>' + prof.diet + '</span></div>' : '') +
          (prof.allergies && prof.allergies.length ? '<div class="profile-row"><span>⚠️ Allergies</span><span>' + prof.allergies.join(', ') + '</span></div>' : '') +
          '<div class="profile-row"><span>📅 Member since</span><span>' + new Date(user.created).toLocaleDateString() + '</span></div>';
      }
    }, 50);
  }

  // ── THE FIX: wire nav auth clicks by element ID directly ──
  // Using getElementById + direct listeners instead of event delegation
  // This works regardless of whether the element is an <a> or <button>
  function wireAuthNav() {
    var loginBtn   = document.getElementById('nav-login-btn');
    var signupBtn  = document.getElementById('nav-signup-btn');
    var logoutBtn  = document.getElementById('nav-logout-btn');
    var profileBtn = document.getElementById('nav-profile-btn');

    if (loginBtn) loginBtn.addEventListener('click', function (e) {
      e.preventDefault(); buildAndOpenModal('auth-login');
    });
    if (signupBtn) signupBtn.addEventListener('click', function (e) {
      e.preventDefault(); buildAndOpenModal('auth-signup');
    });
    if (logoutBtn) logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      localStorage.removeItem('cp_user');
      updateAuthNav();
      toast('👋 Logged out.');
    });
    if (profileBtn) profileBtn.addEventListener('click', function (e) {
      e.preventDefault(); openProfileModal();
    });
  }
  wireAuthNav();

  // First visit popup
  if (!loadFromLocal('cp_modal_shown', false)) {
    setTimeout(function () { buildAndOpenModal('auth-choice'); }, 800);
  }
  updateAuthNav();

  // ── Snap scroll + dot nav (index.html only) ──
  var snapSections = $$('.snap-section');
  var dotsNav      = document.getElementById('snap-dots');

  if (snapSections.length && dotsNav) {
    // Build dots
    var SECTION_LABELS = ['Home', 'Nutrition', 'Article', 'FAQ', 'About'];
    snapSections.forEach(function (sec, i) {
      var dot = document.createElement('button');
      dot.className   = 'snap-dot';
      dot.title       = SECTION_LABELS[i] || ('Section ' + (i + 1));
      dot.setAttribute('aria-label', SECTION_LABELS[i] || ('Section ' + (i + 1)));
      dot.addEventListener('click', function () {
        sec.scrollIntoView({ behavior: 'smooth' });
      });
      dotsNav.appendChild(dot);
    });

    var dots = $$('.snap-dot');

    function setActiveDot(index) {
      dots.forEach(function (d, i) { d.classList.toggle('active', i === index); });
    }

    // IntersectionObserver — triggers in-view class AND active dot
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var idx = snapSections.indexOf(entry.target);
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          setActiveDot(idx);
        }
      });
    }, { threshold: 0.5 });

    snapSections.forEach(function (sec) { io.observe(sec); });
  }

  // ── Diet / Allergy filters ──
  function matchesDiet(text, dietPref) {
    if (!dietPref || dietPref === 'none' || dietPref === 'non-vegetarian') return true;
    var v = text.toLowerCase();
    var hasMeat   = /chicken|turkey|beef|steak|salmon|tuna|shrimp|fish|sausage|bacon|burger|meatball|lamb|pork/.test(v);
    var hasAnimal = hasMeat || /\begg\b|yogurt|\bmilk\b|cheese|cottage cheese|cream cheese|paneer|alfredo|ranch|\bbutter\b/.test(v);
    if (dietPref === 'vegetarian') return !hasMeat;
    if (dietPref === 'vegan')      return !hasAnimal;
    return true;
  }

  function matchesAllergies(text, allergies) {
    if (!allergies || !allergies.length) return true;
    var v = text.toLowerCase();
    var checks = {
      'peanuts':   /peanut/.test(v),
      'tree nuts': /\balmonds?\b|walnuts?|cashews?|mixed nuts|trail mix|pecans?|pistachios?/.test(v),
      'dairy':     /yogurt|\bmilk\b|cheese|cottage cheese|cream cheese|paneer|alfredo|ranch|\bbutter\b/.test(v),
      'eggs':      /\begg\b|omelet|omelette|scrambled eggs|boiled eggs/.test(v),
      'soy':       /\btofu\b|edamame|\bsoy\b/.test(v),
      'gluten':    /\btoast\b|\bbread\b|sandwich|wrap|\bpasta\b|pizza|bagel|waffles|pancakes|granola|muffin|quesadilla|burrito|noodles|lasagna|cereal|crackers/.test(v),
      'shellfish': /shrimp|crab|lobster|scallop/.test(v),
      'fish':      /\bsalmon\b|\btuna\b|\bfish\b/.test(v),
      'sesame':    /sesame|hummus/.test(v)
    };
    return !allergies.some(function (a) { return checks[a.toLowerCase()]; });
  }

  function filterMeals(options, dietPref, allergies) {
    var filtered = options.filter(function (o) { return matchesDiet(o, dietPref) && matchesAllergies(o, allergies); });
    if (filtered.length) return filtered;
    var dietOnly = options.filter(function (o) { return matchesDiet(o, dietPref); });
    return dietOnly.length ? dietOnly : options.slice();
  }

  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ── Meal database ──
  var MEAL_PLANS = {
    'preteens': {
      '1': { activity:'Low', calories:1600,
        breakfasts:['Oatmeal with banana slices','Scrambled eggs with whole wheat toast','Yogurt parfait with berries','Peanut butter toast with apple slices','Whole-grain cereal with strawberries','Pancakes with fruit salad'],
        lunches:   ['Turkey sandwich with carrots','Chicken rice bowl with veggies','Tomato soup with crackers','Pasta salad with chicken and veggies','Cheese quesadilla with salsa and salad','Mini chicken burgers with sweet potato fries'],
        dinners:   ['Baked chicken with rice and green beans','Spaghetti with tomato sauce and salad','Beef tacos with lettuce','Salmon with mashed potatoes and broccoli','Stir-fry chicken with vegetables','Homemade pizza with veggie toppings','Turkey meatballs with pasta'],
        snacks:    ['Apple slices','Orange slices','Fresh berries','Banana','Fruit cup','Cucumber slices','Melon'] },
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
        dinners:   ['Grilled chicken with roasted vegetables','Beef tacos with rice','Spaghetti with marinara','Stir-fry noodles with chicken','Salmon with quinoa and broccoli','Chicken fajitas with peppers'],
        snacks:    ['Apple slices','Fruit cup','Fruit smoothie','Popcorn','Melon'] },
      '2': { activity:'Moderate', calories:2400,
        breakfasts:['Protein pancakes','Protein smoothie with oats','Waffles with yogurt and berries','French toast'],
        lunches:   ['Chicken burrito bowl','Turkey burger with sweet potato fries','Steak salad','Rice bowl with beef and broccoli','Quinoa bowl'],
        dinners:   ['Steak with potatoes and vegetables','Salmon with rice and asparagus','Chicken Alfredo pasta','Beef stir-fry with noodles','Chicken parmesan with spaghetti','Vegetable lasagna'],
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
        dinners:   ['Grilled salmon with quinoa','Stir-fry chicken','Steak with sweet potatoes','Turkey meatballs with spaghetti','Beef tacos','Baked chicken with vegetables','Veggie chili'],
        snacks:    ['Fruit and nuts','Hummus and veggies','Smoothie','Rice cakes','Fruit cup'] },
      '2': { activity:'Moderate', calories:2600,
        breakfasts:['Protein pancakes','Smoothie bowl','Oatmeal with berries and nuts','French toast with strawberries','Avocado toast'],
        lunches:   ['Grilled chicken wrap','Turkey burger with roasted potatoes','Chicken burrito bowl','Rice bowl','Veggie tacos'],
        dinners:   ['Steak with mashed potatoes','Chicken Alfredo pasta','Salmon quinoa','Turkey meatballs','Homemade pizza with vegetables','Vegetable lasagna','Chicken parmesan'],
        snacks:    ['Banana','Fruit smoothie','Peanut butter toast','Fruit cup'] },
      '3': { activity:'High', calories:3500,
        breakfasts:['Large breakfast platter with eggs and fruit','Peanut butter banana smoothie with oats','Blueberry pancakes','French toast'],
        lunches:   ['Steak bowl','Chicken pasta','Salmon salad','Tuna sandwich','Quinoa power bowl'],
        dinners:   ['Steak with rice and roasted vegetables','Chicken stir-fry','Baked salmon with mashed potatoes','Beef tacos','Turkey burger with fries','Shrimp pasta','BBQ chicken'],
        snacks:    ['Smoothie','Mixed nuts','Granola','Fruit cup'] }
    },
    'middle-aged-adults': {
      '1': { activity:'Low', calories:2200,
        breakfasts:['Oatmeal with berries and nuts','Avocado toast','Smoothie','Whole-grain cereal','Fruit and granola'],
        lunches:   ['Grilled chicken salad','Quinoa bowl','Turkey sandwich with salad','Vegetable soup','Veggie wrap','Pasta with vegetables and chicken'],
        dinners:   ['Grilled chicken with quinoa','Stir-fry tofu with vegetables','Grilled chicken with salad','Vegetable curry with rice','Beef stir-fry with vegetables','Pasta primavera','Baked chicken with rice'],
        snacks:    ['Fruit and nuts','Hummus and veggies','Smoothie','Granola bar','Rice cakes'] },
      '2': { activity:'Moderate', calories:2400,
        breakfasts:['Protein pancakes','Smoothie bowl','Oatmeal with berries and nuts','Waffles with yogurt and berries'],
        lunches:   ['Salmon salad','Beef rice bowl with vegetables','Veggie bowl','Burrito bowl with avocado','Grilled chicken sandwich'],
        dinners:   ['Chicken fajitas','Steak with sweet potatoes','Salmon quinoa','Beef tacos with beans','Turkey meatballs','Vegetable lasagna','BBQ chicken'],
        snacks:    ['Nuts','Fruit smoothie','Boiled eggs','Fruit cup'] },
      '3': { activity:'High', calories:3200,
        breakfasts:['Omelette with fruit','Protein smoothie','French toast','Oatmeal with nuts and berries'],
        lunches:   ['Steak salad','Chicken pasta','Salmon bowl','Beef burrito','Quinoa chicken bowl'],
        dinners:   ['Steak with veggies','Chicken stir-fry','Baked salmon with mashed potatoes','Beef burgers with roasted potatoes','Chicken parmesan with spaghetti','Baked fish with veggies'],
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
        lunches:   ['Salmon salad','Quinoa and veggies','Turkey sandwich','Pasta salad','Burrito bowl with avocado','Veggie soup'],
        dinners:   ['Grilled salmon','Chicken stir-fry','Pasta primavera','Beef tacos','Homemade pizza','Turkey meatballs','Vegetable lasagna'],
        snacks:    ['Nuts','Smoothie','Fruit cup','Granola bar'] },
      '3': { activity:'High', calories:3000,
        breakfasts:['Large omelet with fruit','Protein smoothie','French toast','Oatmeal with nuts and berries'],
        lunches:   ['Steak salad','Chicken pasta','Salmon rice bowl with vegetables','Quinoa power bowl'],
        dinners:   ['Steak with vegetables','Chicken parmesan with spaghetti','Salmon and rice','Beef tacos','Shrimp pasta','Turkey burger','Baked fish'],
        snacks:    ['Smoothie','Mixed nuts','Fruit cup','Granola'] }
    }
  };

  function buildDayMeals(age, activity, dietPref, allergies) {
    var group  = getAgeGroup(age);
    var choice = getActivityChoice(parseFloat(activity));
    var menu   = MEAL_PLANS[group.key][choice];
    var bPool  = filterMeals(menu.breakfasts, dietPref, allergies);
    var lPool  = filterMeals(menu.lunches,    dietPref, allergies);
    var dPool  = filterMeals(menu.dinners,    dietPref, allergies);
    var sPool  = filterMeals(menu.snacks,     dietPref, allergies);
    var snack1 = pickRandom(sPool);
    var remaining = sPool.filter(function (s) { return s !== snack1; });
    var snack2 = remaining.length ? pickRandom(remaining) : snack1;
    return { ageGroup: group.label, activityLabel: menu.activity, calories: menu.calories,
      breakfast: pickRandom(bPool), lunch: pickRandom(lPool),
      dinner: pickRandom(dPool), snacks: [snack1, snack2] };
  }

  function buildWeekPlan(age, activity, dietPref, allergies) {
    var days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    return days.map(function (day) {
      return Object.assign({ day: day }, buildDayMeals(age, activity, dietPref, allergies));
    });
  }

  var MEAL_COLORS = {
    breakfast: { bg:'#fff3e0', border:'#ffcc80', icon:'🌅', label:'Breakfast' },
    lunch:     { bg:'#e3f2fd', border:'#90caf9', icon:'☀️', label:'Lunch'     },
    dinner:    { bg:'#f3e5f5', border:'#ce93d8', icon:'🌙', label:'Dinner'    },
    snacks:    { bg:'#e8f5e9', border:'#a5d6a7', icon:'🍎', label:'Snacks'    }
  };

  function renderCalorieBox(container, ctx) {
    container.className = 'calorie-summary-box';
    container.innerHTML =
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
        '<div class="cal-stat"><div class="cal-stat-val">' + Math.round(ctx.bmr) + '</div><div class="cal-stat-lbl">BMR (kcal)</div></div>' +
        '<div class="cal-stat"><div class="cal-stat-val">' + Math.round(ctx.tdee) + '</div><div class="cal-stat-lbl">TDEE (kcal)</div></div>' +
        '<div class="cal-stat"><div class="cal-stat-val">' + ctx.calories.toLocaleString() + '</div><div class="cal-stat-lbl">Goal Target</div></div>' +
      '</div>';
    container.classList.remove('hidden');
  }

  function renderDayTabs(tabsEl, panelsEl, plan) {
    tabsEl.innerHTML = panelsEl.innerHTML = '';
    plan.forEach(function (dayObj, i) {
      var btn = document.createElement('button');
      btn.className = 'day-tab' + (i === 0 ? ' active' : '');
      btn.innerHTML = '<span class="tab-day-short">' + dayObj.day.slice(0,3) + '</span>' +
                      '<span class="tab-day-full">' + dayObj.day + '</span>';
      btn.setAttribute('role','tab');
      btn.setAttribute('aria-selected', String(i === 0));
      btn.addEventListener('click', function () {
        $$('.day-tab').forEach(function (t) { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
        $$('.day-panel').forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        btn.setAttribute('aria-selected','true');
        document.getElementById('panel-' + i).classList.add('active');
      });
      tabsEl.appendChild(btn);

      var meals = [
        { key:'breakfast', text: dayObj.breakfast },
        { key:'lunch',     text: dayObj.lunch },
        { key:'dinner',    text: dayObj.dinner },
        { key:'snacks',    text: dayObj.snacks.join(' • ') }
      ];
      var panel = document.createElement('div');
      panel.className = 'day-panel' + (i === 0 ? ' active' : '');
      panel.id = 'panel-' + i;
      panel.setAttribute('role','tabpanel');
      panel.innerHTML =
        '<div class="day-panel-header">' +
          '<h4>📅 ' + dayObj.day + '\'s Meal Plan</h4>' +
          '<span class="day-panel-badge">' + (plan[i].calories ? plan[i].calories.toLocaleString() : '') + ' kcal/day</span>' +
        '</div>' +
        '<div class="meals-grid">' +
          meals.map(function (m) {
            var c = MEAL_COLORS[m.key];
            return '<div class="meal-item" style="background:' + c.bg + ';border-color:' + c.border + '">' +
              '<div class="meal-icon" style="background:' + c.border + '">' + c.icon + '</div>' +
              '<div class="meal-info"><div class="meal-type">' + c.label + '</div>' +
              '<div class="meal-name">' + m.text + '</div></div></div>';
          }).join('') +
        '</div>';
      panelsEl.appendChild(panel);
    });
  }

  function getCheckedValues(name) {
    return $$('input[name="' + name + '"]:checked').map(function (i) { return i.value.toLowerCase(); });
  }

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.opacity = '0'; }, 2800);
  }

  function downloadPlanAsPDF(payload) {
    if (!payload) { toast('No plan to download.'); return; }
    var meta = payload.meta, plan = payload.plan;
    var win = window.open('', '_blank');
    if (!win) { toast('Please allow popups to download PDF.'); return; }
    var styles = 'body{font-family:Arial,sans-serif;margin:32px;color:#1a2e1a}h1{color:#2e7d32;border-bottom:3px solid #4caf50;padding-bottom:8px}.meta{background:#e8f5e9;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:14px}.day{page-break-inside:avoid;margin-bottom:20px;border:1px solid #d0e8d0;border-radius:8px;overflow:hidden}.day-title{background:#2e7d32;color:#fff;padding:10px 16px;font-weight:700;font-size:15px}.meal-row{padding:8px 16px;border-bottom:1px solid #e8f5e9;font-size:14px}.meal-row:last-child{border-bottom:none}.meal-label{font-weight:700;color:#2e7d32;display:inline-block;width:90px}.footer{margin-top:32px;font-size:12px;color:#6b7f6b;border-top:1px solid #d0e8d0;padding-top:12px}';
    var rows = plan.map(function (d) {
      return '<div class="day"><div class="day-title">📅 ' + d.day + '</div>' +
        '<div class="meal-row"><span class="meal-label">🌅 Breakfast</span> ' + d.breakfast + '</div>' +
        '<div class="meal-row"><span class="meal-label">☀️ Lunch</span> ' + d.lunch + '</div>' +
        '<div class="meal-row"><span class="meal-label">🌙 Dinner</span> ' + d.dinner + '</div>' +
        '<div class="meal-row"><span class="meal-label">🍎 Snacks</span> ' + d.snacks.join(' • ') + '</div></div>';
    }).join('');
    win.document.write('<!DOCTYPE html><html><head><title>7-Day Meal Plan</title><style>' + styles + '</style></head><body>' +
      '<h1>🥗 Your 7-Day Personalized Meal Plan</h1>' +
      '<div class="meta"><strong>Name:</strong> ' + (meta.name || '—') +
      ' &nbsp;|&nbsp; <strong>Daily Target:</strong> ' + (meta.calories ? meta.calories.toLocaleString() : '') + ' kcal' +
      ' &nbsp;|&nbsp; <strong>Age Group:</strong> ' + meta.ageGroup +
      ' &nbsp;|&nbsp; <strong>Diet:</strong> ' + meta.diet +
      ' &nbsp;|&nbsp; <strong>Generated:</strong> ' + new Date(meta.created).toLocaleDateString() + '</div>' +
      rows +
      '<div class="footer">Generated by Personalized Calorie Intake Meal Planner • ' + new Date().toLocaleDateString() + '</div>' +
      '</body></html>');
    win.document.close();
    setTimeout(function () { win.focus(); win.print(); }, 400);
  }

  // ==========================================================
  //  PAGE: FORM
  // ==========================================================
  var plannerForm = document.getElementById('planner-form');
  if (plannerForm) {
    var savedDraft = loadFromLocal('cp_form_draft', null);
    var prof0      = loadFromLocal('cp_profile', null);
    var prefill    = savedDraft || prof0;
    if (prefill) {
      ['name','age','sex','height','weight','activity','diet','goals'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && prefill[id] != null) el.value = prefill[id];
      });
      var aSet = new Set((prefill.allergies || []).map(function (a) { return a.toLowerCase(); }));
      $$('input[name="allergies"]').forEach(function (cb) { cb.checked = aSet.has(cb.value.toLowerCase()); });
    }

    plannerForm.addEventListener('change', function () {
      saveToLocal('cp_form_draft', {
        name:     (document.getElementById('name')     || {}).value,
        age:      (document.getElementById('age')      || {}).value,
        sex:      (document.getElementById('sex')      || {}).value,
        height:   (document.getElementById('height')   || {}).value,
        weight:   (document.getElementById('weight')   || {}).value,
        activity: (document.getElementById('activity') || {}).value,
        diet:     (document.getElementById('diet')     || {}).value,
        goals:    (document.getElementById('goals')    || {}).value,
        allergies: getCheckedValues('allergies')
      });
    });

    var resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', function () {
      plannerForm.reset();
      localStorage.removeItem('cp_form_draft');
    });

    plannerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name     = document.getElementById('name') ? document.getElementById('name').value.trim() : '';
      var age      = clamp(parseInt(document.getElementById('age').value, 10), 9, 100);
      var sex      = document.getElementById('sex').value || 'Female';
      var height   = clamp(parseInt(document.getElementById('height').value, 10), 120, 230);
      var weight   = clamp(parseFloat(document.getElementById('weight').value), 30, 250);
      var activity = parseFloat(document.getElementById('activity').value || '1.2');
      var diet     = document.getElementById('diet').value || 'none';
      var goal     = (document.getElementById('goals') ? document.getElementById('goals').value : 'maintain') || 'maintain';
      var allergies = getCheckedValues('allergies');

      var bmr      = mifflinStJeor({ sex: sex, weightKg: weight, heightCm: height, age: age });
      var tdee     = bmr * activity;
      var weekPlan = buildWeekPlan(age, activity, diet, allergies);
      var calories = applyGoal(tdee, goal);

      var payload = {
        meta: { name: name, age: age, sex: sex, height: height, weight: weight,
          activity: activity, diet: diet, goal: goal, allergies: allergies,
          ageGroup: weekPlan[0].ageGroup, activityLabel: weekPlan[0].activityLabel,
          calories: calories, bmr: bmr, tdee: tdee, created: new Date().toISOString() },
        plan: weekPlan
      };
      saveToLocal('cp_latest', payload);
      saveToLocal('cp_profile', { name: name, age: age, sex: sex, height: height,
        weight: weight, activity: activity, diet: diet, allergies: allergies });
      saveToLocal('cp_form_draft', { name: name, age: age, sex: sex, height: height,
        weight: weight, activity: activity, diet: diet, goals: goal, allergies: allergies });
      window.location.href = 'result.html';
    });
  }

  // ==========================================================
  //  PAGE: RESULT
  // ==========================================================
  var resultsCal    = document.getElementById('results-calorie-summary');
  var resultsTabsWr = document.getElementById('results-tabs-wrapper');
  var resultsTabsEl = document.getElementById('results-day-tabs');
  var resultsPanels = document.getElementById('results-day-panels');

  if (resultsCal && resultsTabsEl) {
    var latest = loadFromLocal('cp_latest', null);
    if (latest) {
      var meta2 = latest.meta, plan2 = latest.plan;
      var bmr2  = meta2.bmr  || mifflinStJeor({ sex: meta2.sex, weightKg: meta2.weight, heightCm: meta2.height, age: meta2.age });
      var tdee2 = meta2.tdee || bmr2 * meta2.activity;
      renderCalorieBox(resultsCal, Object.assign({}, meta2, { bmr: bmr2, tdee: tdee2 }));
      renderDayTabs(resultsTabsEl, resultsPanels, plan2);
      if (resultsTabsWr) resultsTabsWr.classList.remove('hidden');
      var rb = document.getElementById('results-buttons');
      if (rb) rb.classList.remove('hidden');
    } else {
      resultsCal.className = 'empty-state card';
      resultsCal.innerHTML = '<div style="font-size:48px;margin-bottom:12px">🍽️</div>' +
        '<h3>No plan yet</h3>' +
        '<p class="muted">Fill in the form to create your personalized plan.</p>' +
        '<a href="form.html" class="btn btn-primary mt-4">Create Meal Plan →</a>';
      resultsCal.classList.remove('hidden');
    }
    var sp2 = document.getElementById('save-plan-2');
    if (sp2) sp2.addEventListener('click', function () { downloadPlanAsPDF(loadFromLocal('cp_latest')); });
  }

  // ==========================================================
  //  PAGE: ALTERNATIVES
  // ==========================================================
  var altGrid = document.getElementById('alt-grid');
  if (altGrid) {
    var latestAlt    = loadFromLocal('cp_latest', null);
    var allergiesAlt = (latestAlt && latestAlt.meta && latestAlt.meta.allergies
      ? latestAlt.meta.allergies : []).map(function (a) { return a.toLowerCase().trim(); });

    var ALT_DATA = {
      'peanuts':   { icon:'🥜', nutrient:'Protein & Healthy Fats',       sub:'Helps build muscles and supports heart health.',         avoid:'Peanuts, Peanut butter',                                         tryInstead:'Sunflower seed butter, Pumpkin seeds, Chia seeds, Hemp seeds, Tahini' },
      'tree nuts': { icon:'🌰', nutrient:'Healthy Fats & Vitamin E',      sub:'Supports brain health and provides essential vitamins.', avoid:'Almonds, Walnuts, Cashews, Pecans, Mixed nuts, Trail mix',       tryInstead:'Sunflower seeds, Pumpkin seeds, Roasted chickpeas, Flaxseeds, Hemp seeds' },
      'dairy':     { icon:'🥛', nutrient:'Calcium & Vitamin D',           sub:'Supports strong bones and teeth.',                       avoid:'Milk, Cheese, Yogurt, Butter, Cream, Alfredo sauce',             tryInstead:'Fortified almond milk, Fortified oat milk, Calcium-set tofu, Broccoli, Kale' },
      'eggs':      { icon:'🥚', nutrient:'Protein & B Vitamins',          sub:'Complete protein, supports energy metabolism.',          avoid:'Eggs, Omelets, Scrambled eggs, Egg-based dishes',                tryInstead:'Tofu scramble, Chickpea flour dishes, Lentils, Quinoa, Chia seeds' },
      'soy':       { icon:'🫘', nutrient:'Protein & Iron',                sub:'Plant-based complete protein source.',                   avoid:'Tofu, Edamame, Soy milk, Soy sauce, Tempeh',                     tryInstead:'Chicken, Turkey, Lentils, Black beans, Chickpeas, Quinoa, Hemp seeds' },
      'gluten':    { icon:'🌾', nutrient:'Carbohydrates & Fibre',         sub:'Provides energy and supports digestive health.',         avoid:'Bread, Pasta, Wheat, Barley, Rye, Most cereals, Pizza, Wraps',   tryIn