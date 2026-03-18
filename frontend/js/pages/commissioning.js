const COMM_LEVELS = [
  { n: 1, label: 'L1', desc: 'Delivery / Set in Place' },
  { n: 2, label: 'L2', desc: 'Pre-Energization Inspections' },
  { n: 3, label: 'L3', desc: 'Unit Startup' },
  { n: 4, label: 'L4', desc: 'SOO / BMS Point-to-Point Verification' },
  { n: 5, label: 'L5', desc: 'Integrated Systems Testing' },
];

async function renderCommissioning(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>Commissioning</h1><div class="page-subtitle">L1–L5 progress tracking per unit</div></div>
    </div>
    <div class="toolbar">
      <select id="comm-site-filter" style="width:220px">
        <option value="">All Sites</option>
      </select>
      <select id="comm-level-filter" style="width:160px">
        <option value="">All Levels</option>
        <option value="none">Not Started</option>
        <option value="L1">At L1</option>
        <option value="L2">At L2</option>
        <option value="L3">At L3</option>
        <option value="L4">At L4</option>
        <option value="L5">At L5</option>
        <option value="complete">Complete</option>
      </select>
      <div class="toolbar-spacer"></div>
    </div>
    <div id="comm-grid" style="display:flex;flex-direction:column;gap:12px">
      <div style="color:var(--text3)">Loading…</div>
    </div>`;

  let units = [], sites = [], commMap = {};

  async function load() {
    try {
      [units, sites] = await Promise.all([API.units.list(), API.sites.list()]);

      // Populate site filter
      const siteSelect = document.getElementById('comm-site-filter');
      sites.forEach(s => {
        const o = document.createElement('option');
        o.value = s.id; o.textContent = s.name;
        siteSelect.appendChild(o);
      });

      // Load commissioning data for all units
      await Promise.all(units.map(async u => {
        try { commMap[u.id] = await API.commissioning.get(u.id); } catch {}
      }));

      render();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  function siteName(id) { return sites.find(s => s.id === id)?.name || '—'; }

  function render() {
    const siteFilter = document.getElementById('comm-site-filter').value;
    const levelFilter = document.getElementById('comm-level-filter').value;

    let filtered = units.filter(u => {
      if (siteFilter && u.site_id !== siteFilter) return false;
      if (levelFilter && (u.commission_level || 'none') !== levelFilter) return false;
      return true;
    });

    const grid = document.getElementById('comm-grid');
    if (!filtered.length) {
      grid.innerHTML = '<div style="color:var(--text3);padding:20px">No units match the filter.</div>';
      return;
    }

    grid.innerHTML = filtered.map(u => {
      const comm = commMap[u.id] || {};
      const completedCount = COMM_LEVELS.filter(l => comm[`l${l.n}_completed`]).length;

      return `<div class="card">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
          <div>
            <div style="font-family:monospace;font-size:15px;color:var(--text);font-weight:600">${escHtml(serial(u))}</div>
            <div style="font-size:12px;color:var(--text3)">${escHtml(siteName(u.site_id))} · ${unitTypeBadge(u.unit_type)}</div>
          </div>
          <div class="toolbar-spacer"></div>
          <div style="font-size:12px;color:var(--text3)">${completedCount}/5 levels complete</div>
        </div>
        <div class="commission-track">
          ${COMM_LEVELS.map(l => {
            const done = comm[`l${l.n}_completed`];
            const date = comm[`l${l.n}_date`];
            const by = comm[`l${l.n}_completed_by`];
            const fname = comm[`l${l.n}_checklist_filename`];
            return `<div class="commission-step ${done ? 'done' : ''}" title="${escHtml(l.desc)}${date?' — '+fmt(date):''}${by?' by '+by:''}">
              <div class="step-check">${done ? '✓' : l.label}</div>
              <div class="step-label">${l.label}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="margin-top:10px">
          ${COMM_LEVELS.map(l => {
            const done = comm[`l${l.n}_completed`];
            const date = comm[`l${l.n}_date`];
            const by = comm[`l${l.n}_completed_by`];
            const fname = comm[`l${l.n}_checklist_filename`];
            return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
              <div style="width:28px;text-align:center;font-weight:700;color:${done?'var(--green)':'var(--text3)'}">${l.label}</div>
              <div style="flex:1;color:var(--text2);font-size:12px">${escHtml(l.desc)}</div>
              <div style="font-size:11px;color:var(--text3)">${date?fmt(date):''}${by?' · '+escHtml(by):''}</div>
              ${fname ? `<span style="font-size:11px;color:var(--accent)">📎 ${escHtml(fname)}</span>` : ''}
              <button class="btn btn-sm ${done?'btn-secondary':'btn-primary'}" onclick="commToggle('${u.id}',${l.n},${!done})">
                ${done ? '↩' : '✓ ' + l.label}
              </button>
              ${done ? `<button class="btn btn-sm btn-secondary" onclick="commShowUpload('${u.id}',${l.n},this)">📎 Attach</button>` : ''}
            </div>
            <div id="checklist-panel-${u.id}-${l.n}" style="display:none;padding:8px 0 8px 36px;border-bottom:1px solid var(--border)">
              <div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:12px;display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
                <div class="form-group" style="margin:0;min-width:180px"><label>Completed By</label>
                  <input id="cb-${u.id}-${l.n}" placeholder="Technician name…"/>
                </div>
                <div class="form-group" style="margin:0;min-width:180px"><label>Checklist File (label only)</label>
                  <input id="cf-${u.id}-${l.n}" placeholder="filename.pdf"/>
                </div>
                <button class="btn btn-sm btn-primary" onclick="commSaveChecklist('${u.id}',${l.n})">Save</button>
                <button class="btn btn-sm btn-secondary" onclick="commHideUpload('${u.id}',${l.n})">Cancel</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('');
  }

  document.getElementById('comm-site-filter').addEventListener('change', render);
  document.getElementById('comm-level-filter').addEventListener('change', render);

  window.commToggle = async (unitId, level, completed) => {
    try {
      const date = completed ? new Date().toISOString().split('T')[0] : null;
      commMap[unitId] = await API.commissioning.updateLevel(unitId, { level, completed, date });
      // Refresh unit commission_level locally
      const u = units.find(u => u.id === unitId);
      if (u) u.commission_level = completed ? `L${level}` : (level > 1 ? `L${level-1}` : 'none');
      toast(`L${level} ${completed ? 'completed' : 'reset'} for ${serial(units.find(u=>u.id===unitId)||{})}`);
      render();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  };

  window.commShowUpload = (unitId, level, btn) => {
    const panel = document.getElementById(`checklist-panel-${unitId}-${level}`);
    if (panel) { panel.style.display = 'block'; btn.style.display = 'none'; }
  };

  window.commHideUpload = (unitId, level) => {
    const panel = document.getElementById(`checklist-panel-${unitId}-${level}`);
    if (panel) panel.style.display = 'none';
  };

  window.commSaveChecklist = async (unitId, level) => {
    const completed_by = document.getElementById(`cb-${unitId}-${level}`)?.value || null;
    const checklist_filename = document.getElementById(`cf-${unitId}-${level}`)?.value || null;
    try {
      commMap[unitId] = await API.commissioning.updateLevel(unitId, {
        level, completed: true,
        date: new Date().toISOString().split('T')[0],
        completed_by, checklist_filename,
      });
      toast(`L${level} checklist saved`);
      render();
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  };

  await load();
}
