# FitFuel — Workout & Meal Tracker (PWA)

FitFuel is a **Progressive Web App (PWA)** that lets users track their **workouts** and **meals** both **online and offline**.  
It integrates **Firebase Firestore** for cloud data storage and **IndexedDB** for offline caching, ensuring data is never lost — even without an internet connection.

---

## 🚀 Features

### 🔹 PWA Functionality
- Fully installable on desktop and mobile browsers.
- Works offline with cached assets and local storage.
- Service worker handles caching and updates automatically.

### 🔹 Firebase Integration (Online Storage)
- Connected to **Firebase Firestore**.
- Supports Create, Read, Update, and Delete (CRUD) operations.
- Automatically generates unique IDs for each record.
- When online, all data instantly syncs with Firestore.

### 🔹 IndexedDB Integration (Offline Storage)
- When offline, new data is saved locally in **IndexedDB**.
- Once reconnected, data automatically syncs to Firebase.
- Uses the same unique IDs to prevent duplicates or conflicts.

### 🔹 Data Synchronization Logic
- Detects online/offline status dynamically.
- When going back online, all locally stored data (workouts/meals) is uploaded to Firebase.
- Ensures consistent data across sessions and devices.

### 🔹 User Interface
- Responsive Materialize design with separate sections for:
  - Dashboard (workouts, meals, calories)
  - Add/Edit/Delete forms
  - Featured Cards (Workouts & Meals)
- Toast messages notify the user for:
  - Adding new entries
  - Editing or deleting data
  - Offline/online sync events

---

## 🛠️ Technologies Used
- **HTML5**, **CSS3**, **JavaScript (ES6)**
- **Firebase Firestore**
- **IndexedDB**
- **Materialize CSS Framework**
- **Service Workers**
- **PWA Manifest**

---

## ⚙️ How It Works

### 🧩 Online Mode
- When connected to the internet, CRUD actions are performed directly in **Firebase**.
- Updates reflect immediately in both UI and Firestore.

### 💾 Offline Mode
- When offline, data is stored in **IndexedDB**.
- The UI continues to function normally.
- Once the app detects internet restoration, it syncs data automatically to Firebase.

---

## 🧠 Testing Guide

### ✅ Online CRUD Test
1. Open the app normally.
2. Add a workout and meal — verify they appear in Firebase.
3. Edit and delete entries to confirm data updates.

### ✅ Offline Test
1. Disable Wi-Fi or use Chrome’s “Offline” mode in DevTools.
2. Add a workout or meal while offline.
3. Reconnect and refresh.
4. The new data should appear in Firebase — confirming sync success.

### ✅ PWA Test
1. Open the app in Chrome.
2. Click the **Install** icon in the address bar.
3. Launch the installed app — it should open full screen and work offline.

---

## 🧱 Folder Structure
/WorkoutMealprep-PWA
│
├── index.html
├── style.css
├── app.js
├── manifest.webmanifest
├── sw.js
└── /images

---

## 🧾 Notes for Instructor / Grader
- The app **supports full CRUD both online and offline**.
- Firebase and IndexedDB use the same unique ID system.
- Data automatically synchronizes when the network reconnects.
- PWA install prompt works on Chrome, Edge, and Android.
- Tested on multiple browsers and devices for consistency.

---

## 👨‍💻 Developer
**Thol Ucca Kool (UK)**  
Senior Computer Science Student — Fort Hays State University  
Email: uccakoolthol@gmail.com  

---

### 🏁 Status
✅ Completed — all requirements met:
- Firebase integration ✔️  
- IndexedDB offline storage ✔️  
- Sync mechanism ✔️  
- CRUD operations ✔️  
- Service worker caching ✔️  
- UI & PWA functionality ✔️  

---
