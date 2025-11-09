// ===============================
// 0. SERVICE WORKER REGISTER
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

  // collapsibles (if used in workouts/meals pages)
  const collapsibles = document.querySelectorAll(".collapsible");
  M.Collapsible.init(collapsibles);

  // modals (if you add some later)
  const modals = document.querySelectorAll(".modal");
  M.Modal.init(modals);

  // selects
  const selects = document.querySelectorAll("select");
  M.FormSelect.init(selects);
});

// ===============================
// 2. FIREBASE (COMPAT) INIT
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyBn20aFdvciVPuR7OqbsmVNUgSf3TkgY98",
  authDomain: "fitfuelpwa.firebaseapp.com",
  projectId: "fitfuelpwa",
  storageBucket: "fitfuelpwa.appspot.com",
  messagingSenderId: "13166000407",
  appId: "1:13166000407:web:86535eeef76b2989065f52",
};

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

// ===============================
// 4. ONLINE / OFFLINE
// ===============================
function isOnline() {
  return navigator.onLine;
}

window.addEventListener("online", () => {
  console.log("Back online → syncing pending items...");
  syncAllPending();
});

// ===============================
// 5. SYNC LOGIC
// ===============================
async function syncAllPending() {
  const pending = await idbGetAll("pendingSync");
  if (!pending || pending.length === 0) return;

  for (const item of pending) {
    try {
      const col = item.collection;
      const id = item.id;
      const op = item.op || "create";
      const copy = { ...item };
      delete copy.collection;
      delete copy.op;

      const ref = db.collection(col).doc(id);

      if (op === "update") {
        await ref.set(copy, { merge: true });
      } else {
        await ref.set(copy);
      }

      await idbDelete("pendingSync", id);
    } catch (err) {
      console.warn("Could not sync item:", item, err);
    }
  }

  M.toast({ html: "Offline data synced to Firebase" });
  loadAllDataToUI();
}

// ===============================
// 6. LOAD DATA TO UI
// ===============================
let caloriesChart = null;

async function loadAllDataToUI() {
  // show IndexedDB immediately
  const workoutsLocal = await idbGetAll("workouts");
  const mealsLocal = await idbGetAll("meals");
  renderUI(workoutsLocal, mealsLocal);

  // if online, refresh from Firebase
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

function renderUI(workouts, meals) {
  renderWorkouts(workouts);
  renderMeals(meals);
  updateDashboard(workouts, meals);
  renderCaloriesChart(meals);
  renderFavorites(workouts, meals);
}

function renderWorkouts(workouts) {
  const wList = document.getElementById("workout-list");
  if (!wList) return;

  if (!workouts || workouts.length === 0) {
    wList.innerHTML = '<li class="collection-item">No workouts yet.</li>';
    return;
  }

  wList.innerHTML = workouts
    .map(
      (w) => `
      <li class="collection-item">
        <span><b>${w.name}</b> — ${
        w.minutes || 0
      } min <small class="grey-text">${w.date || ""}</small></span>
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
  const mList = document.getElementById("meal-list");
  if (!mList) return;

  if (!meals || meals.length === 0) {
    mList.innerHTML = '<li class="collection-item">No meals yet.</li>';
    return;
  }

  mList.innerHTML = meals
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

function renderFavorites(workouts, meals) {
  const favEl = document.getElementById("favorites");
  if (!favEl) return;
  const favW = workouts.filter((w) => w.favorite);
  const favM = meals.filter((m) => m.favorite);
  favEl.innerHTML = `
    <p><b>Favorite workouts:</b> ${
      favW.map((x) => x.name).join(", ") || "—"
    }</p>
    <p><b>Favorite meals:</b> ${favM.map((x) => x.name).join(", ") || "—"}</p>
  `;
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
// 7. FORM HANDLERS (CREATE + UPDATE)
// ===============================
function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now();
}

// WORKOUT FORM
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
      favorite: false,
      createdAt: new Date().toISOString(),
    };

    // always update local
    await idbPut("workouts", workout);

    if (isOnline()) {
      // if editing → merge, else create
      await db
        .collection("workouts")
        .doc(workout.id)
        .set(workout, { merge: true })
        .catch((err) => console.warn("Firebase write failed", err));
    } else {
      // offline → mark for sync
      await idbPut("pendingSync", {
        ...workout,
        collection: "workouts",
        op: existingId ? "update" : "create",
      });
      M.toast({ html: "Offline — will sync later" });
    }

    workoutForm.reset();
    if (idField) idField.value = "";
    M.updateTextFields();
    loadAllDataToUI();
    M.toast({ html: existingId ? "Workout updated" : "Workout saved" });
  });
}

// MEAL FORM
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
      favorite: false,
      createdAt: new Date().toISOString(),
    };

    await idbPut("meals", meal);

    if (isOnline()) {
      await db
        .collection("meals")
        .doc(meal.id)
        .set(meal, { merge: true })
        .catch((err) => console.warn("Firebase write failed", err));
    } else {
      await idbPut("pendingSync", {
        ...meal,
        collection: "meals",
        op: existingId ? "update" : "create",
      });
      M.toast({ html: "Offline — will sync later" });
    }

    mealForm.reset();
    if (idField) idField.value = "";
    M.updateTextFields();
    loadAllDataToUI();
    M.toast({ html: existingId ? "Meal updated" : "Meal saved" });
  });
}

// ===============================
// 8. CLICK HANDLERS (delete, edit trigger, add-to-plan)
// ===============================
document.addEventListener("click", async (e) => {
  // toast for meals
  if (e.target.matches(".add-to-plan") || e.target.closest(".add-to-plan")) {
    e.preventDefault();
    M.toast({ html: "Meal added to plan (offline-ready)" });
  }

  // DELETE WORKOUT
  if (e.target.closest(".delete-workout")) {
    e.preventDefault();
    const id = e.target.closest(".delete-workout").dataset.id;
    await idbDelete("workouts", id);
    if (isOnline()) {
      try {
        await db.collection("workouts").doc(id).delete();
      } catch (err) {
        console.warn("Could not delete from Firebase", err);
      }
    }
    loadAllDataToUI();
    M.toast({ html: "Workout deleted" });
  }

  // DELETE MEAL
  if (e.target.closest(".delete-meal")) {
    e.preventDefault();
    const id = e.target.closest(".delete-meal").dataset.id;
    await idbDelete("meals", id);
    if (isOnline()) {
      try {
        await db.collection("meals").doc(id).delete();
      } catch (err) {
        console.warn("Could not delete from Firebase", err);
      }
    }
    loadAllDataToUI();
    M.toast({ html: "Meal deleted" });
  }

  // EDIT WORKOUT → load into form (only if form exists on this page)
  if (e.target.closest(".edit-workout")) {
    e.preventDefault();
    const id = e.target.closest(".edit-workout").dataset.id;
    const item = await idbGet("workouts", id);

    const idField = document.getElementById("workout-id");
    const nameField = document.getElementById("wname");
    const minField = document.getElementById("wmin");
    const dateField = document.getElementById("wdate");

    // if we're on a page that doesn't have the form, just ignore
    if (item && idField && nameField && minField && dateField) {
      idField.value = item.id;
      nameField.value = item.name || "";
      minField.value = item.minutes || "";
      dateField.value = item.date || "";
      M.updateTextFields();
      M.toast({ html: "Editing workout..." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // EDIT MEAL → load into form (only if form exists on this page)
  if (e.target.closest(".edit-meal")) {
    e.preventDefault();
    const id = e.target.closest(".edit-meal").dataset.id;
    const item = await idbGet("meals", id);

    const idField = document.getElementById("meal-id");
    const nameField = document.getElementById("mname");
    const calField = document.getElementById("mcal");
    const proField = document.getElementById("mpro");
    const dateField = document.getElementById("mdate");

    if (item && idField && nameField && calField && proField && dateField) {
      idField.value = item.id;
      nameField.value = item.name || "";
      calField.value = item.calories || "";
      proField.value = item.protein || "";
      dateField.value = item.date || "";
      M.updateTextFields();
      M.toast({ html: "Editing meal..." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
});

// edit meal → load into form
if (e.target.closest(".edit-meal")) {
  e.preventDefault();
  const id = e.target.closest(".edit-meal").dataset.id;
  const item = await idbGet("meals", id);
  if (item) {
    document.getElementById("meal-id").value = item.id;
    document.getElementById("mname").value = item.name || "";
    document.getElementById("mcal").value = item.calories || "";
    document.getElementById("mpro").value = item.protein || "";
    document.getElementById("mdate").value = item.date || "";
    M.updateTextFields();
    M.toast({ html: "Editing meal..." });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
// ===============================
// 9. INITIAL LOAD
// ===============================
window.addEventListener("load", () => {
  loadAllDataToUI();
  if (isOnline()) {
    syncAllPending();
  }
});
