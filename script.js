// ============================================================
//  Personalized Calorie Intake Meal Planner — script.js
// ============================================================
(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

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
      if (!e.target.closest('.top-nav')) {
        $('#nav-menu')?.classList.remove('show');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── Storage helpers ──
  function saveToLocal(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }
  function loadFromLocal(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }

  // ── Math helpers ──
  function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }

  function mifflinStJeor({ sex, weightKg, heightCm, age }) {
    const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    return sex === 'Female' ? base - 161 : base + 5;
  }

  function applyGoal(tdee, goal) {
    const map = {
      'maintain': 1.0, 'mild-loss': 0.9, 'loss': 0.8,
      'mild-gain': 1.1, 'gain': 1.2
    };
    return Math.round(tdee * (map[goal] || 1));
  }

  function getAgeGroup(age) {
    if (age >= 9  && age <= 13) return { key: 'preteens',           label: 'Preteens (9–13)' };
    if (age >= 14 && age <= 18) return { key: 'teens',              label: 'Teens (14–18)' };
    if (age >= 19 && age <= 30) return { key: 'young-adults',       label: 'Young Adults (19–30)' };
    if (age >= 31 && age <= 50) return { key: 'middle-aged-adults', label: 'Middle-Aged Adults (31–50)' };
    return                             { key: 'older-adults',       label: 'Older Adults (51+)' };
  }

  function getActivityChoice(activity) {
    if (activity <= 1.375) return '1';
    if (activity <= 1.55)  return '2';
    return '3';
  }

  // ── Diet / Allergy filters ──
  function normalizeText(text) { return text.toLowerCase(); }

  function matchesDiet(text, dietPref) {
    if (!dietPref || dietPref === 'none') return true;
    const v = normalizeText(text);
    const hasMeat = /chicken|turkey|beef|steak|salmon|tuna|shrimp|fish|sausage|bacon|burger|meatball/.test(v);
    const hasAnimal = hasMeat || /\begg\b|yogurt|milk|cheese|cottage cheese|cream cheese|paneer|halloumi|alfredo|ranch|butter/.test(v);
    if (dietPref === 'vegetarian') return !hasMeat;
    if (dietPref === 'vegan')      return !hasAnimal;
    return true;
  }

  function matchesAllergies(text, allergies) {
    if (!allergies || !allergies.length) return true;
    const v = normalizeText(text);
    const checks = {
      peanuts:    /peanut/.test(v),
      'tree nuts':/almonds|walnuts|cashews|mixed nuts|trail mix|pecans|pistachios/.test(v),
      dairy:      /yogurt|milk|cheese|cottage cheese|cream cheese|paneer|halloumi|alfredo|ranch|butter/.test(v),
      eggs:       /\begg\b|omelet|omelette|scrambled eggs|boiled eggs/.test(v),
      soy:        /tofu|edamame|\bsoy\b/.test(v),
      gluten:     /toast|bread|sandwich|wrap|pasta|pizza|bagel|waffles|pancakes|granola|muffin|quesadilla|burrito|noodles|lasagna|cereal|crackers/.test(v),
      shellfish:  /shrimp|crab|lobster|scallop/.test(v),
      fish:       /salmon|tuna|\bfish\b/.test(v),
      sesame:     /sesame|hummus/.test(v)
    };
    return !allergies.some(a => checks[a]);
  }

  function filterMeals(options, dietPref, allergies) {
    const filtered = options.filter(o => matchesDiet(o, dietPref) && matchesAllergies(o, allergies));
    return filtered.length ? filtered : options.slice();
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ── Meal database ──
  const MEAL_PLANS = {
    'preteens': {
      '1': { activity: 'Low', calories: 1600,
        breakfasts: ['Oatmeal with banana slices and milk','Scrambled eggs with whole wheat toast','Yogurt parfait with granola and berries','Peanut butter toast with apple slices','Whole-grain cereal with milk and strawberries','Egg and cheese breakfast sandwich','Pancakes with fruit salad'],
        lunches:    ['Turkey sandwich with carrots and cucumbers','Chicken rice bowl with veggies','Grilled cheese with tomato soup','Pasta salad with chicken and veggies','Tuna sandwich with apple slices','Cheese quesadilla with salsa and salad','Mini chicken burgers with sweet potato fries'],
        dinners:    ['Baked chicken with rice and green beans','Spaghetti with tomato sauce and salad','Beef tacos with lettuce and cheese','Salmon with mashed potatoes and broccoli','Stir-fry chicken with vegetables and noodles','Homemade pizza with veggie toppings','Turkey meatballs with pasta'],
        snacks:     ['Apple slices with peanut butter','Cheese and crackers','Yogurt cup','Banana smoothie','Orange slices','Trail mix','Fresh berries'] },
      '2': { activity: 'Moderate', calories: 2000,
        breakfasts: ['Avocado toast with scrambled eggs and fruit','Breakfast burrito with eggs and cheese','Oatmeal with nuts, berries, and milk','Whole grain waffles with yogurt','Bagel with cream cheese and strawberries','Smoothie bowl with granola and banana','Egg sandwich with turkey bacon'],
        lunches:    ['Chicken wrap with veggies and hummus','Rice bowl with beef and broccoli','Pasta with grilled chicken and spinach','Turkey burger with roasted potatoes','Tuna pasta salad with vegetables','Cheese and chicken quesadilla with salad','Mac and cheese'],
        dinners:    ['Grilled salmon with rice and asparagus','Chicken Alfredo with broccoli','Beef stir-fry with noodles','Vegetable lasagna','Shrimp tacos with avocado','Baked chicken with sweet potatoes','BBQ chicken with corn'],
        snacks:     ['Greek yogurt','Peanut butter banana smoothie','Granola bar','Cheese stick and grapes','Hard-boiled eggs','Mixed nuts','Fruit and yogurt dip'] },
      '3': { activity: 'High', calories: 2600,
        breakfasts: ['Omelet with toast, fruit, and milk','Pancakes with eggs and turkey sausage','Breakfast sandwich with avocado','Smoothie with oats, banana, and peanut butter','French toast with berries and yogurt','Bagel sandwich with eggs and cheese','Large oatmeal bowl with nuts and fruit'],
        lunches:    ['Chicken burrito bowl with rice and beans','Beef pasta with garlic bread','Turkey sandwich with soup and fruit','Grilled chicken wrap with potatoes','Salmon rice bowl with vegetables','Mac and cheese with chicken pieces','Meatball sub with salad'],
        dinners:    ['Steak with mashed potatoes and vegetables','Chicken stir-fry with rice','Baked salmon with pasta salad','Beef tacos with rice and beans','Chicken parmesan with spaghetti','Homemade pizza with chicken toppings','Shrimp fried rice with vegetables'],
        snacks:     ['Protein smoothie','Protein bar','Trail mix','Cheese cubes and crackers','Yogurt parfait','String cheese','Banana'] }
    },
    'teens': {
      '1': { activity: 'Low', calories: 2000,
        breakfasts: ['Whole grain toast with eggs and fruit','Yogurt with granola and berries','Scrambled eggs and toast','Egg wrap with cheese','Avocado toast','Oatmeal with peanut butter and banana'],
        lunches:    ['Turkey sandwich with veggies','Chicken Caesar wrap','Pasta salad with tuna','Rice bowl with chicken and vegetables','Grilled cheese with soup','Burrito bowl with beans and rice','Veggie pizza with salad'],
        dinners:    ['Grilled chicken with roasted vegetables','Beef tacos with rice','Spaghetti with marinara','Tacos with black beans','Stir-fry noodles with chicken','Salmon with quinoa and broccoli','Chicken fajitas with peppers'],
        snacks:     ['Apple slices with peanut butter','Yogurt cup','Granola bar','Fruit cup','Crackers and cheese','Fruit smoothie','Popcorn'] },
      '2': { activity: 'Moderate', calories: 2400,
        breakfasts: ['Avocado toast with eggs and fruit','Protein pancakes','Protein smoothie with oats','Greek yogurt parfait','Waffles with yogurt and berries','Breakfast sandwich','French toast'],
        lunches:    ['Chicken burrito bowl','Pasta with grilled chicken and vegetables','Turkey burger with sweet potato fries','Steak salad','Rice bowl with beef and broccoli','Chicken quesadilla with salsa','Quinoa bowl'],
        dinners:    ['Steak with potatoes and vegetables','Salmon with rice and asparagus','Chicken Alfredo pasta','Beef stir-fry with noodles','Shrimp tacos with avocado','Chicken parmesan with spaghetti','Vegetable lasagna'],
        snacks:     ['Trail mix','Protein bar','Banana smoothie','Boiled eggs','Greek yogurt with berries','Fruit bowl','Hummus and veggies'] },
      '3': { activity: 'High', calories: 3300,
        breakfasts: ['Large omelet with toast and fruit','Pancakes with eggs and sausage','Bagel sandwich with eggs and cheese','French toast with yogurt','Breakfast burrito','Oatmeal with nuts, fruit, and milk','Cereal with milk'],
        lunches:    ['Steak sandwich','Chicken pasta with garlic bread','Pasta with chicken','Turkey club sandwich with soup','Beef burrito','Salmon rice bowl with avocado','Mac and cheese with grilled chicken'],
        dinners:    ['Steak with rice and vegetables','Chicken pasta','Salmon and rice','Beef tacos','Shrimp fried rice','Baked chicken with mashed potatoes','Grilled chicken with veggies'],
        snacks:     ['Protein shake','Cheese and crackers','Mixed nuts','Chocolate banana','Fruit smoothie','Yogurt','Granola'] }
    },
    'young-adults': {
      '1': { activity: 'Low', calories: 2400,
        breakfasts: ['Avocado toast with poached eggs','Greek yogurt parfait with fruit','Whole grain waffles with peanut butter','Berry smoothie','Whole-grain cereal','Breakfast wrap with spinach','Pancakes with fruit'],
        lunches:    ['Chicken salad','Rice bowl with salmon and vegetables','Quinoa and veggies','Pasta with grilled chicken','Veggie wrap','Burrito bowl with beans and avocado','Chicken quesadilla with salad'],
        dinners:    ['Grilled salmon with quinoa','Stir-fry chicken','Steak with sweet potatoes','Turkey meatballs with spaghetti','Beef tacos','Baked chicken with vegetables','Veggie chili'],
        snacks:     ['Fruit and nuts','Yogurt','Cucumbers and ranch','Cheese and crackers','Smoothie','Hard-boiled egg','Rice cakes'] },
      '2': { activity: 'Moderate', calories: 2600,
        breakfasts: ['Protein pancakes','Breakfast burrito with eggs and cheese','Egg scramble','Cereal with nuts','Protein smoothie with oats and berries','French toast with strawberries','Avocado toast'],
        lunches:    ['Grilled chicken wrap','Turkey burger with roasted potatoes','Pasta salad','Chicken burrito bowl','Rice bowl','Chicken quinoa bowl','Veggie tacos'],
        dinners:    ['Steak with mashed potatoes','Chicken Alfredo pasta','Salmon quinoa','Turkey meatballs','Homemade pizza with vegetables','Vegetable lasagna','Chicken parmesan'],
        snacks:     ['Protein shake','Trail mix','Greek yogurt','Banana','Fruit smoothie','Cheese and crackers','Peanut butter toast'] },
      '3': { activity: 'High', calories: 3500,
        breakfasts: ['Large breakfast platter with eggs, toast, fruit, and potatoes','Peanut butter banana smoothie with oats','Blueberry pancakes','Breakfast burrito','Bagel and eggs','French toast','Cereal'],
        lunches:    ['Steak bowl','Chicken pasta','Salmon salad','Chicken Alfredo with garlic bread','Tuna sandwich','Pasta with chicken','Quinoa power bowl'],
        dinners:    ['Steak with rice and roasted vegetables','Chicken stir-fry','Baked salmon with mashed potatoes','Beef tacos','Turkey burger with fries','Shrimp pasta','BBQ chicken'],
        snacks:     ['Protein bar','Smoothie','Mixed nuts','PB&J sandwich','Cheese and crackers','Granola','Trail mix'] }
    },
    'middle-aged-adults': {
      '1': { activity: 'Low', calories: 2200,
        breakfasts: ['Oatmeal with berries and nuts','Greek yogurt parfait','Avocado toast with eggs','Smoothie','Whole-grain cereal','Egg scramble','Fruit and granola'],
        lunches:    ['Grilled chicken salad','Quinoa bowl','Turkey sandwich with salad','Vegetable soup','Grilled cheese','Veggie wrap','Pasta with vegetables and chicken'],
        dinners:    ['Grilled chicken with quinoa','Stir-fry tofu with vegetables','Grilled chicken with salad','Vegetable curry with rice','Beef stir-fry with vegetables','Pasta primavera','Baked chicken with rice'],
        snacks:     ['Fruit and nuts','Greek yogurt','Hummus and veggies','Cheese and crackers','Smoothie','Granola bar','Rice cakes'] },
      '2': { activity: 'Moderate', calories: 2400,
        breakfasts: ['Protein pancakes','Smoothie bowl','Eggs and a muffin','Oatmeal with berries and nuts','Bagel with cream cheese and fruit','Waffles with yogurt and berries','Breakfast burrito'],
        lunches:    ['Chicken Caesar wrap','Salmon salad','Beef rice bowl with vegetables','Veggie bowl','Burrito bowl with avocado','Grilled chicken sandwich','Chicken quesadilla with salsa'],
        dinners:    ['Chicken fajitas','Steak with sweet potatoes','Salmon quinoa','Beef tacos with beans','Turkey meatballs','Vegetable lasagna','BBQ chicken'],
        snacks:     ['Trail mix','Protein shake','Greek yogurt','Nuts','Fruit smoothie','Cheese and crackers','Boiled eggs'] },
      '3': { activity: 'High', calories: 3200,
        breakfasts: ['Omelette with toast and fruit','Protein smoothie','French toast','Breakfast sandwich with eggs and cheese','Peanut butter toast','Bagel and eggs','Oatmeal with nuts and berries'],
        lunches:    ['Steak salad','Chicken pasta','Salmon bowl','Beef burrito','Meatball sub with salad','Mac and cheese with grilled chicken','Quinoa chicken bowl'],
        dinners:    ['Steak with veggies','Chicken stir-fry','Baked salmon with mashed potatoes','Beef burgers with roasted potatoes','Chicken parmesan with spaghetti','Turkey taco','Baked fish with veggies'],
        snacks:     ['Protein shake','Cheese and fruit','Mixed nuts','Smoothie','Granola','Peanut butter banana','Fruit cup'] }
    },
    'older-adults': {
      '1': { activity: 'Low', calories: 1800,
        breakfasts: ['Oatmeal with banana slices','Greek yogurt with berries and granola','Whole-grain toast and scrambled eggs','Smoothie','Cereal with milk and fruit','Fruit and nuts','French toast with fruit'],
        lunches:    ['Chicken soup','Vegetable stir-fry with rice','Tuna salad','Quinoa bowl','Veggie wrap','Pasta with marinara','Turkey sandwich'],
        dinners:    ['Spaghetti and meatballs','Grilled chicken with salad','Veggie tacos','Stir-fry tofu and vegetables','Soup and caesar salad','Baked salmon','Grilled chicken with roasted vegetables'],
        snacks:     ['Fresh fruit','Greek yogurt','Hummus and carrots','Mixed berries','Cucumbers and ranch','Fruit bowl','Smoothie'] },
      '2': { activity: 'Moderate', calories: 2200,
        breakfasts: ['Egg and avocado toast','Oatmeal with almonds and berries','Smoothie','Waffles with yogurt','Breakfast burrito','Pancakes with fruit','Bagel with cream cheese and fruit'],
        lunches:    ['Salmon salad','Chicken Caesar wrap','Quinoa and veggies','Turkey sandwich','Pasta salad','Burrito bowl with avocado','Veggie soup'],
        dinners:    ['Grilled salmon','Chicken stir-fry','Pasta primavera','Beef tacos','Homemade pizza','Turkey meatballs','Vegetable lasagna'],
        snacks:     ['Trail mix','Greek yogurt','Nuts','Smoothie','Boiled eggs','Fruit cup','Protein bar'] },
      '3': { activity: 'High', calories: 3000,
        breakfasts: ['Large omelet with toast and fruit','Protein smoothie','French toast','Breakfast burrito','Pancakes with sausage','Bagel and eggs','Oatmeal with nuts and berries'],
        lunches:    ['Steak salad','Chicken pasta with garlic bread','Salmon rice bowl with vegetables','Beef burrito','Mac and cheese with grilled chicken','Shrimp salad','Quinoa power bowl'],
        dinners:    ['Steak with vegetables','Chicken parmesan with spaghetti','Salmon and rice','Beef tacos','Shrimp pasta','Turkey burger','Baked fish'],
        snacks:     ['Protein shake','Smoothie','Mixed nuts','Cucumbers and ranch dip','Granola','Fruit cup','Trail mix'] }
    }
  };

  // ── Build a single day's meals ──
  function buildDayMeals(age, activity, dietPref, allergies) {
    const group  = getAgeGroup(age);
    const choice = getActivityChoice(parseFloat(activity));
    const menu   = MEAL_PLANS[group.key][choice];

    const bPool = filterMeals(menu.breakfasts, dietPref, allergies);
    const lPool = filterMeals(menu.lunches,    dietPref, allergies);
    const dPool = filterMeals(menu.dinners,    dietPref, allergies);
    const sPool = filterMeals(menu.snacks,     dietPref, allergies);

    const snack1 = pickRandom(sPool);
    const snack2 = pickRandom(sPool.filter(s => s !== snack1) || sPool);

    return {
      ageGroup: group.label,
      activityLabel: menu.activity,
      calories: menu.calories,
      breakfast: pickRandom(bPool),
      lunch:     pickRandom(lPool),
      dinner:    pickRandom(dPool),
      snacks:    [snack1, snack2 || snack1]
    };
  }

  // ── Build full 7-day plan ──
  function buildWeekPlan(age, activity, dietPref, allergies) {
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    return days.map(day => ({ day, ...buildDayMeals(age, activity, dietPref, allergies) }));
  }

  // ── Render calorie summary box ──
  function renderCalorieBox(container, ctx) {
    const { name, sex, age, height, weight, ageGroup, activityLabel, calories, bmr, tdee } = ctx;
    container.className = 'calorie-summary-box';
    container.innerHTML = `
      <div>
        <div class="calorie-big">${calories.toLocaleString()}</div>
        <div class="calorie-label">Recommended Daily Calories</div>
      </div>
      <div class="calorie-divider"></div>
      <div class="calorie-meta">
        ${name ? `<span>👤 ${name}</span>` : ''}
        <span>⚧ ${sex}, ${age} yrs</span>
        <span>📏 ${height} cm &nbsp;•&nbsp; ⚖️ ${weight} kg</span>
        <span>🏃 ${activityLabel} activity</span>
        <span>🧬 BMR: ${Math.round(bmr)} kcal &nbsp;•&nbsp; TDEE: ${Math.round(tdee)} kcal</span>
        <span>👥 ${ageGroup}</span>
      </div>
    `;
    container.classList.remove('hidden');
  }

  // ── Render day tabs + panels ──
  function renderDayTabs(tabsEl, panelsEl, plan) {
    tabsEl.innerHTML   = '';
    panelsEl.innerHTML = '';

    const mealIcons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snacks: '🍎' };

    plan.forEach(({ day, breakfast, lunch, dinner, snacks }, i) => {
      // Tab button
      const btn = document.createElement('button');
      btn.className   = 'day-tab' + (i === 0 ? ' active' : '');
      btn.textContent = day.slice(0, 3); // Mon, Tue …
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(i === 0));
      btn.setAttribute('aria-controls', `panel-${i}`);
      btn.addEventListener('click', () => {
        $$('.day-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
        $$('.day-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        $(`#panel-${i}`).classList.add('active');
      });
      tabsEl.appendChild(btn);

      // Panel
      const panel = document.createElement('div');
      panel.className = 'day-panel card' + (i === 0 ? ' active' : '');
      panel.id        = `panel-${i}`;
      panel.setAttribute('role', 'tabpanel');

      const meals = [
        { type: 'Breakfast', icon: mealIcons.breakfast, text: breakfast },
        { type: 'Lunch',     icon: mealIcons.lunch,     text: lunch },
        { type: 'Dinner',    icon: mealIcons.dinner,    text: dinner },
        { type: 'Snacks',    icon: mealIcons.snacks,    text: snacks.join(' • ') }
      ];

      panel.innerHTML = `
        <h4 style="margin:0 0 14px;color:var(--brand-dark);font-size:16px">${day}</h4>
        <div class="meals-grid">
          ${meals.map(m => `
            <div class="meal-item">
              <div class="meal-icon">${m.icon}</div>
              <div class="meal-info">
                <div class="meal-type">${m.type}</div>
                <div class="meal-name">${m.text}</div>
              </div>
            </div>`).join('')}
        </div>`;
      panelsEl.appendChild(panel);
    });
  }

  // ── Get checked checkbox values ──
  function getCheckedValues(name) {
    return $$(`input[name="${name}"]:checked`).map(i => i.value.toLowerCase());
  }

  // ── Toast notification ──
  function toast(msg) {
    let el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 2500);
  }

  // ── Download helper ──
  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ── Save plan to saved list ──
  function savePlanToList(payload) {
    if (!payload) { toast('No plan to save. Generate one first.'); return; }
    const all = loadFromLocal('cp_saved', []);
    all.unshift({ ...payload, id: crypto.randomUUID() });
    saveToLocal('cp_saved', all);
    toast('✅ Plan saved to your browser.');
  }

  // ==========================================================
  //  PAGE: FORM (form.html) — also handles inline on index.html
  // ==========================================================
  const plannerForm = $('#planner-form');
  if (plannerForm) {
    // Pre-fill from saved profile
    const prof = loadFromLocal('cp_profile', null);
    if (prof) {
      ['name','age','sex','height','weight','activity','diet','goals'].forEach(id => {
        const el = document.getElementById(id);
        if (el && prof[id] != null) el.value = prof[id];
      });
      const allergySet = new Set(prof.allergies || []);
      $$('input[name="allergies"]').forEach(cb => { cb.checked = allergySet.has(cb.value); });
    }

    // Reset button
    $('#reset-btn')?.addEventListener('click', () => {
      plannerForm.reset();
      // Hide any inline results (index.html)
      $('#plan-tabs-wrapper')?.classList.add('hidden');
      $('#calorie-summary')?.classList.add('hidden');
      $('#results-actions')?.classList.add('hidden');
    });

    plannerForm.addEventListener('submit', e => {
      e.preventDefault();

      // Gather inputs
      const name     = $('#name')?.value.trim() || '';
      const age      = clamp(parseInt($('#age').value, 10), 9, 100);
      const sex      = $('#sex').value || 'Female';
      const height   = clamp(parseInt($('#height').value, 10), 120, 230);
      const weight   = clamp(parseFloat($('#weight').value), 30, 250);
      const activity = parseFloat($('#activity').value || '1.2');
      const diet     = $('#diet').value || 'none';
      const goal     = $('#goals')?.value || 'maintain';
      const allergies = getCheckedValues('allergies');

      // Calculate calories
      const bmr  = mifflinStJeor({ sex, weightKg: weight, heightCm: height, age });
      const tdee = bmr * activity;

      // Build plan
      const weekPlan      = buildWeekPlan(age, activity, diet, allergies);
      const planCalories  = applyGoal(tdee, goal);
      const ageGroup      = weekPlan[0].ageGroup;
      const activityLabel = weekPlan[0].activityLabel;

      // Persist to localStorage so result.html & alternatives.html can read it
      const payload = {
        meta: { name, age, sex, height, weight, activity, diet, goal, allergies,
                ageGroup, activityLabel, calories: planCalories,
                bmr, tdee, created: new Date().toISOString() },
        plan: weekPlan
      };
      saveToLocal('cp_latest', payload);

      // If we're on form.html → redirect to result.html
      if (window.location.pathname.includes('form.html')) {
        window.location.href = 'result.html';
        return;
      }

      // Otherwise render inline (index.html)
      const calBox      = $('#calorie-summary');
      const tabsWrapper = $('#plan-tabs-wrapper');
      const tabsEl      = $('#day-tabs');
      const panelsEl    = $('#day-panels');

      if (calBox)      renderCalorieBox(calBox, { name, sex, age, height, weight, ageGroup, activityLabel, calories: planCalories, bmr, tdee });
      if (tabsEl && panelsEl) renderDayTabs(tabsEl, panelsEl, weekPlan);
      tabsWrapper?.classList.remove('hidden');

      const altBtn = $('#view-alternatives-btn');
      if (altBtn) altBtn.classList.toggle('hidden', allergies.length === 0);

      $('#results-actions')?.classList.remove('hidden');
    });

    // Inline save / download (index.html)
    $('#save-plan')?.addEventListener('click', () => savePlanToList(loadFromLocal('cp_latest')));
    $('#download-plan')?.addEventListener('click', () => {
      const d = loadFromLocal('cp_latest');
      if (d) downloadJSON(d, `meal-plan-${new Date().toISOString().slice(0,10)}.json`);
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
      renderCalorieBox(resultsCal, {
        name:          meta.name,
        sex:           meta.sex,
        age:           meta.age,
        height:        meta.height,
        weight:        meta.weight,
        ageGroup:      meta.ageGroup,
        activityLabel: meta.activityLabel,
        calories:      meta.calories,
        bmr:           meta.bmr  || mifflinStJeor({ sex: meta.sex, weightKg: meta.weight, heightCm: meta.height, age: meta.age }),
        tdee:          meta.tdee || mifflinStJeor({ sex: meta.sex, weightKg: meta.weight, heightCm: meta.height, age: meta.age }) * meta.activity
      });
      renderDayTabs(resultsTabsEl, resultsPanels, plan);
      resultsTabsWr?.classList.remove('hidden');
      $('#results-buttons')?.classList.remove('hidden');
    } else {
      resultsCal.className = 'card';
      resultsCal.innerHTML = `
        <p style="text-align:center;padding:24px">
          <span style="font-size:36px">🍽️</span><br><br>
          <strong>No plan generated yet.</strong><br>
          <span class="muted">Go back and fill in the form to create your personalized plan.</span><br><br>
          <a href="form.html" class="btn btn-primary">Create Meal Plan →</a>
        </p>`;
      resultsCal.classList.remove('hidden');
    }

    $('#save-plan-2')?.addEventListener('click', () => savePlanToList(loadFromLocal('cp_latest')));
    $('#download-plan-2')?.addEventListener('click', () => {
      const d = loadFromLocal('cp_latest');
      if (d) downloadJSON(d, `meal-plan-${new Date().toISOString().slice(0,10)}.json`);
    });
  }

  // ==========================================================
  //  PAGE: ALTERNATIVES (alternatives.html)
  // ==========================================================
  const altGrid = $('#alt-grid');
  if (altGrid) {
    const latest = loadFromLocal('cp_latest', null);
    const allergies = latest?.meta?.allergies || [];

    // Alternative food data keyed by allergen
    const ALT_DATA = {
      peanuts: {
        icon: '🥜', title: 'Peanuts',
        nutrient: 'Protein & Healthy Fats',
        sub: 'Helps build and repair muscles, supports heart health.',
        avoid: 'Peanuts, Peanut butter',
        tryInstead: 'Sunflower seed butter, Almond butter (if no tree nut allergy), Pumpkin seeds, Chia seeds, Hemp seeds'
      },
      'tree nuts': {
        icon: '🌰', title: 'Tree Nuts',
        nutrient: 'Healthy Fats & Vitamin E',
        sub: 'Supports brain health and provides essential vitamins.',
        avoid: 'Almonds, Walnuts, Cashews, Pecans, Mixed nuts',
        tryInstead: 'Sunflower seeds, Pumpkin seeds, Roasted chickpeas, Flaxseeds, Hemp seeds'
      },
      dairy: {
        icon: '🥛', title: 'Dairy',
        nutrient: 'Calcium & Vitamin D',
        sub: 'Supports strong bones and teeth.',
        avoid: 'Milk, Cheese, Yogurt, Butter, Cream',
        tryInstead: 'Fortified almond milk, Fortified oat milk, Tofu (calcium-set), Broccoli, Kale, Sesame seeds, Fortified soy milk'
      },
      eggs: {
        icon: '🥚', title: 'Eggs',
        nutrient: 'Protein & B Vitamins',
        sub: 'Complete protein source, supports energy metabolism.',
        avoid: 'Eggs, Omelets, Scrambled eggs, Egg-based dishes',
        tryInstead: 'Tofu scramble, Chickpea flour dishes, Lentils, Quinoa, Chia seeds (as binder)'
      },
      soy: {
        icon: '🫘', title: 'Soy',
        nutrient: 'Protein & Iron',
        sub: 'Plant-based complete protein source.',
        avoid: 'Tofu, Edamame, Soy milk, Soy sauce, Tempeh',
        tryInstead: 'Chicken, Turkey, Lentils, Black beans, Chickpeas, Quinoa, Hemp seeds'
      },
      gluten: {
        icon: '🌾', title: 'Gluten',
        nutrient: 'Carbohydrates & Fiber',
        sub: 'Provides energy and supports digestive health.',
        avoid: 'Bread, Pasta, Wheat, Barley, Rye, Most cereals',
        tryInstead: 'Rice, Quinoa, Oats (certified GF), Buckwheat, Corn tortillas, GF bread, Sweet potatoes'
      },
      shellfish: {
        icon: '🦐', title: 'Shellfish',
        nutrient: 'Protein & Zinc',
        sub: 'Supports immune function and muscle repair.',
        avoid: 'Shrimp, Crab, Lobster, Scallops, Clams',
        tryInstead: 'Chicken, Turkey, White fish (if no fish allergy), Lentils, Chickpeas, Tofu (if no soy allergy)'
      },
      fish: {
        icon: '🐟', title: 'Fish',
        nutrient: 'Omega-3 Fatty Acids & Protein',
        sub: 'Supports heart and brain health.',
        avoid: 'Salmon, Tuna, Cod, Tilapia, Fish-based dishes',
        tryInstead: 'Flaxseeds, Chia seeds, Walnuts (if no tree nut allergy), Hemp seeds, Avocado, Olive oil'
      },
      sesame: {
        icon: '🌿', title: 'Sesame',
        nutrient: 'Healthy Fats & Calcium',
        sub: 'Provides minerals and supports bone health.',
        avoid: 'Sesame seeds, Tahini, Hummus, Sesame oil',
        tryInstead: 'Sunflower seeds, Pumpkin seeds, Olive oil, Avocado oil, Sunflower seed butter'
      }
    };

    if (allergies.length === 0) {
      $('#alt-no-allergies')?.classList.remove('hidden');
    } else {
      // Show allergy tags
      const tagsEl = $('#alt-allergy-tags');
      if (tagsEl) {
        allergies.forEach(a => {
          const tag = document.createElement('span');
          tag.className   = 'allergy-tag';
          tag.textContent = a.charAt(0).toUpperCase() + a.slice(1);
          tagsEl.appendChild(tag);
        });
        $('#alt-allergies-display')?.classList.remove('hidden');
      }

      // Render alt cards
      allergies.forEach(allergen => {
        const data = ALT_DATA[allergen];
        if (!data) return;

        const card = document.createElement('div');
        card.className = 'card alt-card';
        card.innerHTML = `
          <div class="alt-card-header">
            <div class="alt-card-icon">${data.icon}</div>
            <div>
              <div class="alt-card-title">${data.nutrient}</div>
              <div class="alt-card-sub">${data.sub}</div>
            </div>
          </div>
          <div class="alt-row">
            <div class="alt-avoid">
              <div class="alt-label">⚠️ Avoid (contains ${data.title})</div>
              <div>${data.avoid}</div>
            </div>
            <div class="alt-try">
              <div class="alt-label">✅ Try Instead</div>
              <div class="alt-items">${data.tryInstead}</div>
            </div>
          </div>`;
        altGrid.appendChild(card);
      });

      altGrid.classList.remove('hidden');
      $('#alt-note')?.classList.remove('hidden');
    }
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
        plansUl.innerHTML = '<li class="muted" style="padding:16px;text-align:center">No saved plans yet. Generate and save a plan first.</li>';
        return;
      }
      saved.forEach(p => {
        const li   = document.createElement('li');
        li.className = 'saved-item';
        const date = new Date(p.meta?.created || Date.now()).toLocaleDateString();
        const name = p.meta?.name || 'User';
        const kcal = p.meta?.calories?.toLocaleString() || '—';
        li.innerHTML = `
          <div class="saved-item-info">
            <div class="saved-item-title">🍽️ ${name}'s Plan</div>
            <div class="saved-item-sub">${date} &nbsp;•&nbsp; ${kcal} kcal/day &nbsp;•&nbsp; ${p.meta?.ageGroup || ''}</div>
          </div>
          <div class="saved-item-actions">
            <button class="btn btn-secondary btn-sm" data-id="${p.id}" data-act="view">👁 View</button>
            <button class="btn btn-ghost btn-sm"     data-id="${p.id}" data-act="export">⬇ Export</button>
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
      const plan  = saved[idx];

      if (act === 'view') {
        saveToLocal('cp_latest', plan);
        window.location.href = 'result.html';
      } else if (act === 'export') {
        downloadJSON(plan, `saved-plan-${plan.id.slice(0,8)}.json`);
      } else if (act === 'delete') {
        if (confirm('Delete this saved plan?')) {
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
      set('#p-name',     prof.name);
      set('#p-age',      prof.age);
      set('#p-sex',      prof.sex);
      set('#p-height',   prof.height);
      set('#p-weight',   prof.weight);
      set('#p-activity', prof.activity);
      set('#p-diet',     prof.diet);
      const allergySet = new Set((prof.allergies || []).map(a => a.toLowerCase()));
      $$('#p-allergies input[type="checkbox"]').forEach(cb => { cb.checked = allergySet.has(cb.value); });
    }

    $('#save-profile')?.addEventListener('click', () => {
      const allergies = $$('#p-allergies input[type="checkbox"]:checked').map(cb => cb.value);
      const data = {
        name:     $('#p-name').value.trim(),
        age:      parseInt($('#p-age').value, 10)    || '',
        sex:      $('#p-sex').value                  || 'Female',
        height:   parseInt($('#p-height').value, 10) || '',
        weight:   parseFloat($('#p-weight').value)   || '',
        activity: parseFloat($('#p-activity').value  || '1.2'),
        diet:     $('#p-diet').value                 || 'none',
        allergies
      };
      saveToLocal('cp_profile', data);
      toast('✅ Profile saved! It will pre-fill the form next time.');
    });

    $('#clear-profile')?.addEventListener('click', () => {
      if (confirm('Clear your saved profile?')) {
        localStorage.removeItem('cp_profile');
        profileForm.reset();
        toast('Profile cleared.');
      }
    });
  }

})();
