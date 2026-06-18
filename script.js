// ============================================================
//  Personalized Calorie Intake Meal Planner — script.js
// ============================================================
(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // ── Storage helpers ──
  function saveToLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
  function loadFromLocal(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  }

  // ── Math helpers ──
  function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }
  function mifflinStJeor({ sex, weightKg, heightCm, age }) {
    const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    return sex === 'Female' ? base - 161 : base + 5;
  }
  function applyGoal(tdee, goal) {
    const map = { 'maintain':1.0,'mild-loss':0.9,'loss':0.8,'mild-gain':1.1,'gain':1.2 };
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

  // ── Auth helpers ──
  function getCurrentUser() { return loadFromLocal('cp_user', null); }
  function isLoggedIn() { return !!getCurrentUser(); }

  // ── Update nav auth buttons ──
  function updateAuthNav() {
    const user = getCurrentUser();
    // Handle each li wrapper visibility
    const liLogin   = document.getElementById('li-login-btn');
    const liSignup  = document.getElementById('li-signup-btn');
    const liLogout  = document.getElementById('li-logout-btn');
    const liProfile = document.getElementById('li-profile-btn');
    const profileBtn = document.getElementById('nav-profile-btn');

    if (user) {
      if (liLogin)   liLogin.style.display   = 'none';
      if (liSignup)  liSignup.style.display  = 'none';
      if (liLogout)  liLogout.style.display  = 'list-item';
      if (liProfile) liProfile.style.display = 'list-item';
      if (profileBtn) profileBtn.textContent = '👤 ' + (user.name || 'Profile');
    } else {
      if (liLogin)   liLogin.style.display   = 'list-item';
      if (liSignup)  liSignup.style.display  = 'list-item';
      if (liLogout)  liLogout.style.display  = 'none';
      if (liProfile) liProfile.style.display = 'none';
    }
  }

  function openModal(screen) {
    screen = screen || 'auth-choice';
    buildAuthModal();
    showModalScreen(screen);
    document.getElementById('auth-modal').classList.add('open');
    // DO NOT set body overflow — this was breaking scroll
  }

  function closeModal() {
    const m = document.getElementById('auth-modal');
    if (m) m.classList.remove('open');
    // DO NOT touch body overflow
  }


  // ── Mobile nav ──
  const navToggle = $('.nav-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const menu = $('#nav-menu');
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('show');
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.top-nav') && !e.target.closest('.nav-toggle')) {
        $('#nav-menu')?.classList.remove('show');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── Auth modal ──
  function buildAuthModal() {
    if ($('#auth-modal')) return;
    const overlay = document.createElement('div');
    overlay.id = 'auth-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button class="modal-close" id="modal-close-btn" aria-label="Close">✕</button>

        <!-- Choice screen -->
        <div id="auth-choice">
          <div class="modal-logo">🥗</div>
          <h2 id="modal-title">Welcome!</h2>
          <p class="modal-sub">Get personalized meal plans tailored just for you.</p>
          <div class="modal-choice-btns">
            <button class="btn btn-primary btn-lg modal-full-btn" id="choice-signup">✨ Sign Up</button>
            <button class="btn btn-secondary btn-lg modal-full-btn" id="choice-login">🔑 Log In</button>
            <button class="btn btn-ghost modal-full-btn" id="choice-guest">→ Continue as Guest</button>
          </div>
        </div>

        <!-- Sign up form -->
        <div id="auth-signup" class="hidden">
          <h2>Create Account</h2>
          <p class="modal-sub">Join to save and manage your meal plans.</p>
          <div class="modal-form">
            <div class="modal-field">
              <label for="su-name">Full Name</label>
              <input id="su-name" type="text" placeholder="Your name" />
            </div>
            <div class="modal-field">
              <label for="su-email">Email</label>
              <input id="su-email" type="email" placeholder="you@email.com" />
            </div>
            <div class="modal-field">
              <label for="su-password">Password</label>
              <input id="su-password" type="password" placeholder="Create a password" />
            </div>
            <div id="su-error" class="modal-error hidden"></div>
            <button class="btn btn-primary btn-lg modal-full-btn" id="do-signup">Create Account</button>
            <p class="modal-switch">Already have an account? <button class="modal-link" id="switch-to-login">Log in</button></p>
          </div>
        </div>

        <!-- Log in form -->
        <div id="auth-login" class="hidden">
          <h2>Welcome Back</h2>
          <p class="modal-sub">Log in to access your saved plans.</p>
          <div class="modal-form">
            <div class="modal-field">
              <label for="li-email">Email</label>
              <input id="li-email" type="email" placeholder="you@email.com" />
            </div>
            <div class="modal-field">
              <label for="li-password">Password</label>
              <input id="li-password" type="password" placeholder="Your password" />
            </div>
            <div id="li-error" class="modal-error hidden"></div>
            <button class="btn btn-primary btn-lg modal-full-btn" id="do-login">Log In</button>
            <p class="modal-switch">No account? <button class="modal-link" id="switch-to-signup">Sign up</button></p>
          </div>
        </div>

        <!-- Profile view -->
        <div id="auth-profile" class="hidden">
          <div class="modal-logo">👤</div>
          <h2 id="profile-name-display">Your Profile</h2>
          <div id="profile-details" class="profile-details"></div>
          <button class="btn btn-danger modal-full-btn" id="do-logout" style="margin-top:16px">🚪 Log Out</button>
        </div>

      </div>`;
    document.body.appendChild(overlay);

    // Wire close
    $('#modal-close-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    // Choice buttons
    $('#choice-signup').addEventListener('click', () => showModalScreen('auth-signup'));
    $('#choice-login').addEventListener('click',  () => showModalScreen('auth-login'));
    $('#choice-guest').addEventListener('click',  () => {
      saveToLocal('cp_modal_shown', true);
      closeModal();
    });

    // Switch links
    $('#switch-to-login').addEventListener('click',  () => showModalScreen('auth-login'));
    $('#switch-to-signup').addEventListener('click', () => showModalScreen('auth-signup'));

    // Sign up
    $('#do-signup').addEventListener('click', () => {
      const name     = $('#su-name').value.trim();
      const email    = $('#su-email').value.trim();
      const password = $('#su-password').value;
      const errEl    = $('#su-error');
      errEl.classList.add('hidden');

      if (!name)     { showErr(errEl, 'Please enter your name.'); return; }
      if (!email || !email.includes('@')) { showErr(errEl, 'Please enter a valid email.'); return; }
      if (password.length < 6) { showErr(errEl, 'Password must be at least 6 characters.'); return; }

      const users = loadFromLocal('cp_users', []);
      if (users.find(u => u.email === email)) { showErr(errEl, 'An account with this email already exists.'); return; }

      const newUser = { name, email, password, created: new Date().toISOString() };
      users.push(newUser);
      saveToLocal('cp_users', users);
      saveToLocal('cp_user', newUser);
      saveToLocal('cp_modal_shown', true);
      updateAuthNav();
      toast(`✅ Welcome, ${name}!`);
      closeModal();
    });

    // Log in
    $('#do-login').addEventListener('click', () => {
      const email    = $('#li-email').value.trim();
      const password = $('#li-password').value;
      const errEl    = $('#li-error');
      errEl.classList.add('hidden');

      const users = loadFromLocal('cp_users', []);
      const user  = users.find(u => u.email === email && u.password === password);
      if (!user) { showErr(errEl, 'Incorrect email or password.'); return; }

      saveToLocal('cp_user', user);
      saveToLocal('cp_modal_shown', true);
      updateAuthNav();
      toast(`✅ Welcome back, ${user.name}!`);
      closeModal();
    });

    // Log out (inside profile view)
    $('#do-logout').addEventListener('click', () => {
      localStorage.removeItem('cp_user');
      updateAuthNav();
      toast('👋 Logged out.');
      closeModal();
    });
  }

  function showErr(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }

  function showModalScreen(id) {
    ['auth-choice','auth-signup','auth-login','auth-profile'].forEach(s => {
      const el = $(`#${s}`);
      if (el) el.classList.toggle('hidden', s !== id);
    });
  }

  function openModal(screen = 'auth-choice') {
    buildAuthModal();
    showModalScreen(screen);
    $('#auth-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function openProfileModal() {
    buildAuthModal();
    const user = getCurrentUser();
    if (!user) { openModal('auth-login'); return; }
    const nameEl = $('#profile-name-display');
    const detEl  = $('#profile-details');
    if (nameEl) nameEl.textContent = user.name || 'Your Profile';
    if (detEl) {
      const prof = loadFromLocal('cp_profile', {});
      detEl.innerHTML = `
        <div class="profile-row"><span>📧 Email</span><span>${user.email}</span></div>
        <div class="profile-row"><span>👤 Name</span><span>${user.name}</span></div>
        ${prof.age    ? `<div class="profile-row"><span>🎂 Age</span><span>${prof.age}</span></div>` : ''}
        ${prof.height ? `<div class="profile-row"><span>📏 Height</span><span>${prof.height} cm</span></div>` : ''}
        ${prof.weight ? `<div class="profile-row"><span>⚖️ Weight</span><span>${prof.weight} kg</span></div>` : ''}
        ${prof.diet   ? `<div class="profile-row"><span>🥗 Diet</span><span>${prof.diet}</span></div>` : ''}
        ${prof.allergies?.length ? `<div class="profile-row"><span>⚠️ Allergies</span><span>${prof.allergies.join(', ')}</span></div>` : ''}
        <div class="profile-row"><span>📅 Member since</span><span>${new Date(user.created).toLocaleDateString()}</span></div>`;
    }
    showModalScreen('auth-profile');
    $('#auth-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const m = $('#auth-modal');
    if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
  }

  // Wire nav auth buttons (they exist in the DOM already)
  document.addEventListener('click', e => {
    if (e.target.closest('#nav-signup-btn'))  openModal('auth-signup');
    if (e.target.closest('#nav-login-btn'))   openModal('auth-login');
    if (e.target.closest('#nav-profile-btn')) openProfileModal();
    if (e.target.closest('#nav-logout-btn')) {
      localStorage.removeItem('cp_user');
      updateAuthNav();
      toast('👋 Logged out.');
    }
  });

  // Show welcome popup on first visit
  if (!loadFromLocal('cp_modal_shown', false)) {
    setTimeout(() => openModal('auth-choice'), 600);
  }
  updateAuthNav();

  // ── Diet / Allergy filters ──
  function matchesDiet(text, dietPref) {
    if (!dietPref || dietPref === 'none') return true;
    const v = text.toLowerCase();
    const hasMeat   = /chicken|turkey|beef|steak|salmon|tuna|shrimp|fish|sausage|bacon|burger|meatball|lamb|pork/.test(v);
    const hasAnimal = hasMeat || /\begg\b|yogurt|\bmilk\b|cheese|cottage cheese|cream cheese|paneer|halloumi|alfredo|ranch|butter/.test(v);
    if (dietPref === 'vegetarian') return !hasMeat;
    if (dietPref === 'vegan')      return !hasAnimal;
    return true;
  }

  function matchesAllergies(text, allergies) {
    if (!allergies || !allergies.length) return true;
    const v = text.toLowerCase();
    const checks = {
      peanuts:     /peanut/.test(v),
      'tree nuts': /\balmonds?\b|walnuts?|cashews?|mixed nuts|trail mix|pecans?|pistachios?/.test(v),
      dairy:       /yogurt|\bmilk\b|cheese|cottage cheese|cream cheese|paneer|halloumi|alfredo|ranch|\bbutter\b/.test(v),
      eggs:        /\begg\b|omelet|omelette|scrambled eggs|boiled eggs/.test(v),
      soy:         /\btofu\b|edamame|\bsoy\b/.test(v),
      gluten:      /\btoast\b|\bbread\b|sandwich|wrap|\bpasta\b|pizza|bagel|waffles|pancakes|granola|muffin|quesadilla|burrito|noodles|lasagna|cereal|crackers/.test(v),
      shellfish:   /shrimp|crab|lobster|scallop/.test(v),
      fish:        /\bsalmon\b|\btuna\b|\bfish\b/.test(v),
      sesame:      /sesame|hummus/.test(v)
    };
    return !allergies.some(a => checks[a]);
  }

  function filterMeals(options, dietPref, allergies) {
    const filtered = options.filter(o => matchesDiet(o, dietPref) && matchesAllergies(o, allergies));
    // Always return filtered list; if empty fall back to diet-only filter, then all
    if (filtered.length) return filtered;
    const dietOnly = options.filter(o => matchesDiet(o, dietPref));
    return dietOnly.length ? dietOnly : options.slice();
  }

  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ── Meal database ──
  const MEAL_PLANS = {
    'preteens': {
      '1': { activity:'Low', calories:1600,
        breakfasts:['Oatmeal with banana slices and milk','Scrambled eggs with whole wheat toast','Yogurt parfait with granola and berries','Peanut butter toast with apple slices','Whole-grain cereal with milk and strawberries','Egg and cheese breakfast sandwich','Pancakes with fruit salad'],
        lunches:   ['Turkey sandwich with carrots and cucumbers','Chicken rice bowl with veggies','Grilled cheese with tomato soup','Pasta salad with chicken and veggies','Tuna sandwich with apple slices','Cheese quesadilla with salsa and salad','Mini chicken burgers with sweet potato fries'],
        dinners:   ['Baked chicken with rice and green beans','Spaghetti with tomato sauce and salad','Beef tacos with lettuce and cheese','Salmon with mashed potatoes and broccoli','Stir-fry chicken with vegetables and noodles','Homemade pizza with veggie toppings','Turkey meatballs with pasta'],
        snacks:    ['Apple slices with peanut butter','Cheese and crackers','Yogurt cup','Banana smoothie','Orange slices','Trail mix','Fresh berries'] },
      '2': { activity:'Moderate', calories:2000,
        breakfasts:['Avocado toast with scrambled eggs and fruit','Breakfast burrito with eggs and cheese','Oatmeal with nuts, berries, and milk','Whole grain waffles with yogurt','Bagel with cream cheese and strawberries','Smoothie bowl with granola and banana','Egg sandwich with turkey bacon'],
        lunches:   ['Chicken wrap with veggies and hummus','Rice bowl with beef and broccoli','Pasta with grilled chicken and spinach','Turkey burger with roasted potatoes','Tuna pasta salad with vegetables','Cheese and chicken quesadilla with salad','Mac and cheese'],
        dinners:   ['Grilled salmon with rice and asparagus','Chicken Alfredo with broccoli','Beef stir-fry with noodles','Vegetable lasagna','Shrimp tacos with avocado','Baked chicken with sweet potatoes','BBQ chicken with corn'],
        snacks:    ['Greek yogurt','Peanut butter banana smoothie','Granola bar','Cheese stick and grapes','Hard-boiled eggs','Mixed nuts','Fruit and yogurt dip'] },
      '3': { activity:'High', calories:2600,
        breakfasts:['Omelet with toast, fruit, and milk','Pancakes with eggs and turkey sausage','Breakfast sandwich with avocado','Smoothie with oats, banana, and peanut butter','French toast with berries and yogurt','Bagel sandwich with eggs and cheese','Large oatmeal bowl with nuts and fruit'],
        lunches:   ['Chicken burrito bowl with rice and beans','Beef pasta with garlic bread','Turkey sandwich with soup and fruit','Grilled chicken wrap with potatoes','Salmon rice bowl with vegetables','Mac and cheese with chicken pieces','Meatball sub with salad'],
        dinners:   ['Steak with mashed potatoes and vegetables','Chicken stir-fry with rice','Baked salmon with pasta salad','Beef tacos with rice and beans','Chicken parmesan with spaghetti','Homemade pizza with chicken toppings','Shrimp fried rice with vegetables'],
        snacks:    ['Protein smoothie','Protein bar','Trail mix','Cheese cubes and crackers','Yogurt parfait','String cheese','Banana'] }
    },
    'teens': {
      '1': { activity:'Low', calories:2000,
        breakfasts:['Whole grain toast with eggs and fruit','Yogurt with granola and berries','Scrambled eggs and toast','Egg wrap with cheese','Avocado toast','Oatmeal with peanut butter and banana'],
        lunches:   ['Turkey sandwich with veggies','Chicken Caesar wrap','Pasta salad with tuna','Rice bowl with chicken and vegetables','Grilled cheese with soup','Burrito bowl with beans and rice','Veggie pizza with salad'],
        dinners:   ['Grilled chicken with roasted vegetables','Beef tacos with rice','Spaghetti with marinara','Tacos with black beans','Stir-fry noodles with chicken','Salmon with quinoa and broccoli','Chicken fajitas with peppers'],
        snacks:    ['Apple slices with peanut butter','Yogurt cup','Granola bar','Fruit cup','Crackers and cheese','Fruit smoothie','Popcorn'] },
      '2': { activity:'Moderate', calories:2400,
        breakfasts:['Avocado toast with eggs and fruit','Protein pancakes','Protein smoothie with oats','Greek yogurt parfait','Waffles with yogurt and berries','Breakfast sandwich','French toast'],
        lunches:   ['Chicken burrito bowl','Pasta with grilled chicken and vegetables','Turkey burger with sweet potato fries','Steak salad','Rice bowl with beef and broccoli','Chicken quesadilla with salsa','Quinoa bowl'],
        dinners:   ['Steak with potatoes and vegetables','Salmon with rice and asparagus','Chicken Alfredo pasta','Beef stir-fry with noodles','Shrimp tacos with avocado','Chicken parmesan with spaghetti','Vegetable lasagna'],
        snacks:    ['Trail mix','Protein bar','Banana smoothie','Boiled eggs','Greek yogurt with berries','Fruit bowl','Hummus and veggies'] },
      '3': { activity:'High', calories:3300,
        breakfasts:['Large omelet with toast and fruit','Pancakes with eggs and sausage','Bagel sandwich with eggs and cheese','French toast with yogurt','Breakfast burrito','Oatmeal with nuts, fruit, and milk','Cereal with milk'],
        lunches:   ['Steak sandwich','Chicken pasta with garlic bread','Pasta with chicken','Turkey club sandwich with soup','Beef burrito','Salmon rice bowl with avocado','Mac and cheese with grilled chicken'],
        dinners:   ['Steak with rice and vegetables','Chicken pasta','Salmon and rice','Beef tacos','Shrimp fried rice','Baked chicken with mashed potatoes','Grilled chicken with veggies'],
        snacks:    ['Protein shake','Cheese and crackers','Mixed nuts','Chocolate banana','Fruit smoothie','Yogurt','Granola'] }
    },
    'young-adults': {
      '1': { activity:'Low', calories:2400,
        breakfasts:['Avocado toast with poached eggs','Greek yogurt parfait with fruit','Whole grain waffles with peanut butter','Berry smoothie','Whole-grain cereal','Breakfast wrap with spinach','Pancakes with fruit'],
        lunches:   ['Chicken salad','Rice bowl with salmon and vegetables','Quinoa and veggies','Pasta with grilled chicken','Veggie wrap','Burrito bowl with beans and avocado','Chicken quesadilla with salad'],
        dinners:   ['Grilled salmon with quinoa','Stir-fry chicken','Steak with sweet potatoes','Turkey meatballs with spaghetti','Beef tacos','Baked chicken with vegetables','Veggie chili'],
        snacks:    ['Fruit and nuts','Yogurt','Cucumbers and ranch','Cheese and crackers','Smoothie','Hard-boiled egg','Rice cakes'] },
      '2': { activity:'Moderate', calories:2600,
        breakfasts:['Protein pancakes','Breakfast burrito with eggs and cheese','Egg scramble','Cereal with nuts','Protein smoothie with oats and berries','French toast with strawberries','Avocado toast'],
        lunches:   ['Grilled chicken wrap','Turkey burger with roasted potatoes','Pasta salad','Chicken burrito bowl','Rice bowl','Chicken quinoa bowl','Veggie tacos'],
        dinners:   ['Steak with mashed potatoes','Chicken Alfredo pasta','Salmon quinoa','Turkey meatballs','Homemade pizza with vegetables','Vegetable lasagna','Chicken parmesan'],
        snacks:    ['Protein shake','Trail mix','Greek yogurt','Banana','Fruit smoothie','Cheese and crackers','Peanut butter toast'] },
      '3': { activity:'High', calories:3500,
        breakfasts:['Large breakfast platter with eggs, toast, fruit, and potatoes','Peanut butter banana smoothie with oats','Blueberry pancakes','Breakfast burrito','Bagel and eggs','French toast','Cereal'],
        lunches:   ['Steak bowl','Chicken pasta','Salmon salad','Chicken Alfredo with garlic bread','Tuna sandwich','Pasta with chicken','Quinoa power bowl'],
        dinners:   ['Steak with rice and roasted vegetables','Chicken stir-fry','Baked salmon with mashed potatoes','Beef tacos','Turkey burger with fries','Shrimp pasta','BBQ chicken'],
        snacks:    ['Protein bar','Smoothie','Mixed nuts','PB&J sandwich','Cheese and crackers','Granola','Trail mix'] }
    },
    'middle-aged-adults': {
      '1': { activity:'Low', calories:2200,
        breakfasts:['Oatmeal with berries and nuts','Greek yogurt parfait','Avocado toast with eggs','Smoothie','Whole-grain cereal','Egg scramble','Fruit and granola'],
        lunches:   ['Grilled chicken salad','Quinoa bowl','Turkey sandwich with salad','Vegetable soup','Grilled cheese','Veggie wrap','Pasta with vegetables and chicken'],
        dinners:   ['Grilled chicken with quinoa','Stir-fry tofu with vegetables','Grilled chicken with salad','Vegetable curry with rice','Beef stir-fry with vegetables','Pasta primavera','Baked chicken with rice'],
        snacks:    ['Fruit and nuts','Greek yogurt','Hummus and veggies','Cheese and crackers','Smoothie','Granola bar','Rice cakes'] },
      '2': { activity:'Moderate', calories:2400,
        breakfasts:['Protein pancakes','Smoothie bowl','Eggs and a muffin','Oatmeal with berries and nuts','Bagel with cream cheese and fruit','Waffles with yogurt and berries','Breakfast burrito'],
        lunches:   ['Chicken Caesar wrap','Salmon salad','Beef rice bowl with vegetables','Veggie bowl','Burrito bowl with avocado','Grilled chicken sandwich','Chicken quesadilla with salsa'],
        dinners:   ['Chicken fajitas','Steak with sweet potatoes','Salmon quinoa','Beef tacos with beans','Turkey meatballs','Vegetable lasagna','BBQ chicken'],
        snacks:    ['Trail mix','Protein shake','Greek yogurt','Nuts','Fruit smoothie','Cheese and crackers','Boiled eggs'] },
      '3': { activity:'High', calories:3200,
        breakfasts:['Omelette with toast and fruit','Protein smoothie','French toast','Breakfast sandwich with eggs and cheese','Peanut butter toast','Bagel and eggs','Oatmeal with nuts and berries'],
        lunches:   ['Steak salad','Chicken pasta','Salmon bowl','Beef burrito','Meatball sub with salad','Mac and cheese with grilled chicken','Quinoa chicken bowl'],
        dinners:   ['Steak with veggies','Chicken stir-fry','Baked salmon with mashed potatoes','Beef burgers with roasted potatoes','Chicken parmesan with spaghetti','Turkey taco','Baked fish with veggies'],
        snacks:    ['Protein shake','Cheese and fruit','Mixed nuts','Smoothie','Granola','Peanut butter banana','Fruit cup'] }
    },
    'older-adults': {
      '1': { activity:'Low', calories:1800,
        breakfasts:['Oatmeal with banana slices','Greek yogurt with berries and granola','Whole-grain toast and scrambled eggs','Smoothie','Cereal with milk and fruit','Fruit and nuts','French toast with fruit'],
        lunches:   ['Chicken soup','Vegetable stir-fry with rice','Tuna salad','Quinoa bowl','Veggie wrap','Pasta with marinara','Turkey sandwich'],
        dinners:   ['Spaghetti and meatballs','Grilled chicken with salad','Veggie tacos','Stir-fry tofu and vegetables','Soup and caesar salad','Baked salmon','Grilled chicken with roasted vegetables'],
        snacks:    ['Fresh fruit','Greek yogurt','Hummus and carrots','Mixed berries','Cucumbers and ranch','Fruit bowl','Smoothie'] },
      '2': { activity:'Moderate', calories:2200,
        breakfasts:['Egg and avocado toast','Oatmeal with almonds and berries','Smoothie','Waffles with yogurt','Breakfast burrito','Pancakes with fruit','Bagel with cream cheese and fruit'],
        lunches:   ['Salmon salad','Chicken Caesar wrap','Quinoa and veggies','Turkey sandwich','Pasta salad','Burrito bowl with avocado','Veggie soup'],
        dinners:   ['Grilled salmon','Chicken stir-fry','Pasta primavera','Beef tacos','Homemade pizza','Turkey meatballs','Vegetable lasagna'],
        snacks:    ['Trail mix','Greek yogurt','Nuts','Smoothie','Boiled eggs','Fruit cup','Protein bar'] },
      '3': { activity:'High', calories:3000,
        breakfasts:['Large omelet with toast and fruit','Protein smoothie','French toast','Breakfast burrito','Pancakes with sausage','Bagel and eggs','Oatmeal with nuts and berries'],
        lunches:   ['Steak salad','Chicken pasta with garlic bread','Salmon rice bowl with vegetables','Beef burrito','Mac and cheese with grilled chicken','Shrimp salad','Quinoa power bowl'],
        dinners:   ['Steak with vegetables','Chicken parmesan with spaghetti','Salmon and rice','Beef tacos','Shrimp pasta','Turkey burger','Baked fish'],
        snacks:    ['Protein shake','Smoothie','Mixed nuts','Cucumbers and ranch dip','Granola','Fruit cup','Trail mix'] }
    }
  };

  function buildDayMeals(age, activity, dietPref, allergies) {
    const group  = getAgeGroup(age);
    const choice = getActivityChoice(parseFloat(activity));
    const menu   = MEAL_PLANS[group.key][choice];

    const bPool = filterMeals(menu.breakfasts, dietPref, allergies);
    const lPool = filterMeals(menu.lunches,    dietPref, allergies);
    const dPool = filterMeals(menu.dinners,    dietPref, allergies);
    const sPool = filterMeals(menu.snacks,     dietPref, allergies);

    const snack1 = pickRandom(sPool);
    const remaining = sPool.filter(s => s !== snack1);
    const snack2 = remaining.length ? pickRandom(remaining) : snack1;

    return {
      ageGroup:      group.label,
      activityLabel: menu.activity,
      calories:      menu.calories,
      breakfast:     pickRandom(bPool),
      lunch:         pickRandom(lPool),
      dinner:        pickRandom(dPool),
      snacks:        [snack1, snack2]
    };
  }

  function buildWeekPlan(age, activity, dietPref, allergies) {
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    return days.map(day => ({ day, ...buildDayMeals(age, activity, dietPref, allergies) }));
  }

  // ── Render calorie summary ──
  function renderCalorieBox(container, ctx) {
    const { name, sex, age, height, weight, ageGroup, activityLabel, calories, bmr, tdee } = ctx;
    container.className = 'calorie-summary-box';
    container.innerHTML = `
      <div class="cal-main">
        <div class="calorie-big">${calories.toLocaleString()}</div>
        <div class="calorie-label">Recommended Daily Calories</div>
      </div>
      <div class="calorie-divider"></div>
      <div class="calorie-meta">
        ${name ? `<span>👤 <strong>${name}</strong></span>` : ''}
        <span>⚧ ${sex}, ${age} yrs</span>
        <span>📏 ${height} cm &nbsp;•&nbsp; ⚖️ ${weight} kg</span>
        <span>🏃 ${activityLabel} activity &nbsp;•&nbsp; 👥 ${ageGroup}</span>
      </div>
      <div class="calorie-divider"></div>
      <div class="calorie-stats">
        <div class="cal-stat">
          <div class="cal-stat-val">${Math.round(bmr)}</div>
          <div class="cal-stat-lbl">BMR (kcal)</div>
        </div>
        <div class="cal-stat">
          <div class="cal-stat-val">${Math.round(tdee)}</div>
          <div class="cal-stat-lbl">TDEE (kcal)</div>
        </div>
        <div class="cal-stat">
          <div class="cal-stat-val">${calories.toLocaleString()}</div>
          <div class="cal-stat-lbl">Goal Target</div>
        </div>
      </div>`;
    container.classList.remove('hidden');
  }

  // ── Render day tabs ──
  const MEAL_COLORS = {
    breakfast: { bg:'#fff3e0', border:'#ffcc80', icon:'🌅', label:'Breakfast' },
    lunch:     { bg:'#e3f2fd', border:'#90caf9', icon:'☀️', label:'Lunch'     },
    dinner:    { bg:'#f3e5f5', border:'#ce93d8', icon:'🌙', label:'Dinner'    },
    snacks:    { bg:'#e8f5e9', border:'#a5d6a7', icon:'🍎', label:'Snacks'    }
  };

  function renderDayTabs(tabsEl, panelsEl, plan) {
    tabsEl.innerHTML = panelsEl.innerHTML = '';
    plan.forEach(({ day, breakfast, lunch, dinner, snacks }, i) => {
      const btn = document.createElement('button');
      btn.className = 'day-tab' + (i === 0 ? ' active' : '');
      btn.innerHTML = `<span class="tab-day-short">${day.slice(0,3)}</span><span class="tab-day-full">${day}</span>`;
      btn.setAttribute('role','tab');
      btn.setAttribute('aria-selected', String(i === 0));
      btn.addEventListener('click', () => {
        $$('.day-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
        $$('.day-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        btn.setAttribute('aria-selected','true');
        $(`#panel-${i}`).classList.add('active');
      });
      tabsEl.appendChild(btn);

      const meals = [
        { key:'breakfast', text: breakfast },
        { key:'lunch',     text: lunch     },
        { key:'dinner',    text: dinner    },
        { key:'snacks',    text: snacks.join(' • ') }
      ];

      const panel = document.createElement('div');
      panel.className = 'day-panel' + (i === 0 ? ' active' : '');
      panel.id = `panel-${i}`;
      panel.setAttribute('role','tabpanel');
      panel.innerHTML = `
        <div class="day-panel-header">
          <h4>📅 ${day}'s Meal Plan</h4>
          <span class="day-panel-badge">${plan[i].calories?.toLocaleString() || ''} kcal/day</span>
        </div>
        <div class="meals-grid">
          ${meals.map(m => {
            const c = MEAL_COLORS[m.key];
            return `
              <div class="meal-item" style="background:${c.bg};border-color:${c.border}">
                <div class="meal-icon" style="background:${c.border}">${c.icon}</div>
                <div class="meal-info">
                  <div class="meal-type">${c.label}</div>
                  <div class="meal-name">${m.text}</div>
                </div>
              </div>`;
          }).join('')}
        </div>`;
      panelsEl.appendChild(panel);
    });
  }

  function getCheckedValues(name) {
    return $$(`input[name="${name}"]:checked`).map(i => i.value.toLowerCase());
  }

  // ── Toast ──
  function toast(msg) {
    let el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
  }

  // ── PDF Download ──
  function downloadPlanAsPDF(payload) {
    if (!payload) { toast('No plan to download.'); return; }
    const { meta, plan } = payload;
    const win = window.open('', '_blank');
    const styles = `
      body{font-family:Arial,sans-serif;margin:32px;color:#1a2e1a}
      h1{color:#2e7d32;border-bottom:3px solid #4caf50;padding-bottom:8px}
      h2{color:#1b5e20;margin-top:24px;font-size:16px}
      .meta{background:#e8f5e9;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:14px}
      .day{page-break-inside:avoid;margin-bottom:20px;border:1px solid #d0e8d0;border-radius:8px;overflow:hidden}
      .day-title{background:#2e7d32;color:#fff;padding:10px 16px;font-weight:700;font-size:15px}
      .meal-row{padding:8px 16px;border-bottom:1px solid #e8f5e9;font-size:14px}
      .meal-row:last-child{border-bottom:none}
      .meal-label{font-weight:700;color:#2e7d32;display:inline-block;width:90px}
      .footer{margin-top:32px;font-size:12px;color:#6b7f6b;border-top:1px solid #d0e8d0;padding-top:12px}
    `;
    const rows = plan.map(d => `
      <div class="day">
        <div class="day-title">📅 ${d.day}</div>
        <div class="meal-row"><span class="meal-label">🌅 Breakfast</span> ${d.breakfast}</div>
        <div class="meal-row"><span class="meal-label">☀️ Lunch</span> ${d.lunch}</div>
        <div class="meal-row"><span class="meal-label">🌙 Dinner</span> ${d.dinner}</div>
        <div class="meal-row"><span class="meal-label">🍎 Snacks</span> ${d.snacks.join(' • ')}</div>
      </div>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>7-Day Meal Plan</title>
      <style>${styles}</style></head><body>
      <h1>🥗 Your 7-Day Personalized Meal Plan</h1>
      <div class="meta">
        <strong>Name:</strong> ${meta.name || '—'} &nbsp;|&nbsp;
        <strong>Daily Target:</strong> ${meta.calories?.toLocaleString()} kcal &nbsp;|&nbsp;
        <strong>Age Group:</strong> ${meta.ageGroup} &nbsp;|&nbsp;
        <strong>Activity:</strong> ${meta.activityLabel} &nbsp;|&nbsp;
        <strong>Diet:</strong> ${meta.diet} &nbsp;|&nbsp;
        <strong>Generated:</strong> ${new Date(meta.created).toLocaleDateString()}
      </div>
      ${rows}
      <div class="footer">Generated by Personalized Calorie Intake Meal Planner • ${new Date().toLocaleDateString()}</div>
      </body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  }

  function savePlanToList(payload) {
    if (!payload) { toast('No plan to save.'); return; }
    const all = loadFromLocal('cp_saved', []);
    all.unshift({ ...payload, id: crypto.randomUUID() });
    saveToLocal('cp_saved', all);
    toast('✅ Plan saved!');
  }

  // ==========================================================
  //  PAGE: FORM (form.html)
  // ==========================================================
  const plannerForm = $('#planner-form');
  if (plannerForm) {
    // Pre-fill from profile — preserve form data on back navigation
    const savedFormData = loadFromLocal('cp_form_draft', null);
    const prof = loadFromLocal('cp_profile', null);
    const prefill = savedFormData || prof;
    if (prefill) {
      ['name','age','sex','height','weight','activity','diet','goals'].forEach(id => {
        const el = document.getElementById(id);
        if (el && prefill[id] != null) el.value = prefill[id];
      });
      const allergySet = new Set((prefill.allergies || []).map(a => a.toLowerCase()));
      $$('input[name="allergies"]').forEach(cb => { cb.checked = allergySet.has(cb.value); });
    }

    // Save draft on any change so back button restores it
    plannerForm.addEventListener('change', () => {
      const draft = {
        name:     $('#name')?.value,
        age:      $('#age')?.value,
        sex:      $('#sex')?.value,
        height:   $('#height')?.value,
        weight:   $('#weight')?.value,
        activity: $('#activity')?.value,
        diet:     $('#diet')?.value,
        goals:    $('#goals')?.value,
        allergies: getCheckedValues('allergies')
      };
      saveToLocal('cp_form_draft', draft);
    });

    $('#reset-btn')?.addEventListener('click', () => {
      plannerForm.reset();
      localStorage.removeItem('cp_form_draft');
    });

    plannerForm.addEventListener('submit', e => {
      e.preventDefault();
      const name      = $('#name')?.value.trim() || '';
      const age       = clamp(parseInt($('#age').value, 10), 9, 100);
      const sex       = $('#sex').value || 'Female';
      const height    = clamp(parseInt($('#height').value, 10), 120, 230);
      const weight    = clamp(parseFloat($('#weight').value), 30, 250);
      const activity  = parseFloat($('#activity').value || '1.2');
      const diet      = $('#diet').value || 'none';
      const goal      = $('#goals')?.value || 'maintain';
      const allergies = getCheckedValues('allergies');

      const bmr      = mifflinStJeor({ sex, weightKg: weight, heightCm: height, age });
      const tdee     = bmr * activity;
      const weekPlan = buildWeekPlan(age, activity, diet, allergies);
      const calories = applyGoal(tdee, goal);

      const payload = {
        meta: {
          name, age, sex, height, weight, activity, diet, goal, allergies,
          ageGroup:      weekPlan[0].ageGroup,
          activityLabel: weekPlan[0].activityLabel,
          calories, bmr, tdee,
          created: new Date().toISOString()
        },
        plan: weekPlan
      };
      saveToLocal('cp_latest', payload);

      // Save to profile automatically
      saveToLocal('cp_profile', { name, age, sex, height, weight, activity, diet, allergies });
      // Save draft too so back button works
      saveToLocal('cp_form_draft', { name, age, sex, height, weight, activity, diet, goals: goal, allergies });

      window.location.href = 'result.html';
    });
  }

  // ==========================================================
  //  PAGE: RESULT (result.html)
  // ==========================================================
  const resultsCal    = $('#results-calorie-summary');
  const resultsTabsWr = $('#results-tabs-wrapper');
  const resultsTabsEl = $('#results-day-tabs');
  const resultsPanels = $('#results-day-panels');

  if (resultsCal && resultsTabsEl) {
    const latest = loadFromLocal('cp_latest', null);
    if (latest) {
      const { meta, plan } = latest;
      const bmr  = meta.bmr  || mifflinStJeor({ sex: meta.sex, weightKg: meta.weight, heightCm: meta.height, age: meta.age });
      const tdee = meta.tdee || bmr * meta.activity;
      renderCalorieBox(resultsCal, { ...meta, bmr, tdee });
      renderDayTabs(resultsTabsEl, resultsPanels, plan);
      resultsTabsWr?.classList.remove('hidden');
      $('#results-buttons')?.classList.remove('hidden');
    } else {
      resultsCal.className = 'empty-state card';
      resultsCal.innerHTML = `
        <div style="font-size:48px;margin-bottom:12px">🍽️</div>
        <h3>No plan yet</h3>
        <p class="muted">Go back and fill in the form to create your personalized plan.</p>
        <a href="form.html" class="btn btn-primary mt-4">Create Meal Plan →</a>`;
      resultsCal.classList.remove('hidden');
    }

    $('#save-plan-2')?.addEventListener('click', () => {
      downloadPlanAsPDF(loadFromLocal('cp_latest'));
    });
    $('#download-plan-2')?.addEventListener('click', () => {
      downloadPlanAsPDF(loadFromLocal('cp_latest'));
    });
  }

  // ==========================================================
  //  PAGE: ALTERNATIVES (alternatives.html)
  // ==========================================================
  const altGrid = $('#alt-grid');
  if (altGrid !== null && document.body.contains(altGrid)) {
    const latest    = loadFromLocal('cp_latest', null);
    const allergies = (latest?.meta?.allergies || []).map(a => a.toLowerCase().trim());

    const ALT_DATA = {
      peanuts:     { icon:'🥜', title:'Peanuts',    nutrient:'Protein & Healthy Fats',        sub:'Helps build muscles and supports heart health.',         avoid:'Peanuts, Peanut butter',                                                    tryInstead:'Sunflower seed butter, Pumpkin seeds, Chia seeds, Hemp seeds, Tahini (if no sesame allergy)' },
      'tree nuts': { icon:'🌰', title:'Tree Nuts',  nutrient:'Healthy Fats & Vitamin E',       sub:'Supports brain health and provides essential vitamins.', avoid:'Almonds, Walnuts, Cashews, Pecans, Mixed nuts, Trail mix',                  tryInstead:'Sunflower seeds, Pumpkin seeds, Roasted chickpeas, Flaxseeds, Hemp seeds' },
      dairy:       { icon:'🥛', title:'Dairy',      nutrient:'Calcium & Vitamin D',            sub:'Supports strong bones and teeth.',                       avoid:'Milk, Cheese, Yogurt, Butter, Cream, Alfredo sauce',                        tryInstead:'Fortified almond milk, Fortified oat milk, Calcium-set tofu, Broccoli, Kale, Sesame seeds' },
      eggs:        { icon:'🥚', title:'Eggs',       nutrient:'Protein & B Vitamins',           sub:'Complete protein, supports energy metabolism.',          avoid:'Eggs, Omelets, Scrambled eggs, Egg-based dishes',                           tryInstead:'Tofu scramble, Chickpea flour dishes, Lentils, Quinoa, Chia seeds' },
      soy:         { icon:'🫘', title:'Soy',        nutrient:'Protein & Iron',                 sub:'Plant-based complete protein source.',                   avoid:'Tofu, Edamame, Soy milk, Soy sauce, Tempeh',                               tryInstead:'Chicken, Turkey, Lentils, Black beans, Chickpeas, Quinoa, Hemp seeds' },
      gluten:      { icon:'🌾', title:'Gluten',     nutrient:'Carbohydrates & Fibre',          sub:'Provides energy and supports digestive health.',         avoid:'Bread, Pasta, Wheat, Barley, Rye, Most cereals, Pizza, Wraps',             tryInstead:'Rice, Quinoa, Certified GF oats, Buckwheat, Corn tortillas, Sweet potatoes, GF bread' },
      shellfish:   { icon:'🦐', title:'Shellfish',  nutrient:'Protein & Zinc',                 sub:'Supports immune function and muscle repair.',            avoid:'Shrimp, Crab, Lobster, Scallops, Clams',                                   tryInstead:'Chicken, Turkey, White fish (if no fish allergy), Lentils, Chickpeas' },
      fish:        { icon:'🐟', title:'Fish',       nutrient:'Omega-3 Fatty Acids & Protein',  sub:'Supports heart and brain health.',                       avoid:'Salmon, Tuna, Cod, Tilapia, Fish-based dishes',                            tryInstead:'Flaxseeds, Chia seeds, Hemp seeds, Avocado, Olive oil, Walnuts (if no tree nut allergy)' },
      sesame:      { icon:'🌿', title:'Sesame',     nutrient:'Healthy Fats & Calcium',         sub:'Provides minerals and supports bone health.',            avoid:'Sesame seeds, Tahini, Hummus, Sesame oil',                                  tryInstead:'Sunflower seeds, Pumpkin seeds, Olive oil, Avocado oil, Sunflower seed butter' }
    };

    // Always show the section — show "all safe" note + alternatives regardless
    const tagsEl    = $('#alt-allergy-tags');
    const displayEl = $('#alt-allergies-display');
    const noAllergyEl = $('#alt-no-allergies');
    const noteEl    = $('#alt-note');

    if (allergies.length === 0) {
      // No allergies — show safe message but still show general healthy alternatives
      if (noAllergyEl) {
        noAllergyEl.innerHTML = `
          <div style="font-size:48px;margin-bottom:12px">✅</div>
          <h3 style="margin-bottom:8px">All the foods in your plan are safe for you!</h3>
          <p class="muted">No allergens were selected, so all meals in your plan are suitable.<br>
          Here are some general healthy food alternatives you might enjoy:</p>`;
        noAllergyEl.classList.remove('hidden');
      }
      // Show general alternatives
      const generalAlts = [
        { icon:'🥗', title:'More Vegetables', nutrient:'Vitamins & Minerals', sub:'Boost your micronutrient intake.', avoid:'Processed snacks', tryInstead:'Spinach, Kale, Broccoli, Bell peppers, Zucchini, Carrots' },
        { icon:'🌾', title:'Whole Grains',    nutrient:'Complex Carbohydrates & Fibre', sub:'Steady energy and better digestion.', avoid:'White bread, White rice', tryInstead:'Brown rice, Quinoa, Oats, Whole wheat bread, Barley, Farro' },
        { icon:'💧', title:'Healthy Drinks',  nutrient:'Hydration & Antioxidants', sub:'Stay hydrated and reduce sugar intake.', avoid:'Sugary sodas, Energy drinks', tryInstead:'Water, Herbal tea, Green tea, Infused water, Coconut water' }
      ];
      generalAlts.forEach(data => {
        const card = document.createElement('div');
        card.className = 'card alt-card';
        card.innerHTML = buildAltCardHTML(data);
        altGrid.appendChild(card);
      });
      altGrid.classList.remove('hidden');
    } else {
      // Show allergy tags
      if (tagsEl && displayEl) {
        allergies.forEach(a => {
          const tag = document.createElement('span');
          tag.className   = 'allergy-tag';
          tag.textContent = a.charAt(0).toUpperCase() + a.slice(1);
          tagsEl.appendChild(tag);
        });
        displayEl.classList.remove('hidden');
      }
      // Render alt cards for each allergy
      allergies.forEach(allergen => {
        const data = ALT_DATA[allergen];
        if (!data) return;
        const card = document.createElement('div');
        card.className = 'card alt-card';
        card.innerHTML = buildAltCardHTML(data);
        altGrid.appendChild(card);
      });
      altGrid.classList.remove('hidden');
      if (noteEl) noteEl.classList.remove('hidden');
    }
  }

  function buildAltCardHTML(data) {
    return `
      <div class="alt-card-header">
        <div class="alt-card-icon">${data.icon}</div>
        <div>
          <div class="alt-card-title">${data.nutrient}</div>
          <div class="alt-card-sub">${data.sub}</div>
        </div>
      </div>
      <div class="alt-row">
        <div class="alt-avoid">
          <div class="alt-label">⚠️ Avoid</div>
          <div>${data.avoid}</div>
        </div>
        <div class="alt-try">
          <div class="alt-label">✅ Try Instead</div>
          <div class="alt-items">${data.tryInstead}</div>
        </div>
      </div>`;
  }

  // ==========================================================
  //  PAGE: SAVED (saved.html)
  // ==========================================================
  const plansUl = $('#plans-ul');
  if (plansUl) {
    function refreshSaved() {
      plansUl.innerHTML = '';
      const saved = loadFromLocal('cp_saved', []);
      if (!saved.length) {
        plansUl.innerHTML = '<li style="padding:20px;text-align:center;color:var(--muted)">No saved plans yet.</li>';
        return;
      }
      saved.forEach(p => {
        const li   = document.createElement('li');
        li.className = 'saved-item';
        const date = new Date(p.meta?.created || Date.now()).toLocaleDateString();
        li.innerHTML = `
          <div class="saved-item-info">
            <div class="saved-item-title">🍽️ ${p.meta?.name || 'User'}'s Plan</div>
            <div class="saved-item-sub">${date} • ${p.meta?.calories?.toLocaleString() || '—'} kcal/day • ${p.meta?.ageGroup || ''}</div>
          </div>
          <div class="saved-item-actions">
            <button class="btn btn-secondary btn-sm" data-id="${p.id}" data-act="view">👁 View</button>
            <button class="btn btn-ghost btn-sm"     data-id="${p.id}" data-act="export">⬇ PDF</button>
            <button class="btn btn-danger btn-sm"    data-id="${p.id}" data-act="delete">🗑 Delete</button>
          </div>`;
        plansUl.appendChild(li);
      });
    }
    refreshSaved();
    plansUl.addEventListener('click', e => {
      const btn = e.target.closest('button[data-id]');
      if (!btn) return;
      const { id, act } = btn.dataset;
      const saved = loadFromLocal('cp_saved', []);
      const idx   = saved.findIndex(s => s.id === id);
      if (idx === -1) return;
      if (act === 'view')   { saveToLocal('cp_latest', saved[idx]); location.href = 'result.html'; }
      if (act === 'export') { downloadPlanAsPDF(saved[idx]); }
      if (act === 'delete') {
        if (confirm('Delete this plan?')) {
          saved.splice(idx, 1);
          saveToLocal('cp_saved', saved);
          refreshSaved();
          toast('Plan deleted.');
        }
      }
    });
  }

  // ==========================================================
  //  PAGE: PROFILE (profile.html)
  // ==========================================================
  const profileForm = $('#profile-form');
  if (profileForm) {
    const prof = loadFromLocal('cp_profile', null);
    if (prof) {
      const set = (id, val) => { const el = $(id); if (el && val != null) el.value = val; };
      set('#p-name', prof.name); set('#p-age', prof.age); set('#p-sex', prof.sex);
      set('#p-height', prof.height); set('#p-weight', prof.weight);
      set('#p-activity', prof.activity); set('#p-diet', prof.diet);
      const allergySet = new Set((prof.allergies || []).map(a => a.toLowerCase()));
      $$('#p-allergies input[type="checkbox"]').forEach(cb => { cb.checked = allergySet.has(cb.value); });
    }
    $('#save-profile')?.addEventListener('click', () => {
      const allergies = $$('#p-allergies input[type="checkbox"]:checked').map(cb => cb.value);
      saveToLocal('cp_profile', {
        name:     $('#p-name').value.trim(),
        age:      parseInt($('#p-age').value, 10) || '',
        sex:      $('#p-sex').value || 'Female',
        height:   parseInt($('#p-height').value, 10) || '',
        weight:   parseFloat($('#p-weight').value) || '',
        activity: parseFloat($('#p-activity').value || '1.2'),
        diet:     $('#p-diet').value || 'none',
        allergies
      });
      toast('✅ Profile saved!');
    });
    $('#clear-profile')?.addEventListener('click', () => {
      if (confirm('Clear profile?')) { localStorage.removeItem('cp_profile'); profileForm.reset(); toast('Profile cleared.'); }
    });
  }

  // ==========================================================
  //  FAQ accordion
  // ==========================================================
  $$('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-question');
    if (!btn) return;
    // Start all closed
    item.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close all
      $$('.faq-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-question')?.setAttribute('aria-expanded','false');
      });
      // Toggle open
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded','true');
      }
    });
  });

})();