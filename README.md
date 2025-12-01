# **FitFuel — Progressive Web App (Final Project)**

A fully offline-capable fitness tracking PWA built with Firebase, IndexedDB, Materialize CSS, and a service worker. Users can log workouts and meals, sync data online, and install the app on any device.

---

## **📌 Features**

* Offline + online support
* Firebase Authentication
* User-specific Firestore data
* IndexedDB offline storage
* Auto-sync when online
* Installable PWA
* Dashboard with charts
* Responsive UI
* CRUD for workouts and meals

---

## **📱 PWA Capabilities**

* `manifest.webmanifest` for installation
* Service worker caching for offline use
* Fully functional when disconnected from the internet

---

## **🗄️ Data Storage**

### **Online (Firebase Firestore)**

* All meals and workouts saved under each user’s UID
* Secure, per-user cloud sync
* Automatic merging of offline data

### **Offline (IndexedDB)**

* Stores workouts and meals when offline
* Saves pending changes in `pendingSync` store
* Syncs automatically when the user goes online
* Prevents duplicates using consistent Firebase IDs

---

## **🔐 Authentication**

* Email + Password login
* Sign up, sign in, sign out
* Only authenticated users can view their workouts/meals
* Data is fully isolated per user

---

## **📊 Dashboard**

Shows last 7 days of:

* Total workouts
* Total meals
* Total calorie count
* Bar chart powered by Chart.js

---

## **⚙️ Technologies Used**

* **HTML, CSS, JavaScript**
* **Materialize CSS**
* **Chart.js**
* **Firebase Authentication**
* **Firestore Database**
* **IndexedDB**
* **Service Worker**
* **Progressive Web App techniques**

---

## **🧠 Challenges & Solutions**

### **1. Syncing Offline + Online Data**

Solved using:

* IndexedDB pendingSync queue
* `syncAllPending()` on reconnect
* Firebase merge writes

### **2. Authentication Redirect Bug**

Solved by:

* Checking auth state in `onAuthStateChanged()`
* Redirecting to home after login

### **3. Caching Issues**

Fixed by:

* Updating service worker version
* Clearing browser storage during testing

---

## **💡 Lessons Learned**

* How to build an installable PWA
* How Firebase Auth works
* Offline-first design patterns
* Service worker caching strategies
* Sync logic & conflict prevention

---

## **🚀 Future Improvements**

* Push notifications
* Weekly analytics
* More macro tracking
* Wearable device integration
* Dark mode

---

## **📁 Repository**

GitHub Repo:
**[https://github.com/TholUccaKool/WorkoutMealprep-PWA-Final](https://github.com/TholUccaKool/WorkoutMealprep-PWA-Final)**

GitHub Pages Live App:
**[https://tholuccakool.github.io/WorkoutMealprep-PWA-Final/](https://tholuccakool.github.io/WorkoutMealprep-PWA-Final/)**

---
