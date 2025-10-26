# 🏋️‍♂️ FitFuel Workout & Meal Tracker (Progressive Web App)

**FitFuel** is a fully functional Progressive Web App (PWA) built with **HTML**, **Materialize CSS**, and **JavaScript**.  
It helps users log workouts, plan meals, and track progress, all while being **installable** and **available offline**.

---

## 🚀 Features
- **Responsive Design:** Built with Materialize CSS for a clean, modern fitness look.  
- **Offline Support:** Service Worker caches core pages and assets for offline use.  
- **Installable App:** Includes a manifest and icons for installation on desktop and mobile.  
- **Local Storage:** Saves workouts and meals so data stays even when offline.  
- **Dashboard:** Shows 7 day summary of workouts, meals, and total calories.  
- **Favorites:** Mark workouts and meals with ⭐ to view them easily later.  
- **Charts:** Tracks calorie intake visually using Chart.js.  
- **Notifications:** Simple workout reminders using the Notifications API.  
- **Custom Offline Page:** Displays a message when there’s no internet connection.

---

## 🧠 Technology Stack
- **HTML5, CSS3, JavaScript (ES6)**  
- **MaterializeCSS** for layout and styling  
- **Chart.js** for calorie tracking visualization  
- **Service Worker API** for offline caching  
- **LocalStorage** for persistent data  
- **GitHub Pages** for deployment

---

## 🧩 Caching Strategy
- **HTML / Navigations:** Network first with fallback to `offline.html`  
- **CSS / JS:** Cache first  
- **Images:** Stale while revalidate  
- **Offline Fallback:** Custom offline page served when connection is lost  

---

## ⚙️ Service Worker, Caching, and Manifest Explained

### 🧩 Service Worker
The `service-worker.js` file is responsible for enabling **offline support**.  
It caches important files during the `install` event, removes old caches on `activate`, and intercepts all network requests on `fetch`.

- **Install Event:** Adds `index.html`, CSS, JS, images, and `offline.html` to cache.
- **Activate Event:** Clears outdated caches.
- **Fetch Event:** 
  - Serves cached content when offline.
  - Updates cache with newer versions when online.

### 🗃️ Caching Strategy
Different file types use different caching strategies:
- **HTML (pages):** *Network-first* — tries to fetch from the internet first, otherwise shows `offline.html`.  
- **CSS/JS:** *Cache-first* — loads from cache for fast performance.  
- **Images:** *Stale-while-revalidate* — serves cached images while updating them in the background.  
- **Offline Page:** Provides a fallback message when no network connection is available.

### 📱 Manifest File
The `manifest.webmanifest` defines how the app appears when installed:
- `name` and `short_name`: App title for homescreen and install dialog.  
- `start_url`: `"./"` — ensures the app opens to the home screen.  
- `display`: `"standalone"` — hides the browser UI when launched.  
- `background_color` and `theme_color`: Match the app’s visual theme.  
- `icons`: Multiple sizes (192–512px), including a *maskable* icon for adaptive design.  
- `screenshots`: Optional, for richer install UI.

Together, the **service worker**, **caching**, and **manifest** make the app installable, fast, and usable offline — fulfilling all PWA core principles.

---

## 🧪 How to Test Locally
Because service workers only run over HTTP(S), start a local server:

```bash
# From the project folder
python3 -m http.server 8080
# then open
http://localhost:8080
