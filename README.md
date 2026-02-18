# Harry BI Web (No-install MVP)

A browser-based BI app (Power BI style starter):
- Upload CSV
- Apply transformations (rename, datatype cast, filters, sort, drop, derived column)
- One-click actions: trim spaces, undo last transform, auto-detect number columns, auto visual suggestion
- Keyboard shortcuts: Ctrl/Cmd+Z undo, Ctrl/Cmd+Enter add transform, / focus search
- Interactive visuals and table
- Backend SQL query cache for snappier repeat reports
- Minimal-click workflow with quick actions

## Run

```bash
cd bi_app_web
python3 -m http.server 8080
# then open http://localhost:8080
```

## Backend (for SQL star schema)

```bash
cd bi_app_web
node backend/server.js
# API at http://localhost:8787
```

## Quick start (web + API)

```bash
cd bi_app_web
chmod +x scripts/run_all.sh
./scripts/run_all.sh
```

Then in UI set DB path to:
`/home/jonathan/.openclaw/workspace/bi_app_web/data/star_demo.db`
and click **Connect DB** → **Auto DB report**.

## Azure SQL connection

1. Install backend dependency:
```bash
cd bi_app_web
npm install
```
2. Start backend + web.
3. In app, choose **Connection type = Azure SQL** and fill:
   - server: `<name>.database.windows.net`
   - database
   - user
   - password
4. Click **Connect DB** then **Auto DB report**.

Security notes:
- Password is only sent to backend for the live request.
- Password is not saved in the frontend state or backend cache keys.
- Use a read-only SQL user for BI.

## Demo star-schema DB

```bash
cd bi_app_web
node scripts/create_star_schema.js
# creates data/star_demo.db
```

## Test

```bash
cd bi_app_web
node --test
```
