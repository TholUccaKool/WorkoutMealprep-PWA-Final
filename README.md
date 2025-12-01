FitFuel — Progressive Web App (PWA)
Mobile Web Development — INF654
Final Project by Thol Ucca Kool

FitFuel is a complete Progressive Web App designed to track workouts and meals with full online + offline support, Firebase authentication, and IndexedDB synchronization. The app can be installed on mobile and desktop devices and works even without internet.

📌 Features
🔥 Core Functionality

Add, edit, delete workouts

Add, edit, delete meals

Dashboard showing recent data

7-day calorie chart (Chart.js)

Works fully offline

Syncs automatically when back online

👤 User Authentication (Firebase Auth)

Email + Password login system

Users can sign up and sign in

Sign-out supported

Each user's data is isolated using UID-based filtering

Users only see their own workouts and meals

☁ Online + Offline Data Storage
Firebase Firestore (Online)

Stores synced workouts and meals

Data is stored per-user

Supports updates and deletes

IndexedDB (Offline Mode)

Stores workouts + meals when offline

Stores pending operations (create/update/delete)

On reconnection, pendingSync items are automatically pushed to Firestore

🔄 Sync Logic

FitFuel uses a "pendingSync" store inside IndexedDB:

If offline → save data locally

Save the same entry to pendingSync

When internet returns → syncAllPending() runs

Firestore updates get applied based on the entry UID

This ensures no data loss and prevents conflicting IDs.

⚙ Technical Stack

HTML, CSS, JavaScript

Materialize CSS

Chart.js

Firebase Authentication

Firebase Firestore

IndexedDB

Service Worker

Manifest.json

📦 PWA Features

Add to Home Screen

Works offline

Caches assets with Cache API

Fully responsive

Installable on phone or desktop

🧪 Testing & Validation
✔ Functional Testing

CRUD operations work online

CRUD operations work offline

Data syncs correctly after reconnecting

Dashboard updates instantly

✔ Cross-Device Testing

Tested on:

Chrome Desktop

OperaGX Desktop

Samsung Tab S9

Edge Desktop

✔ Persistence Testing

Data persists across refresh

Data persists when switching tabs

Data persists after reinstall

📄 Project Report PDF

A PDF version of the full project report is included in the repository.
(Or attached in submission depending on requirements.)

📁 GitHub Links

Repository:
https://github.com/TholUccaKool/WorkoutMealprep-PWA-Final

Live Website (GitHub Pages):
https://tholuccakool.github.io/WorkoutMealprep-PWA-Final/

🚀 Future Enhancements

Push notifications

Weekly summary emails

Workout templates

Dark mode

Wearable integration (Garmin, Fitbit, etc.)

© 2025 FitFuel — Created by Thol Ucca Kool
