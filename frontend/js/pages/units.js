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
      <td><a onclick="navigate('unit-detail',{id:'${u.id}'})" style="font-family:monospace;cursor:pointer">${escHtml(serial(u))}</a></td>
      <td>${unitTypeBadge(u.unit_type)}</td>
      <td>${escHtml(u.model || '—')}</td>
      <td>${escHtml(siteName(u.site_id))}</td>
      <td>${commissionBadge(u.commission_level)}</td>
      <td style="font-size:12px">${fmt(u.warranty_end_date)}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="navigate('unit-detail',{id:'${u.id}'})">Open</button>
        <button class="btn btn-sm btn-secondary" onclick="editUnit('${u.id}')" style="margin-left:4px">Edit</button>
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
  document.getElementById('add-unit-btn').addEventListener('click', () => showUnitForm(null, sites, load));

  window.showUnitDetail = async (id) => {
    const unit = units.find(u => u.id === id);
    if (!unit) return;
    let comm;
    try { comm = await API.commissioning.get(id); } catch { comm = null; }

    const levels = [
      { n: 1, label: 'L1', desc: 'Delivery / Set in Place' },
      { n: 2, label: 'L2', desc: 'Pre-Energization Inspections' },
      { n: 3, label: 'L3', desc: 'Unit Startup' },
      { n: 4, label: 'L4', desc: 'SOO / BMS P2P Verification' },
      { n: 5, label: 'L5', desc: 'Integrated Systems Test' },
    ];

    const commHtml = comm ? `
      <div style="margin-top:16px">
        <div class="section-title">Commissioning Progress</div>
        <div class="commission-track">
          ${levels.map(l => {
            const done = comm[`l${l.n}_completed`];
            const date = comm[`l${l.n}_date`];
            const by = comm[`l${l.n}_completed_by`];
            return `<div class="commission-step ${done ? 'done' : ''}" title="${l.desc}${date?' — '+fmt(date):''}${by?' by '+by:''}">
              <div class="step-check">${done ? '✓' : l.label}</div>
              <div class="step-label">${l.label}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px">
          ${levels.map(l => {
            const done = comm[`l${l.n}_completed`];
            return `<button class="btn btn-sm ${done ? 'btn-secondary' : 'btn-primary'}"
              onclick="toggleCommLevel(${l.n},'${id}',${!done})">
              ${done ? '↩ Undo' : '✓ Complete'} ${l.label}
            </button>`;
          }).join('')}
        </div>
      </div>` : '';

    openModal(`Unit: ${serial(unit)}`, `
      <div class="grid-2" style="gap:12px">
        <div><div class="section-title">Serial</div><div style="font-family:monospace;font-size:16px;color:var(--text)">${escHtml(serial(unit))}</div></div>
        <div><div class="section-title">Type</div>${unitTypeBadge(unit.unit_type)}</div>
        <div><div class="section-title">Model</div><div style="color:var(--text2)">${escHtml(unit.model||'—')}</div></div>
        <div><div class="section-title">Site</div><div style="color:var(--text2)">${escHtml(siteName(unit.site_id))}</div></div>
        <div><div class="section-title">Warranty Start</div><div style="color:var(--text2)">${fmt(unit.warranty_start_date)}</div></div>
        <div><div class="section-title">Warranty End</div><div style="color:var(--text2)">${fmt(unit.warranty_end_date)}</div></div>
        ${unit.notes ? `<div class="full"><div class="section-title">Notes</div><div style="color:var(--text2);white-space:pre-wrap">${escHtml(unit.notes)}</div></div>` : ''}
      </div>
      ${commHtml}
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="navigate('tickets');closeModal()">View Tickets</button>
        <button class="btn btn-primary" onclick="editUnit('${unit.id}');closeModal()">Edit</button>
      </div>`);

    window.toggleCommLevel = async (level, unitId, completed) => {
      try {
        await API.commissioning.updateLevel(unitId, {
          level, completed,
          date: completed ? new Date().toISOString().split('T')[0] : null
        });
        toast(`L${level} ${completed ? 'completed' : 'reset'}`);
        closeModal();
        await load();
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    };
  };

  window.editUnit = (id) => {
    const unit = units.find(u => u.id === id) || {};
    showUnitForm(unit, sites, load);
  };

  await load();
}

function showUnitForm(unit, sites, onSave) {
  const editing = !!unit?.id;
  openModal(editing ? `Edit Unit ${serial(unit)}` : 'New Unit', `
    <form id="unit-form">
      <div class="form-grid">
        <div class="form-group"><label>Job Number *</label><input name="job_number" required value="${escHtml(unit?.job_number||'')}"/></div>
        <div class="form-group"><label>Line Number *</label><input name="line_number" type="number" required value="${unit?.line_number||''}"/></div>
        <div class="form-group"><label>Site *</label>
          <select name="site_id" required>
            <option value="">— Select Site —</option>
            ${sites.map(s => `<option value="${s.id}" ${s.id===unit?.site_id?'selected':''}>${escHtml(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Unit Type *</label>
          <select name="unit_type" required>
            <option value="">— Select Type —</option>
            <option value="chiller" ${unit?.unit_type==='chiller'?'selected':''}>Chiller</option>
            <option value="air_handler" ${unit?.unit_type==='air_handler'?'selected':''}>Air Handler</option>
            <option value="indirect_cooling" ${unit?.unit_type==='indirect_cooling'?'selected':''}>Indirect Cooling</option>
            <option value="indirect_evaporative" ${unit?.unit_type==='indirect_evaporative'?'selected':''}>Indirect Evaporative</option>
            <option value="sycool" ${unit?.unit_type==='sycool'?'selected':''}>SyCool</option>
          </select>
        </div>
        <div class="form-group full"><label>Model / Description</label><input name="model" value="${escHtml(unit?.model||'')}"/></div>
        <div class="form-group"><label>Warranty Start</label><input type="date" name="warranty_start_date" value="${unit?.warranty_start_date||''}"/></div>
        <div class="form-group"><label>Warranty End</label><input type="date" name="warranty_end_date" value="${unit?.warranty_end_date||''}"/></div>
        <div class="form-group full"><label>Notes</label><textarea name="notes">${escHtml(unit?.notes||'')}</textarea></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${editing ? 'Save' : 'Create Unit'}</button>
      </div>
    </form>`);

  document.getElementById('unit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.line_number = parseInt(data.line_number);
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    try {
      if (editing) await API.units.update(unit.id, data);
      else await API.units.create(data);
      toast(editing ? 'Unit updated' : 'Unit created');
      closeModal();
      onSave();
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  });
}
