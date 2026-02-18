import { parseCsv, applyTransforms, buildChartData, suggestVisual } from './bi.js';

let rawRows = [];
let transforms = [];
let chart;

const els = {
  file: document.getElementById('csvFile'),
  actionType: document.getElementById('actionType'),
  actionForm: document.getElementById('actionForm'),
  addTransformBtn: document.getElementById('addTransformBtn'),
  clearTransformsBtn: document.getElementById('clearTransformsBtn'),
  presetTrimBtn: document.getElementById('presetTrimBtn'),
  undoTransformBtn: document.getElementById('undoTransformBtn'),
  appliedList: document.getElementById('appliedList'),
  searchInput: document.getElementById('searchInput'),
  dataTable: document.getElementById('dataTable'),
  autoVisualBtn: document.getElementById('autoVisualBtn'),
  xCol: document.getElementById('xCol'),
  yCol: document.getElementById('yCol'),
  aggType: document.getElementById('aggType'),
  chartType: document.getElementById('chartType'),
};

function getColumns(rows) {
  return rows[0] ? Object.keys(rows[0]) : [];
}

function formFields(type, cols) {
  const colOptions = cols.map(c => `<option>${c}</option>`).join('');
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
    ? applied.map(a => `<span class="chip">${a.type}</span>`).join('')
    : '<span class="muted">None yet.</span>';
}

function renderTable(rows) {
  const search = els.searchInput.value.trim().toLowerCase();
  const filtered = !search ? rows : rows.filter(r => Object.values(r).some(x => String(x).toLowerCase().includes(search)));
  const cols = getColumns(filtered.length ? filtered : rows);
  const head = `<tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>`;
  const body = filtered.slice(0, 1000).map(r => `<tr>${cols.map(c=>`<td>${r[c] ?? ''}</td>`).join('')}</tr>`).join('');
  els.dataTable.innerHTML = head + body;
}

function renderChart(rows) {
  const x = els.xCol.value;
  const y = els.yCol.value;
  if (!x || !y) return;
  const { labels, values } = buildChartData(rows, x, y, els.aggType.value);
  const ctx = document.getElementById('chart');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: els.chartType.value,
    data: { labels, datasets: [{ label: `${els.aggType.value}(${y})`, data: values }] },
    options: { responsive: true, maintainAspectRatio: false }
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

function refresh() {
  const { data, applied } = applyTransforms(rawRows, transforms);
  renderApplied(applied);
  renderTable(data);

  const cols = getColumns(data);
  [els.xCol, els.yCol].forEach(sel => {
    const current = sel.value;
    sel.innerHTML = cols.map(c => `<option>${c}</option>`).join('');
    if (cols.includes(current)) sel.value = current;
  });

  if (!els.xCol.value || !els.yCol.value) applyVisualSuggestion(data);
  renderChart(data);
}

function refreshForm() {
  els.actionForm.innerHTML = formFields(els.actionType.value, getColumns(rawRows));
}

els.file.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  rawRows = parseCsv(await file.text());
  transforms = [];
  refreshForm();
  refresh();
});

els.actionType.addEventListener('change', refreshForm);
els.addTransformBtn.addEventListener('click', () => {
  transforms.push(getTransformFromForm(els.actionType.value));
  refresh();
});
els.clearTransformsBtn.addEventListener('click', () => { transforms = []; refresh(); });
els.undoTransformBtn.addEventListener('click', () => {
  transforms.pop();
  refresh();
});
els.presetTrimBtn.addEventListener('click', () => {
  transforms.push({ type: 'trim_spaces' });
  refresh();
});
els.autoVisualBtn.addEventListener('click', () => {
  const { data } = applyTransforms(rawRows, transforms);
  applyVisualSuggestion(data);
  renderChart(data);
});
els.searchInput.addEventListener('input', refresh);
els.xCol.addEventListener('change', refresh);
els.yCol.addEventListener('change', refresh);
els.aggType.addEventListener('change', refresh);
els.chartType.addEventListener('change', refresh);
