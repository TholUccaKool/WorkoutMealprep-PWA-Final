# 🏋️‍♂️ FitFuel — Workout & Meal Tracker (Progressive Web App)

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

## 🧪 How to Test Locally
Because service workers only run over HTTP(S), start a local server:

```bash
# From the project folder
python3 -m http.server 8080
# then open
http://localhost:8080
