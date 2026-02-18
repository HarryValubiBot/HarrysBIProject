# Harry BI Web (No-install MVP)

A browser-based BI app (Power BI style starter):
- Upload CSV
- Apply transformations (rename, datatype cast, filters, sort, drop, derived column)
- One-click actions: trim spaces, undo last transform, auto visual suggestion
- Interactive visuals and table
- Minimal-click workflow with quick actions

## Run

```bash
cd bi_app_web
python3 -m http.server 8080
# then open http://localhost:8080
```

## Test

```bash
cd bi_app_web
node --test
```
