---
trigger: glob
globs: "frontend/src/**/*.{js,jsx,ts,tsx,json,css}"
description: "Frontend editability, styling, and offline rules."
---
# Frontend Rules
- Keep components small, readable, and well-commented so the user can edit layout and text quickly without wrestling with heavy abstractions.
- Do not introduce Redux, Zustand, or complex state libraries; standard React `useState` / `useEffect` is sufficient.
- All preset scenarios, food items, and booth display copy must live in `frontend/src/config/*.json`.
- Never use external image URLs or Google Fonts `<link>` tags; all assets must resolve locally for offline booth reliability.
- Ensure charts remain legible on a 1080p laptop screen at arm's length (large readable axis labels and metric numbers).