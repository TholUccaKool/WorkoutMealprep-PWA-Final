// =====================================
// 0. SERVICE WORKER
// =====================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(console.warn);
  });
}

// =====================================
// 1. MATERIALIZE INIT
// =====================================
document.addEventListener("DOMContentLoaded", () => {
  const sidenavs = document.querySelectorAll(".sidenav");
  M.Sidenav.init(sidenavs);
  const collapsibles = document.querySelectorAll(".collapsible");
  M.Collapsible.init(collapsibles);
});

// =====================================
// 2. FIREBASE (SAFE INIT)
//    if firebase sdk fails to load, we keep going
// =====================================
let db = null;
(function initFirebaseSafely() {
  try {
    if (window.firebase) {
      const firebaseConfig = {
        apiKey: "AIzaSyBn20aFdvciVPuR7OqbsmVNUgSf3TkgY98",
        authDomain: "fitfuelpwa.firebaseapp.com",
        projectId: "fitfuelpwa",
        storageBucket: "fitfuelpwa.appspot.com",
        messagingSenderId: "13166000407",
        appId: "1:13166000407:web:86535eeef76b2989065f52",
      };
      const appFB = firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      console.log("Firebase ready");
    } else {
      console.warn("Firebase SDK not loaded – running offline-only");
    }
  } catch (err) {
    console.warn("Firebase init failed – running offline-only", err);
  }
})();

// =====================================
// 3. INDEXEDDB HELPERS
// =====================================
const IDB_NAME = "fitfuel-db";
const IDB_VERSION = 1;
let idbInstance = null;

function openIDB() {
  return new Promise((resolve, reject) => {
    if (idbInstance) return resolve(idbInstance);
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("workouts")) {
        db.createObjectStore("workouts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("meals")) {
        db.createObjectStore("meals", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("pendingSync")) {
        db.createObjectStore("pendingSync", { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => {
      idbInstance = e.target.result;
      resolve(idbInstance);
    };
    req.onerror = (e) => reject(e);
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

async function idbGet(store, id) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result || null);
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

// =====================================
// 4. ONLINE / OFFLINE
// =====================================
function isOnline() {
  return navigator.onLine && !!db; // only call "online" if firebase is actually usable
}

window.addEventListener("online", () => {
  console.log("Online again — syncing");
  syncAllPending();
});

// =====================================
// 5. SYNC
// =====================================
async function syncAllPending() {
  if (!db) return; // nothing to sync if firebase not ready
  const pending = await idbGetAll("pendingSync");
  for (const item of pending) {
    try {
      const { collection, op, id, ...rest } = item;
      const ref = db.collection(collection).doc(id);
      if (op === "update") {
        await ref.set(rest, { merge: true });
      } else {
        await ref.set(rest);
      }
      await idbDelete("pendingSync", id);
    } catch (err) {
      console.warn("Failed to sync item", item, err);
    }
  }
  if (pending.length) M.toast({ html: "Offline data synced" });
}

// =====================================
// 6. RENDER FUNCTIONS
// =====================================
let caloriesChart = null;

function renderWorkouts(workouts) {
  const list = document.getElementById("workout-list");
  if (!list) return;
  if (!workouts.length) {
    list.innerHTML = '<li class="collection-item">No workouts yet.</li>';
    return;
  }
  list.innerHTML = workouts
    .map(
      (w) => `
    <li class="collection-item">
      <span><b>${w.name}</b> — ${w.minutes || 0} min <small class="grey-text">${
        w.date || ""
      }</small></span>
      <a href="#!" class="secondary-content red-text delete-workout" data-id="${
        w.id
      }">
        <i class="material-icons">delete</i>
      </a>
      <a href="#!" class="secondary-content edit-workout" data-id="${
        w.id
      }" style="margin-right:40px">
        <i class="material-icons">edit</i>
      </a>
    </li>
  `
    )
    .join("");
}

function renderMeals(meals) {
  const list = document.getElementById("meal-list");
  if (!list) return;
  if (!meals.length) {
    list.innerHTML = '<li class="collection-item">No meals yet.</li>';
    return;
  }
  list.innerHTML = meals
    .map(
      (m) => `
    <li class="collection-item">
      <span><b>${m.name}</b> — ${
        m.calories || 0
      } kcal <small class="grey-text">${m.date || ""}</small></span>
      <a href="#!" class="secondary-content red-text delete-meal" data-id="${
        m.id
      }">
        <i class="material-icons">delete</i>
      </a>
      <a href="#!" class="secondary-content edit-meal" data-id="${
        m.id
      }" style="margin-right:40px">
        <i class="material-icons">edit</i>
      </a>
    </li>
  `
    )
    .join("");
}

function getLast7Dates() {
  const arr = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

function renderDashboard(workouts, meals) {
  const dash = document.getElementById("dashboard-cards");
  if (!dash) return;
  const last7 = getLast7Dates();
  const w7 = workouts.filter((w) => last7.includes(w.date)).length;
  const m7 = meals.filter((m) => last7.includes(m.date)).length;
  const c7 = meals
    .filter((m) => last7.includes(m.date))
    .reduce((sum, m) => sum + (Number(m.calories) || 0), 0);

  dash.innerHTML = `
    <div class="col s12 m4">
      <div class="card teal lighten-1">
        <div class="card-content white-text">
          <span class="card-title">Workouts (7d)</span>
          <h4>${w7}</h4>
        </div>
      </div>
    </div>
    <div class="col s12 m4">
      <div class="card indigo lighten-1">
        <div class="card-content white-text">
          <span class="card-title">Meals (7d)</span>
          <h4>${m7}</h4>
        </div>
      </div>
    </div>
    <div class="col s12 m4">
      <div class="card deep-orange lighten-1">
        <div class="card-content white-text">
          <span class="card-title">Calories (7d)</span>
          <h4>${c7}</h4>
        </div>
      </div>
    </div>
  `;
}

function renderCaloriesChart(meals) {
  const ctx = document.getElementById("calorie-chart");
  if (!ctx || !window.Chart) return;
  const last7 = getLast7Dates().reverse();
  const labels = last7.map((d) => d.slice(5));
  const data = last7.map((date) =>
    meals
      .filter((m) => m.date === date)
      .reduce((sum, m) => sum + (Number(m.calories) || 0), 0)
  );
  if (caloriesChart) caloriesChart.destroy();
  caloriesChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Calories (last 7 days)", data }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

// =====================================
// 7. LOAD DATA (LOCAL FIRST, THEN FIREBASE IF AVAILABLE)
// =====================================
async function loadAllDataToUI() {
  // local first
  const workoutsLocal = await idbGetAll("workouts");
  const mealsLocal = await idbGetAll("meals");
  renderWorkouts(workoutsLocal);
  renderMeals(mealsLocal);
  renderDashboard(workoutsLocal, mealsLocal);
  renderCaloriesChart(mealsLocal);

  // if firebase works, refresh from cloud
  if (db) {
    const wSnap = await db.collection("workouts").get();
    const workoutsOnline = wSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    for (const w of workoutsOnline) await idbPut("workouts", w);

    const mSnap = await db.collection("meals").get();
    const mealsOnline = mSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    for (const m of mealsOnline) await idbPut("meals", m);

    renderWorkouts(workoutsOnline);
    renderMeals(mealsOnline);
    renderDashboard(workoutsOnline, mealsOnline);
    renderCaloriesChart(mealsOnline);
  }
}

// =====================================
// 8. FORMS (CREATE / UPDATE)
// =====================================
function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now();
}

const workoutForm = document.getElementById("form-workout");
if (workoutForm) {
  workoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const idField = document.getElementById("workout-id");
    const existingId = idField ? idField.value.trim() : "";
    const name = document.getElementById("wname").value.trim();
    const minutes = Number(document.getElementById("wmin").value || 0);
    const date =
      document.getElementById("wdate").value ||
      new Date().toISOString().slice(0, 10);

    if (!name) return;

    const workout = {
      id: existingId || generateId(),
      name,
      minutes,
      date,
      createdAt: new Date().toISOString(),
    };

    await idbPut("workouts", workout);

    if (isOnline()) {
      await db
        .collection("workouts")
        .doc(workout.id)
        .set(workout, { merge: true })
        .catch(console.warn);
    } else {
      await idbPut("pendingSync", {
        ...workout,
        collection: "workouts",
        op: existingId ? "update" : "create",
      });
      M.toast({ html: "Offline — will sync later" });
    }
    if (existingId) {
      M.toast({ html: "Workout updated successfully!" });
    } else {
      M.toast({ html: "New workout added!" });
    }

    workoutForm.reset();
    if (idField) idField.value = "";
    M.updateTextFields();
    loadAllDataToUI();
  });
}

const mealForm = document.getElementById("form-meal");
if (mealForm) {
  mealForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const idField = document.getElementById("meal-id");
    const existingId = idField ? idField.value.trim() : "";
    const name = document.getElementById("mname").value.trim();
    const calories = Number(document.getElementById("mcal").value || 0);
    const protein = Number(document.getElementById("mpro").value || 0);
    const date =
      document.getElementById("mdate").value ||
      new Date().toISOString().slice(0, 10);

    if (!name) return;

    const meal = {
      id: existingId || generateId(),
      name,
      calories,
      protein,
      date,
      createdAt: new Date().toISOString(),
    };

    await idbPut("meals", meal);

    if (isOnline()) {
      await db
        .collection("meals")
        .doc(meal.id)
        .set(meal, { merge: true })
        .catch(console.warn);
    } else {
      await idbPut("pendingSync", {
        ...meal,
        collection: "meals",
        op: existingId ? "update" : "create",
      });
      M.toast({ html: "Offline — will sync later" });
    }

    if (existingId) {
      M.toast({ html: "Meal updated successfully!" });
    } else {
      M.toast({ html: "New meal added!" });
    }

    mealForm.reset();
    if (idField) idField.value = "";
    M.updateTextFields();
    loadAllDataToUI();
  });
}

// =====================================
// 9. CLICK HANDLERS (edit/delete)
// =====================================
document.addEventListener("click", async (e) => {
  // --- delete workout ---
  if (e.target.closest(".delete-workout")) {
    const id = e.target.closest(".delete-workout").dataset.id;
    await idbDelete("workouts", id);
    if (isOnline()) {
      await db.collection("workouts").doc(id).delete().catch(console.warn);
    }
    loadAllDataToUI();
    M.toast({ html: "Workout deleted" });
  }

  // --- delete meal ---
  if (e.target.closest(".delete-meal")) {
    const id = e.target.closest(".delete-meal").dataset.id;
    await idbDelete("meals", id);
    if (isOnline()) {
      await db.collection("meals").doc(id).delete().catch(console.warn);
    }
    loadAllDataToUI();
    M.toast({ html: "Meal deleted" });
  }

  // --- edit workout ---
  if (e.target.closest(".edit-workout")) {
    const id = e.target.closest(".edit-workout").dataset.id;
    console.log("edit workout clicked for id:", id); // <--- to verify
    const item = await idbGet("workouts", id);
    if (item) {
      const idField = document.getElementById("workout-id");
      const nameField = document.getElementById("wname");
      const minField = document.getElementById("wmin");
      const dateField = document.getElementById("wdate");
      if (idField && nameField && minField && dateField) {
        idField.value = item.id;
        nameField.value = item.name || "";
        minField.value = item.minutes || "";
        dateField.value = item.date || "";
        M.updateTextFields();
        M.toast({ html: "Editing workout..." }); // <-- the toast
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }

  // --- edit meal ---
  if (e.target.closest(".edit-meal")) {
    const id = e.target.closest(".edit-meal").dataset.id;
    console.log("edit meal clicked for id:", id); // <--- to verify
    const item = await idbGet("meals", id);
    if (item) {
      const idField = document.getElementById("meal-id");
      const nameField = document.getElementById("mname");
      const calField = document.getElementById("mcal");
      const proField = document.getElementById("mpro");
      const dateField = document.getElementById("mdate");
      if (idField && nameField && calField && proField && dateField) {
        idField.value = item.id;
        nameField.value = item.name || "";
        calField.value = item.calories || "";
        proField.value = item.protein || "";
        dateField.value = item.date || "";
        M.updateTextFields();
        M.toast({ html: "Editing meal..." }); // <-- the toast
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }

  // --- add-to-plan toast (meals page) ---
  if (e.target.matches(".add-to-plan") || e.target.closest(".add-to-plan")) {
    e.preventDefault();
    M.toast({ html: "Meal added to plan (offline-ready)" });
  }
});

// =====================================
// 10. INITIAL LOAD
// =====================================
window.addEventListener("load", () => {
  loadAllDataToUI();
  if (isOnline()) {
    syncAllPending();
  }
});
