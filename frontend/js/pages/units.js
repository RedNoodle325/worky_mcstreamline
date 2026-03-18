async function renderUnits(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>Units</h1><div class="page-subtitle">All Munters units by job &amp; serial</div></div>
      <button class="btn btn-primary" id="add-unit-btn">+ New Unit</button>
    </div>
    <div class="card">
      <div class="toolbar">
        <div class="search-bar"><input id="unit-search" placeholder="Search by serial, job#…"/></div>
        <select id="unit-type-filter" style="width:160px">
          <option value="">All Types</option>
          <option value="chiller">Chiller</option>
          <option value="air_handler">Air Handler</option>
          <option value="indirect_cooling">Indirect Cooling</option>
          <option value="indirect_evaporative">Indirect Evap</option>
          <option value="sycool">SyCool</option>
        </select>
        <select id="unit-level-filter" style="width:160px">
          <option value="">All Levels</option>
          <option value="none">None</option>
          <option value="L1">L1</option>
          <option value="L2">L2</option>
          <option value="L3">L3</option>
          <option value="L4">L4</option>
          <option value="L5">L5</option>
          <option value="complete">Complete</option>
        </select>
        <div class="toolbar-spacer"></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Serial</th><th>Type</th><th>Model</th><th>Site</th><th>Commission</th><th>Warranty End</th><th>Actions</th></tr></thead>
          <tbody id="units-body"><tr><td colspan="7" style="color:var(--text3)">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>`;

  let units = [], sites = [];

  async function load() {
    try {
      [units, sites] = await Promise.all([API.units.list(), API.sites.list()]);
      renderTable(units);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  function siteName(id) { return sites.find(s => s.id === id)?.name || id || '—'; }

  function renderTable(data) {
    const tbody = document.getElementById('units-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" style="color:var(--text3)">No units</td></tr>'; return; }
    tbody.innerHTML = data.map(u => `<tr>
      <td><a onclick="navigate('unit-detail',{id:'${u.id}'})" style="font-family:monospace;cursor:pointer;font-weight:500">${escHtml(serial(u))}</a></td>
      <td>${unitTypeBadge(u.unit_type)}</td>
      <td>${escHtml(u.model || '—')}</td>
      <td>${escHtml(siteName(u.site_id))}</td>
      <td>${commissionBadge(u.commission_level)}</td>
      <td style="font-size:12px">${fmt(u.warranty_end_date)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm btn-primary" onclick="navigate('unit-detail',{id:'${u.id}'})">Open</button>
        <button class="btn btn-sm btn-secondary" onclick="navigate('unit-form',{id:'${u.id}',backTo:'units'})" style="margin-left:4px">Edit</button>
        <button class="btn btn-sm btn-secondary" onclick="deleteUnit('${u.id}','${escHtml(serial(u))}')" style="margin-left:4px;color:var(--red)">Delete</button>
      </td>
    </tr>`).join('');
  }

  function filterUnits() {
    const q = document.getElementById('unit-search').value.toLowerCase();
    const type = document.getElementById('unit-type-filter').value;
    const level = document.getElementById('unit-level-filter').value;
    renderTable(units.filter(u => {
      const s = serial(u).toLowerCase();
      if (q && !s.includes(q) && !(u.model||'').toLowerCase().includes(q)) return false;
      if (type && u.unit_type !== type) return false;
      if (level && u.commission_level !== level) return false;
      return true;
    }));
  }

  document.getElementById('unit-search').addEventListener('input', filterUnits);
  document.getElementById('unit-type-filter').addEventListener('change', filterUnits);
  document.getElementById('unit-level-filter').addEventListener('change', filterUnits);
  document.getElementById('add-unit-btn').addEventListener('click', () => navigate('unit-form', { backTo: 'units' }));

  window.deleteUnit = async (id, name) => {
    if (!confirm(`Delete unit "${name}"? This cannot be undone.`)) return;
    try { await API.units.delete(id); toast('Unit deleted'); await load(); }
    catch (e) { toast('Error: ' + e.message, 'error'); }
  };

  await load();
}
