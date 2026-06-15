// Personalized Calorie Intake Meal Planner
// All pages share this script. It detects elements by id and wires up features.

(function(){
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // Mobile nav
  const toggle = $('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const menu = $('#nav-menu');
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('show');
    });
  }

  // ---------- Utilities ----------
  function clamp(n, min, max){ return Math.min(Math.max(n, min), max); }

  function mifflinStJeor({sex, weightKg, heightCm, age}){
    // BMR
    const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    return sex === 'Female' ? base - 161 : base + 5;
  }

  function applyGoal(tdee, goal){
    const map = {
      'maintain': 1.0,
      'mild-loss': 0.9,
      'loss': 0.8,
      'mild-gain': 1.1,
      'gain': 1.2
    };
    return Math.round(tdee * (map[goal] || 1));
  }

  function formatKcal(k){ return `${k.toLocaleString()} kcal/day`; }

  function getCheckedValues(name){
    return $$(`input[name="${name}"]:checked`).map(i => i.value.toLowerCase());
  }

  function saveToLocal(key, data){
    localStorage.setItem(key, JSON.stringify(data));
  }
  function loadFromLocal(key, fallback = null){
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  }

  // ---------- Food Database ----------
  // Each item has: name, diet tags, allergens, meal slots it fits
  const FOODS = [
    // Breakfasts
    {name:'Oatmeal with berries', slots:['breakfast'], diet:['none','vegetarian','vegan'], allergens:['gluten']},
    {name:'Greek yogurt parfait', slots:['breakfast'], diet:['none','vegetarian'], allergens:['dairy']},
    {name:'Tofu scramble + veggies', slots:['breakfast'], diet:['none','vegetarian','vegan'], allergens:['soy']},
    {name:'Egg scramble + spinach', slots:['breakfast'], diet:['none','vegetarian'], allergens:['eggs']},
    {name:'Avocado toast (GF if needed)', slots:['breakfast'], diet:['none','vegetarian','vegan']},
    {name:'Smoked salmon on whole grain', slots:['breakfast'], diet:['none','non-vegetarian'], allergens:['fish','gluten']},

    // Lunch
    {name:'Quinoa bowl, chickpeas, roasted veg', slots:['lunch'], diet:['none','vegetarian','vegan']},
    {name:'Grilled chicken, brown rice, broccoli', slots:['lunch'], diet:['none','non-vegetarian']},
    {name:'Lentil soup + side salad', slots:['lunch'], diet:['none','vegetarian','vegan']},
    {name:'Tuna salad wrap (GF option)', slots:['lunch'], diet:['none','non-vegetarian'], allergens:['fish','gluten']},
    {name:'Halloumi salad, olive oil, seeds', slots:['lunch'], diet:['none','vegetarian'], allergens:['dairy','sesame','tree nuts']},

    // Dinner
    {name:'Baked salmon, potatoes, asparagus', slots:['dinner'], diet:['none','non-vegetarian'], allergens:['fish']},
    {name:'Stir-fried tofu, veggies, rice', slots:['dinner'], diet:['none','vegetarian','vegan'], allergens:['soy']},
    {name:'Turkey chili + corn', slots:['dinner'], diet:['none','non-vegetarian']},
    {name:'Pasta marinara + lentil balls', slots:['dinner'], diet:['none','vegetarian','vegan'], allergens:['gluten']},
    {name:'Paneer tikka + quinoa', slots:['dinner'], diet:['none','vegetarian'], allergens:['dairy']},

    // Snacks
    {name:'Apple + peanut butter', slots:['snack'], diet:['none','vegetarian','vegan'], allergens:['peanuts']},
    {name:'Hummus + carrots', slots:['snack'], diet:['none','vegetarian','vegan'], allergens:['sesame']},
    {name:'Yogurt cup', slots:['snack'], diet:['none','vegetarian'], allergens:['dairy']},
    {name:'Trail mix (nuts & seeds)', slots:['snack'], diet:['none','vegetarian','vegan'], allergens:['tree nuts','sesame']},
    {name:'Rice cakes + avocado', slots:['snack'], diet:['none','vegetarian','vegan'], allergens:['gluten']},
    {name:'Boiled eggs', slots:['snack'], diet:['none','vegetarian'], allergens:['eggs']},
    {name:'Cottage cheese + pineapple', slots:['snack'], diet:['none','vegetarian'], allergens:['dairy']},
    {name:'Orange + almonds', slots:['snack'], diet:['none','vegetarian','vegan'], allergens:['tree nuts']},
  ];

  // Fallback alternatives by allergen to keep plan robust
  const SAFE_ALTERNATIVES = {
    peanuts: 'Sunflower seed butter',
    'tree nuts': 'Roasted chickpeas',
    dairy: 'Coconut yogurt',
    eggs: 'Edamame (if soy ok)',
    soy: 'Beans or lentils',
    gluten: 'Certified GF grain',
    shellfish: 'Chicken or tofu (as diet allows)',
    fish: 'White beans or tempeh (if soy ok)',
    sesame: 'Olive oil or pumpkin seeds'
  };

  function filterFoods(dietPref, allergies, slot){
    return FOODS.filter(f =>
      f.slots.includes(slot) &&
      f.diet.includes(dietPref) &&
      !((f.allergens||[]).some(a => allergies.includes(a)))
    );
  }

  function pick(list, n){
    const copy = list.slice();
    const out = [];
    for(let i=0;i<n && copy.length;i++){
      const idx = Math.floor(Math.random()*copy.length);
      out.push(copy.splice(idx,1)[0]);
    }
    return out;
  }

  function buildDayPlan(dietPref, allergies){
    const breakfast = filterFoods(dietPref, allergies, 'breakfast');
    const lunch = filterFoods(dietPref, allergies, 'lunch');
    const dinner = filterFoods(dietPref, allergies, 'dinner');
    const snacks = filterFoods(dietPref, allergies, 'snack');

    function safeGet(pool, fallbackLabel){
      if (pool.length) return pick(pool,1)[0].name;
      // If pool empty, craft a safe generic using known problem allergens
      return `Simple ${fallbackLabel} (allergen-safe choice)`;
    }

    return {
      breakfast: safeGet(breakfast,'breakfast'),
      lunch: safeGet(lunch,'lunch'),
      dinner: safeGet(dinner,'dinner'),
      snacks: pick(snacks.length ? snacks : [{name:'Fruit + seeds'}], 2).map(s=>s.name)
    };
  }

  function buildWeekPlan(dietPref, allergies){
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    return days.map(d => ({ day:d, ...buildDayPlan(dietPref, allergies) }));
  }

  function renderPlan(container, plan){
    container.innerHTML = '';
    plan.forEach(({day, breakfast, lunch, dinner, snacks}) => {
      const card = document.createElement('div');
      card.className = 'card day-card';
      card.innerHTML = `
        <h4>${day}</h4>
        <div class="meal"><strong>Breakfast:</strong> ${breakfast}</div>
        <div class="meal"><strong>Lunch:</strong> ${lunch}</div>
        <div class="meal"><strong>Dinner:</strong> ${dinner}</div>
        <div class="meal"><strong>Snacks:</strong> ${snacks.join(' • ')}</div>
      `;
      container.appendChild(card);
    });
  }

  function renderCalorieBox(box, ctx){
    const { name, age, sex, height, weight, activity, goal, calories, tdee, bmr } = ctx;
    box.innerHTML = `
      <h3>Recommended Daily Calories</h3>
      <p class="muted">${name ? `${name}, `: ''}${sex}, ${age}y • ${height}cm • ${weight}kg • Activity factor ${activity}</p>
      <div class="meal"><strong>BMR:</strong> ${Math.round(bmr)} kcal/day</div>
      <div class="meal"><strong>TDEE:</strong> ${Math.round(tdee)} kcal/day</div>
      <div class="meal"><strong>Goal‑adjusted target:</strong> <strong>${formatKcal(calories)}</strong> (${goal.replace('-', ' ')})</div>
      <p class="muted" style="margin-top:8px">This is an estimate for general wellness, not medical advice.</p>
    `;
  }

  // ---------- Planner Form (Home) ----------
  const plannerForm = $('#planner-form');
  if (plannerForm) {
    // Load defaults from profile
    const prof = loadFromLocal('cp_profile', null);
    if (prof) {
      ['name','age','sex','height','weight','activity','diet','goals'].forEach(id=>{
        const el = document.getElementById(id);
        if (el && prof[id] != null) el.value = prof[id];
      });
      const set = new Set(prof.allergies || []);
      $$('input[name="allergies"]').forEach(cb => { cb.checked = set.has(cb.value); });
    }

    $('#reset-btn')?.addEventListener('click', ()=> {
      plannerForm.reset();
      $('#plan-output').classList.add('hidden');
      $('#calorie-summary').classList.add('hidden');
      $('#results-actions').classList.add('hidden');
      saveToLocal('cp_latest', null);
    });

    plannerForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = $('#name').value.trim();
      const age = clamp(parseInt($('#age').value,10), 10, 100);
      const sex = $('#sex').value || 'Female';
      const height = clamp(parseInt($('#height').value,10), 120, 230);
      const weight = clamp(parseFloat($('#weight').value), 30, 250);
      const activity = parseFloat($('#activity').value || '1.2');
      const diet = $('#diet').value || 'none';
      const allergies = getCheckedValues('allergies');
      const goal = $('#goals').value || 'maintain';

      // Calories
      const bmr = mifflinStJeor({sex, weightKg:weight, heightCm:height, age});
      const tdee = bmr * activity;
      const calories = applyGoal(tdee, goal);

      // Plan
      const weekPlan = buildWeekPlan(diet, allergies);

      // Render on Home
      const planGrid = $('#plan-output');
      const calBox = $('#calorie-summary');
      renderPlan(planGrid, weekPlan);
      renderCalorieBox(calBox, {name, age, sex, height, weight, activity, goal, calories, tdee, bmr});
      planGrid.classList.remove('hidden');
      calBox.classList.remove('hidden');
      $('#results-actions').classList.remove('hidden');

      const payload = { meta:{name, age, sex, height, weight, activity, diet, allergies, goal, calories, created: new Date().toISOString()}, plan: weekPlan };
      saveToLocal('cp_latest', payload);
    });

    // Save/Download buttons on Home
    $('#save-plan')?.addEventListener('click', ()=> saveCurrentPlan());
    $('#download-plan')?.addEventListener('click', ()=> downloadCurrent());

    function saveCurrentPlan(){
      const latest = loadFromLocal('cp_latest', null);
      if (!latest) return;
      const all = loadFromLocal('cp_saved', []);
      all.unshift({...latest, id: crypto.randomUUID()});
      saveToLocal('cp_saved', all);
      // Subtle toast
      toast('Plan saved to your browser.');
    }
    function downloadCurrent(){
      const latest = loadFromLocal('cp_latest', null);
      if (!latest) return;
      const blob = new Blob([JSON.stringify(latest,null,2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `meal-plan-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  // ---------- Results Page ----------
  const resultsCal = $('#results-calorie-summary');
  const resultsGrid = $('#results-plan-output');
  if (resultsCal && resultsGrid) {
    const latest = loadFromLocal('cp_latest', null);
    if (latest) {
      renderPlan(resultsGrid, latest.plan);
      renderCalorieBox(resultsCal, {
        ...latest.meta,
        bmr: mifflinStJeor({sex: latest.meta.sex, weightKg: latest.meta.weight, heightCm: latest.meta.height, age: latest.meta.age}),
        tdee: mifflinStJeor({sex: latest.meta.sex, weightKg: latest.meta.weight, heightCm: latest.meta.height, age: latest.meta.age}) * latest.meta.activity
      });
      resultsCal.classList.remove('hidden');
      resultsGrid.classList.remove('hidden');
      $('#results-buttons')?.classList.remove('hidden');
    } else {
      if (resultsCal) resultsCal.innerHTML = '<p class="muted">No plan yet. Generate one on the Home page.</p>';
      resultsCal.classList.remove('hidden');
    }

    $('#save-plan-2')?.addEventListener('click', ()=> {
      const data = loadFromLocal('cp_latest', null);
      if (!data) return;
      const all = loadFromLocal('cp_saved', []);
      all.unshift({...data, id: crypto.randomUUID()});
      saveToLocal('cp_saved', all);
      toast('Plan saved.');
    });

    $('#download-plan-2')?.addEventListener('click', ()=> {
      const data = loadFromLocal('cp_latest', null);
      if (!data) return;
      const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `meal-plan-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
    });
  }

  // ---------- Saved Page ----------
  const plansUl = $('#plans-ul');
  if (plansUl) {
    function refresh(){
      plansUl.innerHTML = '';
      const saved = loadFromLocal('cp_saved', []);
      if (!saved.length){
        plansUl.innerHTML = '<li class="muted">No saved plans yet.</li>';
        return;
      }
      saved.forEach(p => {
        const li = document.createElement('li');
        li.className = 'saved-item';
        const title = `${p.meta.name || 'User'} • ${new Date(p.meta.created).toLocaleString()} • ${p.meta.calories} kcal`;
        li.innerHTML = `
          <span>${title}</span>
          <span>
            <button class="btn btn-secondary" data-id="${p.id}" data-act="view">View</button>
            <button class="btn" data-id="${p.id}" data-act="export">Export</button>
            <button class="btn" data-id="${p.id}" data-act="delete">Delete</button>
          </span>`;
        plansUl.appendChild(li);
      });
    }
    refresh();

    plansUl.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-id]');
      if (!btn) return;
      const id = btn.dataset.id, act = btn.dataset.act;
      const saved = loadFromLocal('cp_saved', []);
      const idx = saved.findIndex(s => s.id === id);
      if (idx === -1) return;
      const plan = saved[idx];
      if (act === 'view') {
        saveToLocal('cp_latest', plan);
        location.href = 'result.html';
      } else if (act === 'export') {
        const blob = new Blob([JSON.stringify(plan,null,2)], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `saved-plan-${plan.id}.json`;
        document.body.appendChild(a); a.click(); a.remove();
      } else if (act === 'delete') {
        saved.splice(idx,1);
        saveToLocal('cp_saved', saved);
        refresh();
      }
    });
  }

  // ---------- Profile Page ----------
  const pForm = $('#profile-form');
  if (pForm) {
    // Load if exists
    const prof = loadFromLocal('cp_profile', null);
    if (prof) {
      $('#p-name').value = prof.name || '';
      $('#p-age').value = prof.age || '';
      $('#p-sex').value = prof.sex || 'Female';
      $('#p-height').value = prof.height || '';
      $('#p-weight').value = prof.weight || '';
      $('#p-activity').value = String(prof.activity || '1.2');
      $('#p-diet').value = prof.diet || 'none';
      const set = new Set((prof.allergies||[]).map(a=>a.toLowerCase()));
      $$('#p-allergies input[type="checkbox"]').forEach(cb => cb.checked = set.has(cb.value));
    }

    $('#save-profile')?.addEventListener('click', ()=>{
      const allergies = $$('#p-allergies input[type="checkbox"]:checked').map(cb=>cb.value);
      const data = {
        name: $('#p-name').value.trim(),
        age: parseInt($('#p-age').value,10) || '',
        sex: $('#p-sex').value || 'Female',
        height: parseInt($('#p-height').value,10) || '',
        weight: parseFloat($('#p-weight').value) || '',
        activity: parseFloat($('#p-activity').value || '1.2'),
        diet: $('#p-diet').value || 'none',
        allergies
      };
      saveToLocal('cp_profile', data);
      toast('Defaults saved. They will prefill the Generator.');
    });

    $('#clear-profile')?.addEventListener('click', ()=>{
      localStorage.removeItem('cp_profile');
      pForm.reset();
      toast('Profile cleared.');
    });
  }

  // ---------- Tiny toast ----------
  function toast(msg){
    let el = $('#toast');
    if (!el){
      el = document.createElement('div');
      el.id = 'toast';
      Object.assign(el.style, {
        position:'fixed', left:'50%', bottom:'24px', transform:'translateX(-50%)',
        background:'#0f141c', color:'#e8ebf1', border:'1px solid #2a3448',
        padding:'10px 14px', borderRadius:'12px', boxShadow:'0 8px 24px rgba(0,0,0,.4)', zIndex:9999
      });
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(()=> el.style.opacity='0', 2000);
  }

})();
