import { parseCsv, applyTransforms, buildChartData, suggestVisual } from './bi.js';

let rawRows = [];
let transforms = [];
let transformedRows = [];
let chart;
let chart2;
let starTables = [];
let starMeta = null;
let columnsSignature = '';
let formColumnsSignature = '';
let cachedColOptionsHtml = '';
let searchTimer;
let currentPage = 1;
let dwColumns = []; 
let dwPreviewTimer;
const PAGE_SIZE = 100;
const transformCache = new Map();
let rawVersion = 0;

const els = {
  file: document.getElementById('csvFile'),
  connType: document.getElementById('connType'),
  sqliteFields: document.getElementById('sqliteFields'),
  azureFields: document.getElementById('azureFields'),
  dbPath: document.getElementById('dbPath'),
  azServer: document.getElementById('azServer'),
  azDatabase: document.getElementById('azDatabase'),
  azUser: document.getElementById('azUser'),
  azPassword: document.getElementById('azPassword'),
  apiBase: document.getElementById('apiBase'),
  connectDbBtn: document.getElementById('connectDbBtn'),
  toggleConnBtn: document.getElementById('toggleConnBtn'),
  connDetails: document.getElementById('connDetails'),
  dbStatus: document.getElementById('dbStatus'),
  starSummary: document.getElementById('starSummary'),
  factTable: document.getElementById('factTable'),
  dimTable: document.getElementById('dimTable'),
  dimLabelCol: document.getElementById('dimLabelCol'),
  factMeasureCol: document.getElementById('factMeasureCol'),
  dbAgg: document.getElementById('dbAgg'),
  reportName: document.getElementById('reportName'),
  saveReportBtn: document.getElementById('saveReportBtn'),
  deleteReportBtn: document.getElementById('deleteReportBtn'),
  savedReportSelect: document.getElementById('savedReportSelect'),
  loadReportBtn: document.getElementById('loadReportBtn'),
  autoDbReportBtn: document.getElementById('autoDbReportBtn'),
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
  chartType2: document.getElementById('chartType2'),
  maxPoints: document.getElementById('maxPoints'),
  viewTransformBtn: document.getElementById('viewTransformBtn'),
  viewVisualBtn: document.getElementById('viewVisualBtn'),
  viewDwBtn: document.getElementById('viewDwBtn'),
  transformSection: document.getElementById('transformSection'),
  visualSection: document.getElementById('visualSection'),
  dwSection: document.getElementById('dwSection'),
  modelSection: document.getElementById('modelSection'),
  dwDimName: document.getElementById('dwDimName'),
  dwSourceTable: document.getElementById('dwSourceTable'),
  dwFilterCol: document.getElementById('dwFilterCol'),
  dwFilterOp: document.getElementById('dwFilterOp'),
  dwFilterVal: document.getElementById('dwFilterVal'),
  dwColumnsGrid: document.getElementById('dwColumnsGrid'),
  dwSelectAllColsBtn: document.getElementById('dwSelectAllColsBtn'),
  dwDeselectAllColsBtn: document.getElementById('dwDeselectAllColsBtn'),
  dwCreateAllBtn: document.getElementById('dwCreateAllBtn'),
  dwRefreshPreviewBtn: document.getElementById('dwRefreshPreviewBtn'),
  dwPreviewMeta: document.getElementById('dwPreviewMeta'),
  dwStatus: document.getElementById('dwStatus'),
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

  const ctx2 = document.getElementById('chart2');
  if (chart2) chart2.destroy();
  chart2 = new Chart(ctx2, {
    type: els.chartType2.value,
    data: { labels: trimmedLabels, datasets: [{ label: `Secondary ${els.aggType.value}(${y})`, data: trimmedValues }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: true } },
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

function getApiBase() {
  const manual = els.apiBase.value.trim();
  if (manual) return manual.replace(/\/$/, '');
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:8787`;
}

function currentConnectionPayload() {
  const connType = els.connType.value;
  if (connType === 'azure') {
    return {
      connType,
      azure: {
        server: els.azServer.value.trim(),
        database: els.azDatabase.value.trim(),
        user: els.azUser.value.trim(),
        password: els.azPassword.value,
      },
    };
  }
  return { connType: 'sqlite', dbPath: els.dbPath.value.trim() };
}

function refreshConnFields() {
  const azure = els.connType.value === 'azure';
  els.azureFields.style.display = azure ? 'block' : 'none';
  els.sqliteFields.style.display = azure ? 'none' : 'block';
}

function setView(mode) {
  const transform = mode === 'transform';
  const visual = mode === 'visual';
  const dw = mode === 'dw';
  els.transformSection.classList.toggle('hidden', !transform);
  els.visualSection.classList.toggle('hidden', !visual);
  els.dwSection.classList.toggle('hidden', !dw);
  els.modelSection.classList.toggle('hidden', dw);
  els.viewTransformBtn.classList.toggle('active', transform);
  els.viewVisualBtn.classList.toggle('active', visual);
  els.viewDwBtn.classList.toggle('active', dw);
}

function setConnectionCollapsed(collapsed) {
  els.connDetails.classList.toggle('hidden', collapsed);
  els.toggleConnBtn.classList.toggle('hidden', false);
  els.toggleConnBtn.textContent = collapsed ? 'Edit connection' : 'Hide connection details';
}

const REPORTS_KEY = 'harry_bi_saved_reports_v1';

function getSavedReports() {
  try { return JSON.parse(localStorage.getItem(REPORTS_KEY) || '{}'); }
  catch { return {}; }
}

function setSavedReports(obj) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(obj));
}

function refreshSavedReportsDropdown() {
  const reports = getSavedReports();
  const names = Object.keys(reports).sort();
  els.savedReportSelect.innerHTML = names.length
    ? names.map(n => `<option>${n}</option>`).join('')
    : '<option value="">(none)</option>';
}

function currentReportConfig() {
  return {
    connType: els.connType.value,
    dbPath: els.dbPath.value.trim(),
    factTable: els.factTable.value,
    dimTable: els.dimTable.value,
    dimLabelCol: els.dimLabelCol.value,
    factMeasureCol: els.factMeasureCol.value,
    dbAgg: els.dbAgg.value,
  };
}

function populateModelSelectors() {
  if (!starMeta) return;
  els.factTable.innerHTML = (starMeta.facts || []).map(t => `<option>${t}</option>`).join('');
  els.dimTable.innerHTML = (starMeta.dimensions || []).map(t => `<option>${t}</option>`).join('');

  const dim = tableByName(els.dimTable.value);
  const fact = tableByName(els.factTable.value);
  const dimCols = dim?.columns || [];
  const factCols = fact?.columns || [];

  els.dimLabelCol.innerHTML = dimCols.map(c => `<option>${c.name}</option>`).join('');
  els.factMeasureCol.innerHTML = factCols.map(c => `<option>${c.name}</option>`).join('');

  const dimNameCol = dimCols.find(c => /name|label|title/i.test(c.name));
  if (dimNameCol) els.dimLabelCol.value = dimNameCol.name;

  const factNumCol = factCols.find(c => /int|real|num|dec|float|double|bigint|smallint|money/i.test(String(c.type || '')) || /amount|sales|cost|qty|value/i.test(c.name));
  if (factNumCol) els.factMeasureCol.value = factNumCol.name;
}

function applyReportConfig(cfg) {
  if (!cfg) return;
  if (cfg.connType) els.connType.value = cfg.connType;
  refreshConnFields();
  if (cfg.dbPath) els.dbPath.value = cfg.dbPath;
  if (cfg.factTable) els.factTable.value = cfg.factTable;
  if (cfg.dimTable) els.dimTable.value = cfg.dimTable;
  populateModelSelectors();
  if (cfg.dimLabelCol) els.dimLabelCol.value = cfg.dimLabelCol;
  if (cfg.factMeasureCol) els.factMeasureCol.value = cfg.factMeasureCol;
  if (cfg.dbAgg) els.dbAgg.value = cfg.dbAgg;
}

function tableByName(name) {
  return starTables.find(t => t.name === name);
}

async function loadDwStgTables() {
  const r = await fetch(`${getApiBase()}/api/dw/stg-tables`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentConnectionPayload())
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'dw_stg_tables_failed');
  const tables = j.tables || [];
  els.dwSourceTable.innerHTML = tables.map(t => `<option>${t}</option>`).join('');
  if (tables.length && !els.dwDimName.value.trim()) els.dwDimName.value = tables[0];
}

function renderDwColumnsGrid() {
  if (!dwColumns.length) {
    els.dwColumnsGrid.innerHTML = '<div class="tiny">Load columns first.</div>';
    return;
  }
  els.dwColumnsGrid.innerHTML = `
    <div style="display:grid;grid-template-columns:auto auto 1fr 1fr;gap:8px;align-items:center;margin-bottom:8px;font-weight:600;" class="tiny">
      <div>Use</div><div>BK</div><div>Source</div><div>Alias</div>
    </div>
  ` + dwColumns.map((c, i) => `
    <div style="display:grid;grid-template-columns:auto auto 1fr 1fr;gap:8px;align-items:center;margin-bottom:6px;">
      <input type="checkbox" data-dw-include="${i}" ${c.include ? 'checked' : ''} />
      <input type="checkbox" data-dw-bk-col="${i}" ${c.bk ? 'checked' : ''} />
      <div class="tiny">${c.name}</div>
      <input data-dw-alias="${i}" value="${c.alias}" />
    </div>
  `).join('');
}

function bindDwGridInputs() {
  els.dwColumnsGrid.querySelectorAll('[data-dw-include]').forEach(el => {
    el.addEventListener('change', () => { dwColumns[Number(el.dataset.dwInclude)].include = el.checked; });
  });
  els.dwColumnsGrid.querySelectorAll('[data-dw-alias]').forEach(el => {
    el.addEventListener('input', () => { dwColumns[Number(el.dataset.dwAlias)].alias = el.value.trim() || dwColumns[Number(el.dataset.dwAlias)].name; });
  });
  els.dwColumnsGrid.querySelectorAll('[data-dw-bk-col]').forEach(el => {
    el.addEventListener('change', () => { dwColumns[Number(el.dataset.dwBkCol)].bk = el.checked; });
  });
}

async function loadDwColumns() {
  const r = await fetch(`${getApiBase()}/api/dw/stg-columns`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...currentConnectionPayload(), sourceTable: els.dwSourceTable.value })
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'dw_stg_columns_failed');
  dwColumns = (j.columns || []).map(c => ({ name: c.name, alias: c.name, include: true, bk: false }));
  els.dwFilterCol.innerHTML = dwColumns.map(c => `<option>${c.name}</option>`).join('');
  renderDwColumnsGrid();
  bindDwGridInputs();
  await refreshDwPreview().catch(() => {});
}

function selectedDwMappings() {
  return dwColumns.filter(c => c.include).map(c => ({ from: c.name, to: c.alias || c.name }));
}

function selectedDwBks() {
  return dwColumns.filter(c => c.include && c.bk).map(c => c.alias || c.name);
}

refreshConnFields();
setView('transform');
els.connType.addEventListener('change', refreshConnFields);
els.viewTransformBtn.addEventListener('click', () => setView('transform'));
els.viewVisualBtn.addEventListener('click', () => setView('visual'));
els.viewDwBtn.addEventListener('click', async () => {
  setView('dw');
  try {
    await loadDwStgTables();
    await loadDwColumns();
  } catch (e) { els.dwStatus.textContent = `Error: ${e.message}`; }
});
els.toggleConnBtn.addEventListener('click', () => {
  const isHidden = els.connDetails.classList.contains('hidden');
  setConnectionCollapsed(!isHidden);
});
els.actionType.addEventListener('change', refreshForm);
els.dwSourceTable.addEventListener('change', () => {
  loadDwColumns().catch(e => { els.dwStatus.textContent = `Error: ${e.message}`; });
});
[els.dwFilterCol, els.dwFilterOp, els.dwFilterVal].forEach(el => {
  el.addEventListener('input', () => {
    clearTimeout(dwPreviewTimer);
    dwPreviewTimer = setTimeout(() => refreshDwPreview().catch(e => { els.dwStatus.textContent = `Error: ${e.message}`; }), 180);
  });
});
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

[els.xCol, els.yCol, els.aggType, els.chartType, els.chartType2, els.maxPoints].forEach(el => {
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
refreshSavedReportsDropdown();
els.saveReportBtn.addEventListener('click', () => {
  const name = els.reportName.value.trim();
  if (!name) return;
  const all = getSavedReports();
  all[name] = currentReportConfig();
  setSavedReports(all);
  refreshSavedReportsDropdown();
  els.savedReportSelect.value = name;
});
els.loadReportBtn.addEventListener('click', () => {
  const name = els.savedReportSelect.value;
  const all = getSavedReports();
  applyReportConfig(all[name]);
});
els.deleteReportBtn.addEventListener('click', () => {
  const name = els.savedReportSelect.value;
  if (!name) return;
  const all = getSavedReports();
  delete all[name];
  setSavedReports(all);
  refreshSavedReportsDropdown();
});
els.runDbReportBtn.addEventListener('click', async () => {
  try { await runDbReport(); } catch (e) { els.dbStatus.textContent = `Error: ${e.message}`; }
});
els.autoDbReportBtn.addEventListener('click', async () => {
  try {
    if (!starMeta) throw new Error('connect_to_db_first');
    const rel = starMeta.relationships?.[0];
    if (!rel) throw new Error('no_relationships_found');
    els.factTable.value = rel.fromTable;
    els.dimTable.value = rel.toTable;
    populateModelSelectors();
    await runDbReport();
  } catch (e) {
    els.dbStatus.textContent = `Error: ${e.message}`;
  }
});

function currentDwFilters() {
  const col = els.dwFilterCol.value;
  const op = els.dwFilterOp.value;
  const val = els.dwFilterVal.value.trim();
  if (!col) return [];
  if ((op === 'eq' || op === 'contains' || op === 'gt' || op === 'lt') && !val) return [];
  return [{ column: col, op, value: val }];
}

async function refreshDwPreview(autoSwitch = false) {
  const columns = selectedDwMappings();
  if (!columns.length) return;
  const payload = {
    ...currentConnectionPayload(),
    sourceTable: els.dwSourceTable.value,
    filters: currentDwFilters(),
    columns,
  };
  const r = await fetch(`${getApiBase()}/api/dw/preview-view`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'dw_preview_failed');
  els.dwPreviewMeta.textContent = `Preview rows: ${j.rows.length}`;
  transformedRows = j.rows || [];
  columnsSignature = '';
  syncChartSelectors(getColumns(transformedRows));
  renderTable(transformedRows);
  renderChart(transformedRows);
  if (autoSwitch) setView('visual');
}

els.dwSelectAllColsBtn.addEventListener('click', () => {
  dwColumns.forEach(c => { c.include = true; });
  renderDwColumnsGrid();
  bindDwGridInputs();
  clearTimeout(dwPreviewTimer);
  dwPreviewTimer = setTimeout(() => refreshDwPreview().catch(e => { els.dwStatus.textContent = `Error: ${e.message}`; }), 150);
});

els.dwDeselectAllColsBtn.addEventListener('click', () => {
  dwColumns.forEach(c => { c.include = false; });
  renderDwColumnsGrid();
  bindDwGridInputs();
  els.dwPreviewMeta.textContent = 'Preview rows: 0';
});

els.dwRefreshPreviewBtn.addEventListener('click', async () => {
  try {
    await refreshDwPreview(true);
  } catch (e) {
    els.dwStatus.textContent = `Error: ${e.message}`;
  }
});

els.dwCreateAllBtn.addEventListener('click', async () => {
  try {
    const dimName = els.dwDimName.value.trim();
    const columns = selectedDwMappings();
    const bkCols = selectedDwBks();
    if (!dimName) throw new Error('dim_name_required');
    if (!columns.length) throw new Error('select_at_least_one_column');
    if (!bkCols.length) throw new Error('select_at_least_one_business_key');

    const basePayload = {
      ...currentConnectionPayload(),
      dimName,
      sourceTable: els.dwSourceTable.value,
      filters: currentDwFilters(),
      columns,
      bks: bkCols.join(','),
    };

    const viewRes = await fetch(`${getApiBase()}/api/dw/create-dim-view`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        ...basePayload,
        viewName: dimName,
      })
    });
    const viewJson = await viewRes.json();
    if (!viewJson.ok) throw new Error(viewJson.error || 'dw_create_dim_view_failed');

    const valRes = await fetch(`${getApiBase()}/api/dw/validate-bks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(basePayload)
    });
    const valJson = await valRes.json();
    if (!valJson.ok) throw new Error(valJson.error || 'dw_validate_bks_failed');
    if (valJson.nullRows > 0 || valJson.duplicateRows > 0) {
      throw new Error(`bk_quality_failed(nulls=${valJson.nullRows},dups=${valJson.duplicateRows})`);
    }

    const dimRes = await fetch(`${getApiBase()}/api/dw/build-dim-auto`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(basePayload)
    });
    const dimJson = await dimRes.json();
    if (!dimJson.ok) throw new Error(dimJson.error || 'dw_build_dim_auto_failed');

    els.dwStatus.textContent = `Created dim.v_${dimName} and dim.${dimName} (BK: ${bkCols.join(', ')})`;
  } catch (e) {
    els.dwStatus.textContent = `Error: ${e.message}`;
  }
});

els.connectDbBtn.addEventListener('click', async () => {
  try {
    els.dbStatus.textContent = 'Testing connection...';
    const test = await fetch(`${getApiBase()}/api/db/connect-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentConnectionPayload()),
    });
    const tj = await test.json();
    if (!tj.ok) throw new Error(tj.error || 'connect_failed');

    els.dbStatus.textContent = 'Connected. Loading metadata...';
    setConnectionCollapsed(true);

    const r = await fetch(`${getApiBase()}/api/db/introspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentConnectionPayload()),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'introspect_failed');

    const star = j.star || { facts: [], dimensions: [], relationships: [] };
    starTables = j.tables || [];
    starMeta = star;
    els.dbStatus.textContent = `Connected: ${j.tables.length} tables`;
    els.starSummary.innerHTML = `Facts: ${star.facts.join(', ') || '(none)'}<br/>Dimensions: ${star.dimensions.join(', ') || '(none)'}<br/>Relationships: ${star.relationships.length}`;
    populateModelSelectors();
    try { await loadDwStgTables(); } catch {}
    if (star.relationships?.length) {
      const rel = star.relationships[0];
      els.factTable.value = rel.fromTable;
      els.dimTable.value = rel.toTable;
      populateModelSelectors();
      await runDbReport();
      setView('visual');
    }
  } catch (e) {
    els.dbStatus.textContent = `Error: ${e.message}`;
    setConnectionCollapsed(false);
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
