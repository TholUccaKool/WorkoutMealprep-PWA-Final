// ===============================
// 0. SERVICE WORKER
// ===============================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

// ===============================
// 1. MATERIALIZE INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  // mobile menu
  const sidenavs = document.querySelectorAll(".sidenav");
  M.Sidenav.init(sidenavs);

  // workout / meal collapsibles
  const collapsibles = document.querySelectorAll(".collapsible");
  M.Collapsible.init(collapsibles);

  // modals (for "Log set", "Add to plan", etc.)
  const modals = document.querySelectorAll(".modal");
  M.Modal.init(modals);

  // if you had any <select> in those modals
  const selects = document.querySelectorAll("select");
  M.FormSelect.init(selects);
});

// Handle click events like "Add to Plan"
document.addEventListener("click", (e) => {
  if (e.target.matches(".add-to-plan")) {
    e.preventDefault();
    M.toast({ html: "Meal added to plan (offline-ready)" });
  }

  if (e.target.matches(".log-set")) {
    e.preventDefault();
    M.toast({ html: "Workout set logged!" });
  }
});

// ===============================
// 2. FIREBASE (compat) INIT
//    (you already added the script tags in index.html)
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyBn20aFdvciVPuR7OqbsmVNUgSf3TkgY98",
  authDomain: "fitfuelpwa.firebaseapp.com",
  projectId: "fitfuelpwa",
  storageBucket: "fitfuelpwa.appspot.com",
  messagingSenderId: "13166000407",
  appId: "1:13166000407:web:86535eeef76b2989065f52",
};

// global "firebase" is available because of firebase-app-compat.js
const appFB = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===============================
// 3. INDEXEDDB HELPERS
// ===============================
const IDB_NAME = "fitfuel-db";
const IDB_VERSION = 1;
let idbInstance = null;

function openIDB() {
  return new Promise((resolve, reject) => {
    if (idbInstance) return resolve(idbInstance);
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("workouts")) {
        db.createObjectStore("workouts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("meals")) {
        db.createObjectStore("meals", { keyPath: "id" });
      }
      // holds items created offline that we must push to Firebase later
      if (!db.objectStoreNames.contains("pendingSync")) {
        db.createObjectStore("pendingSync", { keyPath: "id" });
      }
    };
    req.onsuccess = (event) => {
      idbInstance = event.target.result;
      resolve(idbInstance);
    };
    req.onerror = (event) => reject(event.target.error);
  });
}

async function idbPut(store, value) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

async function idbGetAll(store) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e);
  });
}

async function idbDelete(store, id) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

// ===============================
// 4. ONLINE/OFFLINE UTIL
// ===============================
function isOnline() {
  return navigator.onLine;
}

window.addEventListener("online", () => {
  console.log("✅ Back online — syncing…");
  syncAllPending();
});

// ===============================
// 5. FIREBASE HELPERS
// ===============================
async function createWorkoutOnline(workout) {
  const ref = await db.collection("workouts").add(workout);
  return { ...workout, id: ref.id };
}

async function createMealOnline(meal) {
  const ref = await db.collection("meals").add(meal);
  return { ...meal, id: ref.id };
}

// upload one pending offline record to Firebase
async function syncPendingItem(item) {
  const { id, type, ...data } = item;
  if (type === "workout") {
    const ref = await db.collection("workouts").add(data);
    return { oldId: id, newId: ref.id };
  }
  if (type === "meal") {
    const ref = await db.collection("meals").add(data);
    return { oldId: id, newId: ref.id };
  }
  return null;
}

// upload everything in pendingSync
async function syncAllPending() {
  const pending = await idbGetAll("pendingSync");
  if (!pending.length) return;

  for (const item of pending) {
    try {
      const res = await syncPendingItem(item);
      if (res) {
        await idbDelete("pendingSync", item.id);
      }
    } catch (err) {
      console.warn("Sync failed for", item, err);
    }
  }

  if (pending.length) {
    M.toast({ html: "Offline data synced to Firebase" });
  }

  // refresh UI with latest data from Firebase
  loadAllDataToUI();
}

// ===============================
// 6. LOAD DATA (IDB → UI, then Firebase → UI)
// ===============================
async function loadAllDataToUI() {
  // show whatever we have in browser first
  const workoutsLocal = await idbGetAll("workouts");
  const mealsLocal = await idbGetAll("meals");
  renderUI(workoutsLocal, mealsLocal);

  // if online, get fresh from Firebase and update IDB
  if (isOnline()) {
    const wSnap = await db.collection("workouts").get();
    const workoutsOnline = wSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    for (const w of workoutsOnline) await idbPut("workouts", w);

    const mSnap = await db.collection("meals").get();
    const mealsOnline = mSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    for (const m of mealsOnline) await idbPut("meals", m);

    renderUI(workoutsOnline, mealsOnline);
  }
}

// ===============================
// 7. RENDERING (lists + dashboard + chart)
// ===============================
let caloriesChart = null;

function renderUI(workouts, meals) {
  // workout list
  const wList = document.getElementById("workout-list");
  if (wList) {
    wList.innerHTML =
      workouts
        .map(
          (w) => `
      <li class="collection-item">
        <span><b>${w.name}</b> — ${w.minutes || 0} min 
        <small class="grey-text">${w.date || ""}</small></span>
      </li>`
        )
        .join("") || '<li class="collection-item">No workouts yet.</li>';
  }

  // meal list
  const mList = document.getElementById("meal-list");
  if (mList) {
    mList.innerHTML =
      meals
        .map(
          (m) => `
      <li class="collection-item">
        <span><b>${m.name}</b> — ${m.calories || 0} kcal, ${
            m.protein || 0
          }g protein 
        <small class="grey-text">${m.date || ""}</small></span>
      </li>`
        )
        .join("") || '<li class="collection-item">No meals yet.</li>';
  }

  // favorites (if you had favorite: true)
  const favEl = document.getElementById("favorites");
  if (favEl) {
    const favW = workouts.filter((w) => w.favorite);
    const favM = meals.filter((m) => m.favorite);
    favEl.innerHTML = `
      <p><b>Favorite workouts:</b> ${
        favW.map((x) => x.name).join(", ") || "—"
      }</p>
      <p><b>Favorite meals:</b> ${favM.map((x) => x.name).join(", ") || "—"}</p>
    `;
  }

  updateDashboard(workouts, meals);
  renderCaloriesChart(meals);
}

function getLast7Dates() {
  const res = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    res.push(d.toISOString().slice(0, 10));
  }
  return res;
}

function updateDashboard(workouts, meals) {
  const container = document.getElementById("dashboard-cards");
  if (!container) return;

  const last7 = getLast7Dates();

  const workouts7 = workouts.filter((w) => last7.includes(w.date)).length;
  const meals7 = meals.filter((m) => last7.includes(m.date)).length;
  const calories7 = meals
    .filter((m) => last7.includes(m.date))
    .reduce((sum, m) => sum + (Number(m.calories) || 0), 0);

  container.innerHTML = `
    <div class="col s12 m4">
      <div class="card teal lighten-1">
        <div class="card-content white-text">
          <span class="card-title">Workouts (7d)</span>
          <h4>${workouts7}</h4>
        </div>
      </div>
    </div>
    <div class="col s12 m4">
      <div class="card indigo lighten-1">
        <div class="card-content white-text">
          <span class="card-title">Meals (7d)</span>
          <h4>${meals7}</h4>
        </div>
      </div>
    </div>
    <div class="col s12 m4">
      <div class="card deep-orange lighten-1">
        <div class="card-content white-text">
          <span class="card-title">Calories (7d)</span>
          <h4>${calories7}</h4>
        </div>
      </div>
    </div>
  `;
}

function renderCaloriesChart(meals) {
  const ctx = document.getElementById("calorie-chart");
  if (!ctx || !window.Chart) return;

  const last7 = getLast7Dates().reverse(); // oldest → newest
  const labels = last7.map((d) => d.slice(5));
  const data = last7.map((d) =>
    meals
      .filter((m) => m.date === d)
      .reduce((sum, m) => sum + (Number(m.calories) || 0), 0)
  );

  if (caloriesChart) caloriesChart.destroy();

  caloriesChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Calories (last 7 days)",
          data,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

// ===============================
// 8. FORM SUBMIT HANDLERS
// ===============================
document.addEventListener("submit", async (e) => {
  const form = e.target;

  // WORKOUT FORM
  if (form.id === "form-workout") {
    e.preventDefault();
    const name = form.querySelector("[name=name]").value.trim();
    const minutes = Number(form.querySelector("[name=minutes]").value || 0);
    const date =
      form.querySelector("[name=date]").value ||
      new Date().toISOString().slice(0, 10);

    if (!name) return;

    const workout = {
      name,
      minutes,
      date,
      favorite: false,
      createdAt: new Date().toISOString(),
    };

    if (isOnline()) {
      try {
        const saved = await createWorkoutOnline(workout);
        await idbPut("workouts", saved);
      } catch (err) {
        // firebase failed → store offline
        const offlineItem = {
          ...workout,
          id: crypto.randomUUID(),
          type: "workout",
        };
        await idbPut("workouts", offlineItem);
        await idbPut("pendingSync", offlineItem);
      }
    } else {
      // offline → store and mark for sync
      const offlineItem = {
        ...workout,
        id: crypto.randomUUID(),
        type: "workout",
      };
      await idbPut("workouts", offlineItem);
      await idbPut("pendingSync", offlineItem);
      M.toast({ html: "Offline — will sync later" });
    }

    form.reset();
    M.updateTextFields();
    loadAllDataToUI();
    M.toast({ html: "Workout saved" });
  }

  // MEAL FORM
  if (form.id === "form-meal") {
    e.preventDefault();
    const name = form.querySelector("[name=name]").value.trim();
    const calories = Number(form.querySelector("[name=calories]").value || 0);
    const protein = Number(form.querySelector("[name=protein]").value || 0);
    const date =
      form.querySelector("[name=date]").value ||
      new Date().toISOString().slice(0, 10);

    if (!name) return;

    const meal = {
      name,
      calories,
      protein,
      date,
      favorite: false,
      createdAt: new Date().toISOString(),
    };

    if (isOnline()) {
      try {
        const saved = await createMealOnline(meal);
        await idbPut("meals", saved);
      } catch (err) {
        const offlineItem = {
          ...meal,
          id: crypto.randomUUID(),
          type: "meal",
        };
        await idbPut("meals", offlineItem);
        await idbPut("pendingSync", offlineItem);
      }
    } else {
      const offlineItem = {
        ...meal,
        id: crypto.randomUUID(),
        type: "meal",
      };
      await idbPut("meals", offlineItem);
      await idbPut("pendingSync", offlineItem);
      M.toast({ html: "Offline — will sync later" });
    }

    form.reset();
    M.updateTextFields();
    loadAllDataToUI();
    M.toast({ html: "Meal saved" });
  }
});

// ===============================
// 9. INITIAL LOAD
// ===============================
window.addEventListener("load", () => {
  loadAllDataToUI();
  if (isOnline()) {
    syncAllPending();
  }
});
