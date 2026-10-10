# ONC GHARSETU — Implementation Plan

Full-stack realty CRM monorepo. Node 22 / npm 10 confirmed available on the machine.
SQLite via `better-sqlite3` for the server; React 18 + Vite + TailwindCSS for the client.

---

## Phase 1 — Project scaffold & server

### Directories to create
```
ONC_GHARSETU_APP/
├── server/
│   └── routes/
└── client/
    └── src/
        ├── api/
        ├── components/
        └── pages/
```

### Files

- [ ] 1. `package.json` (root)
      Workspace root manifest with `concurrently` devDep.
      Scripts: `dev` (runs server + client in parallel), `install:all`.

- [ ] 2. `server/package.json`
      Dependencies: express, better-sqlite3, cors, dotenv.
      DevDeps: nodemon.
      Scripts: `dev` (nodemon index.js), `start` (node index.js).

- [ ] 3. `server/database.js`
      Opens/creates `gharsetu.db` via better-sqlite3.
      Runs `CREATE TABLE IF NOT EXISTS` for customers, properties, deals, settings.
      Seeds 3–5 sample rows for each table on first run.
      Exports the `db` instance.

- [ ] 4. `server/index.js`
      Express app: cors, json body-parser, mounts `/api/customers`, `/api/properties`,
      `/api/deals`, `/api/matchmaking`, `/api/settings`.
      Listens on port 3001.

- [ ] 5. `server/routes/customers.js`
      CRUD: GET (with optional `?search=`, `?type=`, `?status=`), GET /:id, POST, PUT /:id, DELETE /:id.
      Also GET /:id/matches (delegates to matchmaking logic).

- [ ] 6. `server/routes/properties.js`
      CRUD: GET (with optional `?locality=`, `?type=`, `?status=`, `?min_price=`, `?max_price=`),
      GET /:id, POST, PUT /:id, DELETE /:id.

- [ ] 7. `server/routes/matchmaking.js`
      POST /find — accepts `{ buyer_id }`.
      Scores every `available` property against the buyer's preferences:
      budget 30 pts, location 25 pts, property_type 20 pts, BHK 15 pts, amenities 10 pts.
      Returns results with `score`, `percentage`, `breakdown`, and an AI insight string.
      Minimum threshold 20%. Sorted descending.

- [ ] 8. `server/routes/deals.js`
      CRUD: GET (with optional `?status=`, `?month=`), GET /:id, POST, PUT /:id, DELETE /:id.
      POST / PUT auto-calculates `buyer_brokerage_amount`, `seller_brokerage_amount`,
      `total_brokerage_amount` from deal_amount × percentages.
      GET /stats returns total brokerage month/all-time, deal count, top localities.

- [ ] 9. `server/routes/settings.js`
      GET / returns all settings as `{ key: value }` map.
      PUT / accepts same shape, upserts each key.

**Verify Phase 1**: `cd server && npm install && node index.js`
Expected: `Server running on port 3001` with no errors. Curl `http://localhost:3001/api/settings` returns `{}` or seeded data.

---

## Phase 2 — Client scaffold

- [ ] 10. `client/package.json`
       Dependencies: react, react-dom, react-router-dom, axios.
       DevDeps: vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer.
       Scripts: `dev` (vite), `build` (vite build), `preview`.

- [ ] 11. `client/vite.config.js`
       Registers @vitejs/plugin-react.
       Proxy: `/api` → `http://localhost:3001`.

- [ ] 12. `client/tailwind.config.js`
       Content paths: `./index.html`, `./src/**/*.{js,jsx}`.
       Theme extension: primary `#1e3a5f`, accent `#f0a500`.

- [ ] 13. `client/postcss.config.js`
       Plugins: tailwindcss, autoprefixer.

- [ ] 14. `client/index.html`
       Root HTML with `<div id="root">` and script tag pointing to `src/main.jsx`.

- [ ] 15. `client/src/index.css`
       Tailwind directives (`@tailwind base/components/utilities`).
       Root CSS variables for primary/accent colors.

- [ ] 16. `client/src/main.jsx`
       ReactDOM.createRoot render with `<App />`, imports index.css.

**Verify Phase 2**: `cd client && npm install && npx vite build`
Expected: build completes with no errors.

---

## Phase 3 — Client shared layer

- [ ] 17. `client/src/api/index.js`
       Axios instance with `baseURL: /api`.
       Exports named async functions for every endpoint:
       `getCustomers`, `createCustomer`, `updateCustomer`, `deleteCustomer`,
       `getProperties`, `createProperty`, `updateProperty`, `deleteProperty`,
       `findMatches`, `getDeals`, `getDealStats`, `createDeal`, `updateDeal`, `deleteDeal`,
       `getSettings`, `saveSettings`.

- [ ] 18. `client/src/components/Navbar.jsx`
       Top bar with logo "ONC GHARSETU" (primary bg, gold text).
       Five nav links: Customers, Properties, Matchmaking, Deals, Settings.
       Active link underlined in gold.

- [ ] 19. `client/src/components/Modal.jsx`
       Reusable overlay modal: `title`, `children`, `onClose` props.
       Accessible: focus trap, Escape key closes, backdrop click closes.

- [ ] 20. `client/src/components/Toast.jsx`
       Simple toast notification: success (green), error (red), info (blue).
       Auto-dismisses after 3 s. Renders via React portal.

- [ ] 21. `client/src/components/LoadingSpinner.jsx`
       Centered animated SVG spinner in primary color.

- [ ] 22. `client/src/App.jsx`
       React Router `<BrowserRouter>` with `<Routes>`.
       Route map: `/` → Customers, `/properties`, `/matchmaking`, `/deals`, `/settings`.
       Wraps children in `<Navbar>` and a toast context provider.

---

## Phase 4 — Page implementations

- [ ] 23. `client/src/pages/Customers.jsx`
       Filterable table (search by name/phone, filter by type/status).
       Follow-up badge: yellow "⏰ Follow up" for customers with no update >30 days.
       Actions per row: Edit, Delete, "Find Matches" (navigates to Matchmaking with buyer pre-selected).
       Add/Edit modal with all customer fields; preferred_locations / preferred_bhk / amenities_wishlist as comma-separated tag inputs.

- [ ] 24. `client/src/pages/Properties.jsx`
       Toggleable card-grid / list view.
       Filters: locality, type, status, price range.
       Status badge: green Available, yellow Pending, red Sold.
       Add/Edit modal with all property fields; amenities as tag input.
       AI price suggestion: on locality+type change, calls GET `/api/properties?locality=&type=` and shows avg ₹/sqft.

- [ ] 25. `client/src/pages/Matchmaking.jsx`
       Left panel: buyer selector dropdown (only customers with type buyer/both).
       "Find Matches" button calls POST `/api/matchmaking/find`.
       Right panel: result cards per matched property.
       Score badge color: green ≥80%, yellow 50–79%, orange 20–49%.
       Expandable score breakdown accordion.
       AI insight text (from API response).
       "Create Deal" button per match pre-fills the deals modal.

- [ ] 26. `client/src/pages/Deals.jsx`
       Stats cards at top: total brokerage this month, all-time, deal count, top locality.
       Deals table with columns: property, buyer, seller, date, amount, brokerage, status.
       Add/Edit deal modal:
         - Property and buyer/seller selectors.
         - Brokerage type selector (buyer_only / seller_only / both / split).
         - Percentage inputs; amounts auto-calculate live as user types.
         - Brokers section: add multiple broker rows (name, share %, calculated amount).
       Status badges.

- [ ] 27. `client/src/pages/Settings.jsx`
       Form fields: company name, address, phone, default buyer brokerage %, default seller brokerage %, currency symbol.
       Save calls PUT `/api/settings`.
       Shows saved-toast on success.

---

## Phase 5 — Integration & verification

- [ ] 28. Root `npm install` (installs concurrently).
       `cd server && npm install` (installs express, better-sqlite3, etc.).
       `cd client && npm install` (installs react, vite, tailwind, etc.).

- [ ] 29. Full integration smoke test:
       Run `npm run dev` from root.
       Server must log `Server running on port 3001`.
       Client must be reachable at `http://localhost:5173`.
       Verify all five tabs render without console errors.
       Verify Add Customer → save → row appears in table.
       Verify Find Matches returns scored results.
       Verify Add Deal auto-calculates brokerage amounts.

---

## Key design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Storage | SQLite via better-sqlite3 | As specified; synchronous API simplifies server code |
| JSON columns | Stored as TEXT, parsed in route handlers | better-sqlite3 doesn't auto-serialize; explicit JSON.stringify/parse is clearer |
| Matchmaking location | Server-side route, not a separate service | Keeps deploy simple; algorithm is straightforward scoring |
| AI insights | Template-based strings on server | No external LLM dependency; meaningful, deterministic output |
| Price suggestion | Computed from existing properties data | No external data source needed |
| State management | Local React state + context for toast | App complexity doesn't warrant Redux/Zustand |
| Styling | Tailwind utility classes | Fastest way to hit the exact color spec without a design system |
