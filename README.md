🔥 FitFuel — Progressive Web App (PWA)
Mobile Web Development – INF654
Final Project by Thol Ucca Kool
📌 1. Overview

FitFuel is a fully installable Progressive Web App (PWA) that helps users track workouts and meals, even without internet access.
It features real-time syncing, secure authentication, offline persistence, and a clean Material UI design.

🛠 2. Technologies Used
Core Stack

HTML, CSS, JavaScript

Materialize CSS (UI components)

Chart.js (data visualization)

Firebase Authentication (email/password login)

Firebase Firestore (cloud database)

IndexedDB (offline storage)

Service Worker + Cache API

PWA Manifest

🔐 3. Authentication

FitFuel uses Firebase Email/Password Authentication.

✔ Sign Up
✔ Sign In
✔ Sign Out
✔ UID-based data isolation (every user only sees their own data)
✔ Automatic redirects after login/logout

📦 4. Data Storage System
🌐 Online Mode — Firestore

Stores workouts & meals in user-specific collections

Data includes: name, calories/minutes, protein, date, createdAt, UID

Supports update & delete operations

📴 Offline Mode — IndexedDB

Stores workouts + meals locally

Stores pending operations inside pendingSync

Works even with 0 internet

🔄 Sync Logic

When the app reconnects:

Read all pending operations

Apply them to Firestore

Clear them from IndexedDB

Refresh UI

Show “Offline data synced” toast

📊 5. Core Features
Workout Tracking

Add workouts

Edit workouts

Delete workouts

Store duration + date

Meal Tracking

Add meals

Edit meals

Delete meals

Track calories, protein, date

Dashboard

Activity summary (last 7 days)

Meal summary (last 7 days)

Total weekly calories

Calorie bar chart (Chart.js)

📱 6. PWA Features

✔ Installable on mobile & desktop
✔ Works offline
✔ Cached pages and assets
✔ Fast loading
✔ Responsive layout

🧪 7. Testing & Validation
Functional

CRUD works both online and offline

Sync restores missing data

Dashboard updates instantly

Cross-Device

Chrome Desktop

OperaGX

Edge

Samsung Tab S9

Persistence

IndexedDB retains data across refresh

Works after closing the browser

Sync triggers immediately when returning online

📘 8. Project Report

A complete project report PDF is included in the submission.
It covers all required sections:

Project Overview

Technical Implementation

Challenges

Lessons Learned

Future Enhancements

🚀 9. Future Improvements

Push notifications

Weekly summary analytics

Workout presets

Macro breakdown charts

Wearable device integration

Dark Mode

📎 10. Important Links
🔗 GitHub Repository

https://github.com/TholUccaKool/WorkoutMealprep-PWA-Final

🌐 Live Website (GitHub Pages)

https://tholuccakool.github.io/WorkoutMealprep-PWA-Final/

© 2025 FitFuel — Built by Thol Ucca Kool
