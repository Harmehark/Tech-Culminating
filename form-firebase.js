import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  addDoc,
  collection,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Tracks the currently authenticated Firebase user for plan ownership.
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log('Logged in Firebase user detected:', user.email || user.uid);
  } else {
    currentUser = null;
    console.log('No Firebase user is logged in. Plan will only be stored locally.');
  }
});

function serializePlanText(planDays) {
  // Converts structured daily plan data into readable text for quick previews/search.
  if (!Array.isArray(planDays)) return '';
  return planDays.map((day) => {
    const snacks = Array.isArray(day.snacks) ? day.snacks.join(' • ') : String(day.snacks || '');
    return [
      `${day.day}:`,
      `Breakfast: ${day.breakfast || ''}`,
      `Lunch: ${day.lunch || ''}`,
      `Dinner: ${day.dinner || ''}`,
      `Snacks: ${snacks}`
    ].join('\n');
  }).join('\n\n');
}

async function saveGeneratedPlan(payload) {
  // Saves a generated plan under users/{uid}/mealPlans when a user is logged in.
  if (!payload || !payload.meta || !payload.plan) return false;

  if (!currentUser) {
    return false;
  }

  const meta = payload.meta;
  const planData = {
    localPlanId: payload.id || null,
    calories: Number(meta.calories) || null,
    diet: meta.diet || 'none',
    allergies: Array.isArray(meta.allergies) ? meta.allergies : [],
    planText: serializePlanText(payload.plan),
    meta,
    plan: payload.plan,
    createdAt: serverTimestamp()
  };

  try {
    const userPlansRef = collection(db, 'users', currentUser.uid, 'mealPlans');
    const docRef = await addDoc(userPlansRef, planData);
    console.log('Firebase plan saved with ID:', docRef.id);
    return true;
  } catch (error) {
    console.error('Error saving Firebase plan:', error && error.message ? error.message : error);
    return false;
  }
}

window.firebaseSaveGeneratedPlan = saveGeneratedPlan;
