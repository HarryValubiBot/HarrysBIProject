# Harry BI Web (No-install MVP)

A browser-based BI app (Power BI style starter):
- Upload CSV
- Apply transformations (rename, datatype cast, filters, sort, drop, derived column)
- One-click actions: trim spaces, undo last transform, auto-detect number columns, auto visual suggestion
- Keyboard shortcuts: Ctrl/Cmd+Z undo, Ctrl/Cmd+Enter add transform, / focus search
- Interactive visuals and table
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
