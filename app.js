// =====================================
// 0. SERVICE WORKER
// =====================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(console.warn);
  });
}

// =====================================
// 1. MATERIALIZE INIT (NAV, COLLAPSIBLE)
// =====================================
document.addEventListener("DOMContentLoaded", () => {
  const sidenavs = document.querySelectorAll(".sidenav");
  if (window.M && M.Sidenav) {
    M.Sidenav.init(sidenavs);
  }
  const collapsibles = document.querySelectorAll(".collapsible");
  if (window.M && M.Collapsible) {
    M.Collapsible.init(collapsibles);
  }
});

// =====================================
// 2. FIREBASE INIT (FIRESTORE + AUTH)
// =====================================
let db = null;
let auth = null;
let currentUser = null;

(function initFirebaseSafely() {
  try {
    if (window.firebase) {
      const firebaseConfig = {
        apiKey: "AIzaSyBn20afDvciPVuR7oqbsmVNUgSf3TkgY98",
        authDomain: "fitfuelpwa.firebaseapp.com",
        projectId: "fitfuelpwa",
        storageBucket: "fitfuelpwa.firebasestorage.app",
        messagingSenderId: "13166000407",
        appId: "1:13166000407:web:86535eeef76b2989065f52",
      };

      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      auth = firebase.auth();

      console.log("Firebase ready");

      auth.onAuthStateChanged((user) => {
        handleAuthChange(user);
      });
    } else {
      console.warn("Firebase SDK not loaded - running offline-only");
    }
  } catch (err) {
    console.warn("Firebase init failed - running offline-only", err);
  }
})();

// =====================================
// 3. INDEXEDDB HELPERS (LOCAL CACHE)
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

// Simple: clear all local data on sign out
async function idbClearAllForUser() {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const t1 = db.transaction("workouts", "readwrite");
    const s1 = t1.objectStore("workouts");
    const t2 = db.transaction("meals", "readwrite");
    const s2 = t2.objectStore("meals");
    const t3 = db.transaction("pendingSync", "readwrite");
    const s3 = t3.objectStore("pendingSync");

    s1.clear();
    s2.clear();
    s3.clear();

    t3.oncomplete = () => resolve(true);
    t3.onerror = (e) => reject(e);
  });
}

// =====================================
// 4. ONLINE / OFFLINE + SYNC TRIGGER
// =====================================
function isOnline() {
  return navigator.onLine && !!db && !!currentUser;
}

window.addEventListener("online", () => {
  console.log("Back online - syncing pending data");
  syncAllPending();
});

// =====================================
// 5. AUTH STATE + AUTH PAGE HANDLING
// =====================================
function handleAuthChange(user) {
  currentUser = user || null;

  const emailEl = document.getElementById("user-email");
  const authStatus = document.getElementById("auth-status");
  const logoutBtn = document.getElementById("btn-logout");

  if (currentUser) {
    if (emailEl) emailEl.textContent = currentUser.email || "";
    if (authStatus)
      authStatus.textContent = "You are signed in. Your data is synced.";
    if (logoutBtn) logoutBtn.style.display = "block";

    // load user data
    loadAllDataForCurrentUser();
    syncAllPending();
  } else {
    if (emailEl) emailEl.textContent = "";
    if (authStatus) authStatus.textContent = "You are signed out.";
    if (logoutBtn) logoutBtn.style.display = "none";

    clearUI();
    idbClearAllForUser().catch(console.warn);
  }
}

// Navbar "Account / Sign out" link if you ever add id="btn-auth-nav"
const authNavBtn = document.getElementById("btn-auth-nav");
if (authNavBtn) {
  authNavBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!auth) return;
    if (currentUser) {
      auth
        .signOut()
        .then(() => {
          if (window.M) M.toast({ html: "Signed out" });
        })
        .catch(console.warn);
    } else {
      window.location.href = "auth.html";
    }
  });
}

// Logout button on auth.html card
const logoutBtn = document.getElementById("btn-logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!auth) return;
    auth
      .signOut()
      .then(() => {
        if (window.M) M.toast({ html: "Signed out" });
      })
      .catch(console.warn);
  });
}

// SIGN UP FORM (Email/Password)
const signupForm = document.getElementById("signup-form");
if (signupForm && window.M) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!auth) {
      M.toast({ html: "Auth not available" });
      return;
    }
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value.trim();

    auth
      .createUserWithEmailAndPassword(email, password)
      .then(() => {
        M.toast({ html: "Account created and signed in" });
        signupForm.reset();
        M.updateTextFields();
        // optional: go home after signup
        window.location.href = "index.html";
      })
      .catch((err) => {
        console.warn(err);
        M.toast({ html: err.message || "Sign up failed" });
      });
  });
}

// LOGIN FORM (Email/Password)
const loginForm = document.getElementById("login-form");
if (loginForm && window.M) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!auth) {
      M.toast({ html: "Auth not available" });
      return;
    }

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    auth
      .signInWithEmailAndPassword(email, password)
      .then(() => {
        M.toast({ html: "Signed in" });
        loginForm.reset();
        M.updateTextFields();
        // ✅ After successful login, go to home page
        window.location.href = "index.html";
      })
      .catch((err) => {
        console.warn(err);
        M.toast({ html: err.message || "Sign in failed" });
      });
  });
}

// =====================================
// 6. SYNC PENDING OFFLINE DATA
// =====================================
async function syncAllPending() {
  if (!db || !currentUser) return;

  const pending = await idbGetAll("pendingSync");
  const mine = pending.filter((p) => p.uid === currentUser.uid);

  for (const item of mine) {
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

  if (mine.length && window.M) {
    M.toast({ html: "Offline data synced" });
  }
}

// =====================================
// 7. RENDER FUNCTIONS (UI)
// =====================================
let caloriesChart = null;

function renderWorkouts(workouts) {
  const list = document.getElementById("workout-list");
  if (!list) return; // index.html only

  if (!workouts.length) {
    list.innerHTML = '<li class="collection-item">No workouts yet.</li>';
    return;
  }

  list.innerHTML = workouts
    .map(
      (w) => `
      <li class="collection-item">
        <span><b>${w.name}</b> — ${w.minutes || 0} min 
          <small class="grey-text">${w.date || ""}</small>
        </span>
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
  if (!list) return; // index.html only

  if (!meals.length) {
    list.innerHTML = '<li class="collection-item">No meals yet.</li>';
    return;
  }

  list.innerHTML = meals
    .map(
      (m) => `
      <li class="collection-item">
        <span><b>${m.name}</b> — ${m.calories || 0} kcal 
          <small class="grey-text">${m.date || ""}</small>
        </span>
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
  if (!dash) return; // index.html only

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

function clearUI() {
  const wList = document.getElementById("workout-list");
  const mList = document.getElementById("meal-list");
  const dash = document.getElementById("dashboard-cards");
  const ctx = document.getElementById("calorie-chart");

  if (wList)
    wList.innerHTML =
      '<li class="collection-item">Sign in to see workouts.</li>';
  if (mList)
    mList.innerHTML = '<li class="collection-item">Sign in to see meals.</li>';
  if (dash) dash.innerHTML = "";
  if (ctx && caloriesChart) {
    caloriesChart.destroy();
    caloriesChart = null;
  }
}

// =====================================
// 8. LOAD DATA FOR CURRENT USER
// =====================================
async function loadAllDataForCurrentUser() {
  if (!currentUser) {
    clearUI();
    return;
  }

  // Local first (IndexedDB)
  const workoutsLocal = (await idbGetAll("workouts")).filter(
    (w) => w.uid === currentUser.uid
  );
  const mealsLocal = (await idbGetAll("meals")).filter(
    (m) => m.uid === currentUser.uid
  );

  renderWorkouts(workoutsLocal);
  renderMeals(mealsLocal);
  renderDashboard(workoutsLocal, mealsLocal);
  renderCaloriesChart(mealsLocal);

  // Then refresh from Firebase if online
  if (db) {
    const wSnap = await db
      .collection("workouts")
      .where("uid", "==", currentUser.uid)
      .get();
    const workoutsOnline = wSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    for (const w of workoutsOnline) await idbPut("workouts", w);

    const mSnap = await db
      .collection("meals")
      .where("uid", "==", currentUser.uid)
      .get();
    const mealsOnline = mSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    for (const m of mealsOnline) await idbPut("meals", m);

    renderWorkouts(workoutsOnline);
    renderMeals(mealsOnline);
    renderDashboard(workoutsOnline, mealsOnline);
    renderCaloriesChart(mealsOnline);
  }
}

// =====================================
// 9. FORMS (CREATE / UPDATE WORKOUTS & MEALS)
// =====================================
function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now();
}

// WORKOUT FORM (index.html)
const workoutForm = document.getElementById("form-workout");
if (workoutForm) {
  workoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      if (window.M) M.toast({ html: "Please sign in first" });
      return;
    }

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
      uid: currentUser.uid,
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
      if (window.M) M.toast({ html: "Offline - will sync later" });
    }

    if (window.M) {
      if (existingId) {
        M.toast({ html: "Workout updated successfully!" });
      } else {
        M.toast({ html: "New workout added!" });
      }
    }

    workoutForm.reset();
    if (idField) idField.value = "";
    if (window.M) M.updateTextFields();
    loadAllDataForCurrentUser();
  });
}

// MEAL FORM (index.html)
const mealForm = document.getElementById("form-meal");
if (mealForm) {
  mealForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      if (window.M) M.toast({ html: "Please sign in first" });
      return;
    }

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
      uid: currentUser.uid,
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
      if (window.M) M.toast({ html: "Offline - will sync later" });
    }

    if (window.M) {
      if (existingId) {
        M.toast({ html: "Meal updated successfully!" });
      } else {
        M.toast({ html: "New meal added!" });
      }
    }

    mealForm.reset();
    if (idField) idField.value = "";
    if (window.M) M.updateTextFields();
    loadAllDataForCurrentUser();
  });
}

// =====================================
// 10. CLICK HANDLERS (EDIT / DELETE / ADD TO PLAN)
// =====================================
document.addEventListener("click", async (e) => {
  // delete workout
  const deleteWorkoutBtn = e.target.closest(".delete-workout");
  if (deleteWorkoutBtn) {
    const id = deleteWorkoutBtn.dataset.id;
    await idbDelete("workouts", id);
    if (isOnline()) {
      await db.collection("workouts").doc(id).delete().catch(console.warn);
    }
    loadAllDataForCurrentUser();
    if (window.M) M.toast({ html: "Workout deleted" });
  }

  // delete meal
  const deleteMealBtn = e.target.closest(".delete-meal");
  if (deleteMealBtn) {
    const id = deleteMealBtn.dataset.id;
    await idbDelete("meals", id);
    if (isOnline()) {
      await db.collection("meals").doc(id).delete().catch(console.warn);
    }
    loadAllDataForCurrentUser();
    if (window.M) M.toast({ html: "Meal deleted" });
  }

  // edit workout
  const editWorkoutBtn = e.target.closest(".edit-workout");
  if (editWorkoutBtn) {
    const id = editWorkoutBtn.dataset.id;
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
        if (window.M) {
          M.updateTextFields();
          M.toast({ html: "Editing workout..." });
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }

  // edit meal
  const editMealBtn = e.target.closest(".edit-meal");
  if (editMealBtn) {
    const id = editMealBtn.dataset.id;
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
        if (window.M) {
          M.updateTextFields();
          M.toast({ html: "Editing meal..." });
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }

  // add-to-plan toast on meals.html cards
  if (e.target.matches(".add-to-plan") || e.target.closest(".add-to-plan")) {
    e.preventDefault();
    if (window.M) {
      M.toast({ html: "Meal added to plan (offline-ready)" });
    }
  }
});

// =====================================
// 11. INITIAL UI STATE ON LOAD
// =====================================
window.addEventListener("load", () => {
  if (!auth || !currentUser) {
    clearUI();
  }
});
