import { parseCsv, applyTransforms, buildChartData, suggestVisual } from './bi.js';

let rawRows = [];
let transforms = [];
let transformedRows = [];
let chart;
let starTables = [];
let starMeta = null;
let columnsSignature = '';
let formColumnsSignature = '';
let cachedColOptionsHtml = '';
let searchTimer;
let currentPage = 1;
const PAGE_SIZE = 100;
const transformCache = new Map();
let rawVersion = 0;

const els = {
  file: document.getElementById('csvFile'),
  dbPath: document.getElementById('dbPath'),
  connectDbBtn: document.getElementById('connectDbBtn'),
  dbStatus: document.getElementById('dbStatus'),
  starSummary: document.getElementById('starSummary'),
  factTable: document.getElementById('factTable'),
  dimTable: document.getElementById('dimTable'),
  dimLabelCol: document.getElementById('dimLabelCol'),
  factMeasureCol: document.getElementById('factMeasureCol'),
  dbAgg: document.getElementById('dbAgg'),
  runDbReportBtn: document.getElementById('runDbReportBtn'),
  actionType: document.getElementById('actionType'),
  actionForm: document.getElementById('actionForm'),
  addTransformBtn: document.getElementById('addTransformBtn'),
  clearTransformsBtn: document.getElementById('clearTransformsBtn'),
  presetTrimBtn: document.getElementById('presetTrimBtn'),
  undoTransformBtn: document.getElementById('undoTransformBtn'),
  optimizeTypesBtn: document.getElementById('optimizeTypesBtn'),
  appliedList: document.getElementById('appliedList'),
  searchInput: document.getElementById('searchInput'),
  dataTable: document.getElementById('dataTable'),
  tableMeta: document.getElementById('tableMeta'),
  prevPageBtn: document.getElementById('prevPageBtn'),
  nextPageBtn: document.getElementById('nextPageBtn'),
  pageInfo: document.getElementById('pageInfo'),
  autoVisualBtn: document.getElementById('autoVisualBtn'),
  clearChartFilterBtn: document.getElementById('clearChartFilterBtn'),
  xCol: document.getElementById('xCol'),
  yCol: document.getElementById('yCol'),
  aggType: document.getElementById('aggType'),
  chartType: document.getElementById('chartType'),
  maxPoints: document.getElementById('maxPoints'),
};

function getColumns(rows) {
  return rows[0] ? Object.keys(rows[0]) : [];
}

function formFields(type, cols) {
  const sig = cols.join('|');
  if (sig !== formColumnsSignature) {
    formColumnsSignature = sig;
    cachedColOptionsHtml = cols.map(c => `<option>${c}</option>`).join('');
  }
  const colOptions = cachedColOptionsHtml;
  if (type === 'rename') return `
    <label>Column</label><select id="f_old">${colOptions}</select>
    <label>New name</label><input id="f_new" />`;
  if (type === 'astype') return `
    <label>Column</label><select id="f_col">${colOptions}</select>
    <label>Datatype</label><select id="f_dtype"><option>number</option><option>string</option><option>date</option></select>`;
  if (type === 'filter_eq') return `
    <label>Column</label><select id="f_col">${colOptions}</select>
    <label>Value</label><input id="f_val" />`;
  if (type === 'filter_range') return `
    <label>Column</label><select id="f_col">${colOptions}</select>
    <div class="row"><div><label>Min</label><input id="f_min" type="number" /></div><div><label>Max</label><input id="f_max" type="number" /></div></div>`;
  if (type === 'sort') return `
    <label>Column</label><select id="f_col">${colOptions}</select>
    <label>Direction</label><select id="f_asc"><option value="true">Ascending</option><option value="false">Descending</option></select>`;
  if (type === 'drop_columns') return `
    <label>Columns (comma-separated)</label><input id="f_cols" placeholder="colA,colB" />`;
  if (type === 'derived_math') return `
    <label>Left</label><select id="f_left">${colOptions}</select>
    <label>Op</label><select id="f_op"><option>+</option><option>-</option><option>*</option><option>/</option></select>
    <label>Right</label><select id="f_right">${colOptions}</select>
    <label>New column name</label><input id="f_newcol" />`;
  return '';
}

function getTransformFromForm(type) {
  if (type === 'rename') return { type, old: v('f_old'), new: v('f_new') };
  if (type === 'astype') return { type, column: v('f_col'), dtype: v('f_dtype') };
  if (type === 'filter_eq') return { type, column: v('f_col'), value: v('f_val') };
  if (type === 'filter_range') return { type, column: v('f_col'), min: numOrNull('f_min'), max: numOrNull('f_max') };
  if (type === 'sort') return { type, column: v('f_col'), ascending: v('f_asc') === 'true' };
  if (type === 'drop_columns') return { type, columns: v('f_cols').split(',').map(s=>s.trim()).filter(Boolean) };
  if (type === 'derived_math') return { type, left: v('f_left'), op: v('f_op'), right: v('f_right'), new_column: v('f_newcol') };
  return { type };
}

function v(id){ return document.getElementById(id)?.value ?? ''; }
function numOrNull(id){ const x=v(id); return x === '' ? null : Number(x); }

function renderApplied(applied) {
  els.appliedList.innerHTML = applied.length
    ? applied.map((a, i) => `<span class="chip">${i+1}. ${a.type}</span>`).join('')
    : '<span class="muted">None yet.</span>';
}

function filterRows(rows) {
  const search = els.searchInput.value.trim().toLowerCase();
  if (!search) return rows;
  return rows.filter(r => Object.values(r).some(x => String(x).toLowerCase().includes(search)));
}

function renderTable(rows) {
  const filtered = filterRows(rows);
  const cols = getColumns(filtered.length ? filtered : rows);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  const head = `<tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>`;
  const body = pageRows.map(r => `<tr>${cols.map(c=>`<td>${r[c] ?? ''}</td>`).join('')}</tr>`).join('');
  els.dataTable.innerHTML = head + body;

  els.tableMeta.textContent = `Rows: ${filtered.length} (showing ${pageRows.length})`;
  els.pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
  els.prevPageBtn.disabled = currentPage <= 1;
  els.nextPageBtn.disabled = currentPage >= totalPages;
}

function renderChart(rows) {
  const x = els.xCol.value;
  const y = els.yCol.value;
  if (!x || !y) return;

  const { labels, values } = buildChartData(rows, x, y, els.aggType.value);
  const maxPoints = Math.max(10, Math.min(500, Number(els.maxPoints.value || 50)));
  const trimmedLabels = labels.slice(0, maxPoints);
  const trimmedValues = values.slice(0, maxPoints);

  const ctx = document.getElementById('chart');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: els.chartType.value,
    data: { labels: trimmedLabels, datasets: [{ label: `${els.aggType.value}(${y})`, data: trimmedValues }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: { legend: { display: true } },
      onClick: (_evt, elements) => {
        if (!elements?.length) return;
        const idx = elements[0].index;
        const label = trimmedLabels[idx];
        els.searchInput.value = String(label ?? '');
        currentPage = 1;
        renderTable(transformedRows);
      }
    }
  });
}

function applyVisualSuggestion(rows) {
  const s = suggestVisual(rows);
  if (!s.xCol || !s.yCol) return;
  if ([...els.xCol.options].some(o => o.value === s.xCol)) els.xCol.value = s.xCol;
  if ([...els.yCol.options].some(o => o.value === s.yCol)) els.yCol.value = s.yCol;
  els.aggType.value = s.agg;
  els.chartType.value = s.chartType;
}

function syncChartSelectors(cols) {
  const sig = cols.join('|');
  if (sig === columnsSignature) return;
  columnsSignature = sig;

  [els.xCol, els.yCol].forEach(sel => {
    const current = sel.value;
    sel.innerHTML = cols.map(c => `<option>${c}</option>`).join('');
    if (cols.includes(current)) sel.value = current;
  });
}

function recomputeTransforms() {
  els.tableMeta.textContent = 'Processing transforms...';
  requestAnimationFrame(() => {
    const t0 = performance.now();
    const cacheKey = `${rawVersion}::${JSON.stringify(transforms)}`;
    const cached = transformCache.get(cacheKey);

    if (cached) {
      transformedRows = cached.data;
      renderApplied(cached.applied);
    } else {
      const { data, applied } = applyTransforms(rawRows, transforms);
      transformedRows = data;
      renderApplied(applied);
      transformCache.set(cacheKey, { data, applied });
      if (transformCache.size > 40) {
        const first = transformCache.keys().next().value;
        transformCache.delete(first);
      }
    }

    syncChartSelectors(getColumns(transformedRows));
    if (!els.xCol.value || !els.yCol.value) applyVisualSuggestion(transformedRows);
    renderTable(transformedRows);
    renderChart(transformedRows);
    const ms = Math.round(performance.now() - t0);
    els.tableMeta.textContent += ` • transform ${ms}ms`;
  });
}

function refreshForm() {
  els.actionForm.innerHTML = formFields(els.actionType.value, getColumns(rawRows));
}

function tableByName(name) {
  return starTables.find(t => t.name === name);
}

function populateModelSelectors() {
  if (!starMeta) return;
  els.factTable.innerHTML = (starMeta.facts || []).map(t => `<option>${t}</option>`).join('');
  els.dimTable.innerHTML = (starMeta.dimensions || []).map(t => `<option>${t}</option>`).join('');

  const dim = tableByName(els.dimTable.value);
  const fact = tableByName(els.factTable.value);
  els.dimLabelCol.innerHTML = (dim?.columns || []).map(c => `<option>${c.name}</option>`).join('');
  els.factMeasureCol.innerHTML = (fact?.columns || []).map(c => `<option>${c.name}</option>`).join('');
}

els.file.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  rawRows = parseCsv(await file.text());
  transforms = [];
  transformedRows = rawRows;
  currentPage = 1;
  rawVersion += 1;
  transformCache.clear();
  columnsSignature = '';
  formColumnsSignature = '';
  refreshForm();
  recomputeTransforms();
});

els.actionType.addEventListener('change', refreshForm);
els.addTransformBtn.addEventListener('click', () => {
  transforms.push(getTransformFromForm(els.actionType.value));
  currentPage = 1;
  recomputeTransforms();
});
els.clearTransformsBtn.addEventListener('click', () => {
  transforms = [];
  currentPage = 1;
  recomputeTransforms();
});
els.undoTransformBtn.addEventListener('click', () => {
  transforms.pop();
  currentPage = 1;
  recomputeTransforms();
});
els.presetTrimBtn.addEventListener('click', () => {
  transforms.push({ type: 'trim_spaces' });
  currentPage = 1;
  recomputeTransforms();
});
els.optimizeTypesBtn.addEventListener('click', () => {
  transforms.push({ type: 'auto_detect_numbers' });
  currentPage = 1;
  recomputeTransforms();
});
els.autoVisualBtn.addEventListener('click', () => {
  applyVisualSuggestion(transformedRows);
  renderChart(transformedRows);
});
els.clearChartFilterBtn.addEventListener('click', () => {
  els.searchInput.value = '';
  currentPage = 1;
  renderTable(transformedRows);
  renderChart(transformedRows);
});
els.searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage = 1;
    renderTable(transformedRows);
    renderChart(filterRows(transformedRows));
  }, 120);
});

[els.xCol, els.yCol, els.aggType, els.chartType, els.maxPoints].forEach(el => {
  el.addEventListener('change', () => renderChart(filterRows(transformedRows)));
});

els.prevPageBtn.addEventListener('click', () => {
  currentPage = Math.max(1, currentPage - 1);
  renderTable(transformedRows);
});
els.nextPageBtn.addEventListener('click', () => {
  currentPage += 1;
  renderTable(transformedRows);
});

els.factTable.addEventListener('change', populateModelSelectors);
els.dimTable.addEventListener('change', populateModelSelectors);
els.runDbReportBtn.addEventListener('click', async () => {
  try {
    if (!starMeta) throw new Error('connect_to_db_first');
    const rel = (starMeta.relationships || []).find(r => r.fromTable === els.factTable.value && r.toTable === els.dimTable.value);
    if (!rel) throw new Error('no_fact_dim_relationship_found');
    const r = await fetch('http://localhost:8787/api/db/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dbPath: els.dbPath.value.trim(),
        factTable: els.factTable.value,
        dimTable: els.dimTable.value,
        dimJoinFrom: rel.fromColumn,
        dimJoinTo: rel.toColumn,
        xColumn: els.dimLabelCol.value,
        yColumn: els.factMeasureCol.value,
        agg: els.dbAgg.value,
      }),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'db_report_failed');

    transformedRows = j.rows.map(x => ({ label: x.label, value: x.value }));
    columnsSignature = '';
    syncChartSelectors(['label', 'value']);
    els.xCol.value = 'label';
    els.yCol.value = 'value';
    els.aggType.value = 'sum';
    renderTable(transformedRows);
    renderChart(transformedRows);
  } catch (e) {
    els.dbStatus.textContent = `Error: ${e.message}`;
  }
});

els.connectDbBtn.addEventListener('click', async () => {
  try {
    els.dbStatus.textContent = 'Connecting...';
    const r = await fetch('http://localhost:8787/api/db/introspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbPath: els.dbPath.value.trim() }),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'connect_failed');
    const star = j.star || { facts: [], dimensions: [], relationships: [] };
    starTables = j.tables || [];
    starMeta = star;
    els.dbStatus.textContent = `Connected: ${j.tables.length} tables`;
    els.starSummary.innerHTML = `Facts: ${star.facts.join(', ') || '(none)'}<br/>Dimensions: ${star.dimensions.join(', ') || '(none)'}<br/>Relationships: ${star.relationships.length}`;
    populateModelSelectors();
  } catch (e) {
    els.dbStatus.textContent = `Error: ${e.message}`;
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    transforms.pop();
    currentPage = 1;
    recomputeTransforms();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    transforms.push(getTransformFromForm(els.actionType.value));
    currentPage = 1;
    recomputeTransforms();
  }
  if (e.key === '/') {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag !== 'input' && tag !== 'textarea') {
      e.preventDefault();
      els.searchInput.focus();
    }
  }
});
