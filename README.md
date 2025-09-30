# FitFuel — Workout & Meal Tracker (PWA Prototype)

A responsive prototype built with **HTML** and **Materialize CSS** that demonstrates core PWA ideas:
installability (manifest), offline support (service worker), and fast repeat visits (caching).

## Features
- Materialize UI with responsive layout (navbar, cards, collapsible lists)
- Pages: Home, Workouts, Meals, About
- Installable via `manifest.webmanifest`
- Offline-ready: basic cache of key pages via `service-worker.js`

## Run Locally
Just open `index.html` in a modern browser. For full service worker behavior,
you'll need to serve files over HTTP(S). The simplest way is using Python:

```bash
# From project folder:
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Deploy to GitHub Pages
1. Push this folder to a public GitHub repo.
2. In repo settings → Pages → set **Branch: main / root**.
3. Access at: `https://<your-username>.github.io/<repo-name>/`

## Notes
- Content and images are placeholders for demo purposes.
- This is a prototype no real data storage or backend is included.
