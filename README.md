# MoneyMate
Run: `node server.js` (Node 18+), then open http://127.0.0.1:3000. No npm install needed.

- `server.js` – REST backend, saves to `data/db.json`
  - GET /api/state, PUT /api/transactions, PUT /api/budgets, DELETE /api/data
- `public/index.html` – full frontend (custom calendar, custom dropdowns, charts, themes)
- Opened without the server (file or static host), the app falls back to browser storage.
- Set `PORT` / `HOST` env vars to change the address (use HOST=0.0.0.0 to expose on your network).
