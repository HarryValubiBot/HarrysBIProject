export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = vals[i] ?? '');
    return row;
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function applyTransforms(rows, transforms) {
  let data = rows.map(r => ({...r}));
  const applied = [];

  for (const t of transforms) {
    switch (t.type) {
      case 'rename': {
        data = data.map(r => {
          if (!(t.old in r) || !t.new) return r;
          const n = {...r};
          n[t.new] = n[t.old];
          delete n[t.old];
          return n;
        });
        applied.push(t);
        break;
      }
      case 'astype': {
        data = data.map(r => {
          const n = {...r};
          if (!(t.column in n)) return n;
          if (t.dtype === 'number') n[t.column] = Number(n[t.column]);
          if (t.dtype === 'string') n[t.column] = String(n[t.column]);
          if (t.dtype === 'date') n[t.column] = new Date(n[t.column]).toISOString().slice(0,10);
          return n;
        });
        applied.push(t);
        break;
      }
      case 'filter_eq':
        data = data.filter(r => String(r[t.column]) === String(t.value));
        applied.push(t);
        break;
      case 'filter_range':
        data = data.filter(r => {
          const v = Number(r[t.column]);
          if (Number.isNaN(v)) return false;
          if (t.min != null && v < Number(t.min)) return false;
          if (t.max != null && v > Number(t.max)) return false;
          return true;
        });
        applied.push(t);
        break;
      case 'sort':
        data.sort((a,b) => {
          const av = a[t.column], bv = b[t.column];
          if (av == bv) return 0;
          const cmp = String(av).localeCompare(String(bv), undefined, {numeric:true});
          return t.ascending ? cmp : -cmp;
        });
        applied.push(t);
        break;
      case 'drop_columns':
        data = data.map(r => {
          const n = {...r};
          (t.columns || []).forEach(c => delete n[c]);
          return n;
        });
        applied.push(t);
        break;
      case 'derived_math': {
        data = data.map(r => {
          const l = Number(r[t.left]);
          const rr = Number(r[t.right]);
          let val = null;
          if (t.op === '+') val = l + rr;
          if (t.op === '-') val = l - rr;
          if (t.op === '*') val = l * rr;
          if (t.op === '/') val = rr === 0 ? null : l / rr;
          return {...r, [t.new_column]: val};
        });
        applied.push(t);
        break;
      }
      case 'trim_spaces': {
        data = data.map(r => {
          const n = {};
          for (const [k, v] of Object.entries(r)) {
            n[k] = typeof v === 'string' ? v.trim() : v;
          }
          return n;
        });
        applied.push(t);
        break;
      }
    }
  }

  return { data, applied };
}

export function buildChartData(rows, xCol, yCol, agg='sum') {
  const groups = new Map();
  for (const r of rows) {
    const x = r[xCol] ?? '(null)';
    const y = Number(r[yCol]);
    if (agg === 'count') {
      groups.set(x, (groups.get(x) || 0) + 1);
      continue;
    }
    if (Number.isNaN(y)) continue;
    if (!groups.has(x)) groups.set(x, []);
    groups.get(x).push(y);
  }

  const labels = [];
  const values = [];
  for (const [k, v] of groups.entries()) {
    labels.push(k);
    if (agg === 'count') values.push(v);
    else if (agg === 'sum') values.push(v.reduce((a,b)=>a+b,0));
    else if (agg === 'mean') values.push(v.reduce((a,b)=>a+b,0)/v.length);
    else if (agg === 'max') values.push(Math.max(...v));
    else if (agg === 'min') values.push(Math.min(...v));
    else values.push(v.reduce((a,b)=>a+b,0));
  }
  return { labels, values };
}

export function detectColumnTypes(rows) {
  if (!rows.length) return { numeric: [], categorical: [] };
  const cols = Object.keys(rows[0]);
  const numeric = [];
  const categorical = [];

  for (const c of cols) {
    let numCount = 0;
    let total = 0;
    for (const r of rows) {
      const v = r[c];
      if (v === '' || v == null) continue;
      total += 1;
      if (!Number.isNaN(Number(v))) numCount += 1;
    }
    if (total > 0 && numCount / total >= 0.8) numeric.push(c);
    else categorical.push(c);
  }
  return { numeric, categorical };
}

export function suggestVisual(rows) {
  const { numeric, categorical } = detectColumnTypes(rows);
  return {
    xCol: categorical[0] || numeric[0] || '',
    yCol: numeric[0] || categorical[0] || '',
    agg: numeric.length ? 'sum' : 'count',
    chartType: numeric.length ? 'bar' : 'line',
  };
}
