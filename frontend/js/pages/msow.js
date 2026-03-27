// ── MSOW — Method Statement of Work ──────────────────────────────────────

async function renderMSOW(container, params = {}) {
  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  // Pre-fill from site if siteId param provided
  let prefill = {};
  if (params.siteId) {
    try {
      const site = await API.sites.get(params.siteId);
      const addr = [site.address, site.city, site.state, site.zip_code].filter(Boolean).join(', ');
      prefill.project_name = site.name || site.project_name || '';
      prefill.site_address = addr;
      prefill.cmms_wo      = site.project_number || '';
    } catch (e) {
      // silently ignore prefill errors
    }
  }

  // ── Card helper (same pattern as site-detail) ──────────────────────────
  function colCard(id, title, bodyHtml, open = false) {
    return `<div class="card" style="margin-bottom:16px">
      <div id="${id}-hdr" onclick="msowToggleCard('${id}')"
        style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;padding-bottom:${open ? '12px' : '0'}">
        <div style="display:flex;align-items:center;gap:8px">
          <span id="${id}-chev" style="font-size:11px;color:var(--text3);transition:transform .2s;${open ? 'transform:rotate(90deg)' : ''}">▶</span>
          <div class="card-title" style="margin:0">${title}</div>
        </div>
      </div>
      <div id="${id}-body" style="display:${open ? 'block' : 'none'}">${bodyHtml}</div>
    </div>`;
  }

  // ── Label helper ──────────────────────────────────────────────────────
  function lbl(text, required = false) {
    return `<label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text3);letter-spacing:.05em;margin-bottom:4px">
      ${escHtml(text)}${required ? ' <span style="color:var(--red)">*</span>' : ''}
    </label>`;
  }

  // ── Input helpers ─────────────────────────────────────────────────────
  const inputStyle = `style="width:100%;padding:8px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px"`;
  const taStyle    = (rows) => `style="width:100%;padding:8px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;resize:vertical" rows="${rows}"`;

  function field(id, labelText, type = 'text', required = false, extra = '') {
    if (type === 'textarea') {
      const rows = extra || 3;
      return `<div class="form-group" style="margin-bottom:14px">
        ${lbl(labelText, required)}
        <textarea id="msow-${id}" name="${id}" ${taStyle(rows)}></textarea>
      </div>`;
    }
    return `<div class="form-group" style="margin-bottom:14px">
      ${lbl(labelText, required)}
      <input type="${type}" id="msow-${id}" name="${id}" ${inputStyle} ${extra} />
    </div>`;
  }

  function row2(...fields) {
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${fields.join('')}</div>`;
  }
  function row3(...fields) {
    return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">${fields.join('')}</div>`;
  }

  // ── Section 1 — Cover ─────────────────────────────────────────────────
  const sec1 = `
    ${row3(
      field('date',           'Date',            'date',  true),
      field('equipment_tag',  'Equipment Tag',   'text'),
      field('cmms_wo',        'CMMS WO #',       'text')
    )}
    ${row2(
      field('contractor_name','Contractor\'s Name','text', false),
      field('author_name',    'Author\'s Name',   'text')
    )}
    ${row3(
      field('poc_phone',      'POC Phone',        'tel'),
      field('poc_email',      'POC Email',        'email'),
      field('project_name',   'Project Name',     'text', true)
    )}
    ${field('site_address',   'Site Address',     'text')}
    ${field('task_description','Description of Task / Activity','textarea',false,3)}
    ${row2(
      field('site_supervisor', 'Site Supervisor', 'text'),
      ''
    )}
    ${row2(
      field('supervisor_tel',  'Supervisor Tel',  'tel'),
      field('supervisor_email','Supervisor Email','email')
    )}
    ${row2(
      field('safety_officer',  'Safety Officer',  'text'),
      ''
    )}
    ${row2(
      field('safety_tel',      'Safety Officer Tel',   'tel'),
      field('safety_email',    'Safety Officer Email', 'email')
    )}
    ${field('location_of_work',        'Specific Location of Work on Site', 'textarea',false,2)}
    ${field('documentation_references','Supporting Documentation References','textarea',false,2)}
  `;

  // ── Section 2 — Task Information ──────────────────────────────────────
  const sec2 = `
    ${row3(
      field('start_datetime',  'Estimated Start',    'datetime-local'),
      field('finish_datetime', 'Estimated Finish',   'datetime-local'),
      field('duration',        'Estimated Duration', 'text', false, 'placeholder="e.g. 8 hours"')
    )}
    <div style="margin-bottom:14px">
      ${lbl('Personnel')}
      <table id="msow-personnel-tbl" style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:var(--bg3)">
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Name</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Role / Trade</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Email</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Tel</th>
            <th style="padding:6px 8px;width:32px;border-bottom:1px solid var(--border)"></th>
          </tr>
        </thead>
        <tbody id="msow-personnel-body"></tbody>
      </table>
      <button type="button" class="btn btn-secondary" id="msow-add-person" style="margin-top:8px;font-size:12px">+ Add Person</button>
    </div>
    ${field('calibrated_tools', 'Calibrated Tools (If applicable)', 'textarea', false, 2)}
    ${field('tools_and_materials','Required Equipment, Tools & Materials','textarea',false,3)}
    ${field('temporary_supports', 'Temporary Supports and Props',         'textarea',false,2)}
    <div style="margin-bottom:14px">
      ${lbl('LOTO Required?')}
      <div style="display:flex;gap:20px;margin-top:4px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
          <input type="radio" name="loto_required" id="msow-loto-yes" value="yes" style="accent-color:var(--accent)"> Yes
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
          <input type="radio" name="loto_required" id="msow-loto-no"  value="no"  style="accent-color:var(--accent)" checked> No
        </label>
      </div>
    </div>
    <div id="msow-loto-section" style="display:none">
      ${field('loto_equipment','Equipment / Systems Requiring LOTO','textarea',false,2)}
    </div>
    ${field('staff_training','Specific Staff Training','textarea',false,2)}
  `;

  // ── Section 3 — Sequence of Operations ───────────────────────────────
  const sec3 = `
    <div style="margin-bottom:14px">
      ${lbl('Steps')}
      <table id="msow-steps-tbl" style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:var(--bg3)">
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border);width:80px">Step #</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Description</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border);width:80px">Initials</th>
            <th style="padding:6px 8px;width:32px;border-bottom:1px solid var(--border)"></th>
          </tr>
        </thead>
        <tbody id="msow-steps-body"></tbody>
      </table>
      <button type="button" class="btn btn-secondary" id="msow-add-step" style="margin-top:8px;font-size:12px">+ Add Step</button>
    </div>
    ${field('general_comments','General Comments / Notes','textarea',false,3)}
    <div style="margin-bottom:14px">
      ${lbl('Figures (describe — paste/upload images into Word doc)')}
      <div id="msow-figures-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px"></div>
    </div>
  `;

  // ── Section 4 — Safety & Controls ────────────────────────────────────
  const sec4 = `
    ${field('access_egress',  'Method of Access and Egress','textarea',false,2)}
    ${field('fall_protection','Fall Protection Measures',   'textarea',false,2)}
    ${field('ppe',            'Required PPE',               'textarea',false,2)}
    <div style="margin-bottom:14px">
      ${lbl('Hazardous Substances')}
      <table id="msow-hazmat-tbl" style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:var(--bg3)">
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Name</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Use</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border);width:120px">MSDS/SDS Provided</th>
            <th style="padding:6px 8px;width:32px;border-bottom:1px solid var(--border)"></th>
          </tr>
        </thead>
        <tbody id="msow-hazmat-body"></tbody>
      </table>
      <button type="button" class="btn btn-secondary" id="msow-add-hazmat" style="margin-top:8px;font-size:12px">+ Add Substance</button>
    </div>
    ${field('storage','Storage Arrangements','textarea',false,2)}
    <div style="margin-bottom:14px">
      ${lbl('Permits to Work')}
      <table id="msow-permits-tbl" style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:var(--bg3)">
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Name of Permit</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Description of Task</th>
            <th style="padding:6px 8px;width:32px;border-bottom:1px solid var(--border)"></th>
          </tr>
        </thead>
        <tbody id="msow-permits-body"></tbody>
      </table>
      <button type="button" class="btn btn-secondary" id="msow-add-permit" style="margin-top:8px;font-size:12px">+ Add Permit</button>
    </div>
  `;

  // ── Section 5 — Emergency Procedures ─────────────────────────────────
  const sec5 = `
    ${row2(
      field('soc_number',    'Security Operations Center #', 'tel'),
      field('foc_number',    'Facility Operations Center #', 'tel')
    )}
    ${row2(
      field('first_aider',         'On-Site First Aider Name','text'),
      field('first_aid_location',  'First Aid Box Location',  'text')
    )}
    ${field('hospital_location','Nearest Hospital Location','text')}
    ${field('welfare',         'Welfare Requirements',          'textarea',false,2)}
    ${field('services_others', 'Services to be Supplied by Others','textarea',false,2)}
    ${field('other_comments',  'Other Information and Comments',   'textarea',false,2)}
  `;

  // ── Section 6 — Daily Briefing Record ────────────────────────────────
  const sec6 = `
    ${row3(
      field('briefing_by',       'Briefing Delivered By','text'),
      field('briefing_position', 'Position',             'text'),
      field('briefing_date',     'Briefing Date',        'date')
    )}
    <div style="margin-bottom:14px">
      ${lbl('Acceptance List')}
      <table id="msow-accept-tbl" style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:var(--bg3)">
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Name (Print)</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Signature</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border);width:130px">Date</th>
            <th style="padding:6px 8px;width:32px;border-bottom:1px solid var(--border)"></th>
          </tr>
        </thead>
        <tbody id="msow-accept-body"></tbody>
      </table>
      <button type="button" class="btn btn-secondary" id="msow-add-accept" style="margin-top:8px;font-size:12px">+ Add Person</button>
    </div>
  `;

  // ── Section 7 — Risk Assessment ───────────────────────────────────────
  const sec7 = `
    ${row3(
      field('ra_date',        'RA Date',      'date'),
      field('ra_assessed_by', 'Assessed By',  'text'),
      field('ra_checked_by',  'Checked By',   'text')
    )}
    ${row2(
      field('ra_location',    'Location',     'text'),
      ''
    )}
    ${field('ra_task',      'Task Description',           'textarea',false,2)}
    ${field('ra_equipment', 'Equipment / Substances Used', 'textarea',false,2)}
    <div style="margin-bottom:14px">
      ${lbl('Hazard Assessment')}
      <div style="overflow-x:auto">
        <table id="msow-hazards-tbl" style="width:100%;border-collapse:collapse;font-size:12px;min-width:900px">
          <thead>
            <tr style="background:var(--bg3)">
              <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Hazard</th>
              <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Persons at Risk</th>
              <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Existing Controls</th>
              <th style="padding:6px 8px;text-align:center;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border);width:48px">L</th>
              <th style="padding:6px 8px;text-align:center;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border);width:48px">S</th>
              <th style="padding:6px 8px;text-align:center;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border);width:48px">R</th>
              <th style="padding:6px 8px;text-align:left;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border)">Further Controls</th>
              <th style="padding:6px 8px;text-align:center;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border);width:52px">Res. L</th>
              <th style="padding:6px 8px;text-align:center;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border);width:52px">Res. S</th>
              <th style="padding:6px 8px;text-align:center;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border);width:52px">Res. RR</th>
              <th style="padding:6px 8px;width:32px;border-bottom:1px solid var(--border)"></th>
            </tr>
          </thead>
          <tbody id="msow-hazards-body"></tbody>
        </table>
      </div>
      <button type="button" class="btn btn-secondary" id="msow-add-hazard" style="margin-top:8px;font-size:12px">+ Add Hazard</button>
    </div>
    <!-- Risk reference table -->
    <div style="margin-top:20px">
      ${lbl('Risk Rating Reference')}
      <div style="overflow-x:auto;margin-top:6px">
        <table style="border-collapse:collapse;font-size:12px;width:auto">
          <thead>
            <tr style="background:var(--bg3)">
              <th style="padding:5px 10px;border:1px solid var(--border);color:var(--text2)">Rating</th>
              <th style="padding:5px 10px;border:1px solid var(--border);color:var(--text2)">Score (L×S)</th>
              <th style="padding:5px 10px;border:1px solid var(--border);color:var(--text2)">Risk Level</th>
              <th style="padding:5px 10px;border:1px solid var(--border);color:var(--text2)">Action Required</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:5px 10px;border:1px solid var(--border);text-align:center"><span style="background:#22c55e;color:#fff;border-radius:4px;padding:2px 8px;font-weight:600">Low</span></td>
              <td style="padding:5px 10px;border:1px solid var(--border);text-align:center">1 – 6</td>
              <td style="padding:5px 10px;border:1px solid var(--border)">Acceptable</td>
              <td style="padding:5px 10px;border:1px solid var(--border)">No further action required</td>
            </tr>
            <tr>
              <td style="padding:5px 10px;border:1px solid var(--border);text-align:center"><span style="background:#eab308;color:#fff;border-radius:4px;padding:2px 8px;font-weight:600">Medium</span></td>
              <td style="padding:5px 10px;border:1px solid var(--border);text-align:center">8 – 16</td>
              <td style="padding:5px 10px;border:1px solid var(--border)">Moderate</td>
              <td style="padding:5px 10px;border:1px solid var(--border)">Further controls required; management review</td>
            </tr>
            <tr>
              <td style="padding:5px 10px;border:1px solid var(--border);text-align:center"><span style="background:#ef4444;color:#fff;border-radius:4px;padding:2px 8px;font-weight:600">High</span></td>
              <td style="padding:5px 10px;border:1px solid var(--border);text-align:center">20 – 25</td>
              <td style="padding:5px 10px;border:1px solid var(--border)">Unacceptable</td>
              <td style="padding:5px 10px;border:1px solid var(--border)">Stop work; immediate corrective action</td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top:8px;font-size:11px;color:var(--text3)">
          L = Likelihood (1 = Rare, 5 = Almost Certain) &nbsp;·&nbsp; S = Severity (1 = Negligible, 5 = Catastrophic) &nbsp;·&nbsp; R = Risk Rating (L × S)
        </div>
      </div>
    </div>
  `;

  // ── Load sites for selector ──────────────────────────────────────────
  let allSites = [];
  try { allSites = await API.sites.list(); } catch {}

  // State: currently loaded draft
  let currentDraftId = params.draftId || null;
  let currentSiteId  = params.siteId  || null;

  // ── Full page render ──────────────────────────────────────────────────
  const siteOptions = allSites.map(s =>
    `<option value="${s.id}"${s.id === currentSiteId ? ' selected' : ''}>${escHtml(s.name || s.project_name)}</option>`
  ).join('');

  container.innerHTML = `
    <div class="page-header" style="margin-bottom:4px">
      <div>
        <h1>Method Statement of Work</h1>
        <div class="page-subtitle">Munters Global Template</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button type="button" class="btn btn-primary" id="msow-save-btn" style="display:flex;align-items:center;gap:6px">💾 Save</button>
      </div>
    </div>

    <!-- Site + Draft selector bar -->
    <div class="card" style="margin-bottom:16px;padding:12px 16px">
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px">
          <label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;white-space:nowrap">Site</label>
          <select id="msow-site-select" style="padding:6px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;min-width:200px">
            <option value="">— No site —</option>
            ${siteOptions}
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <label style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;white-space:nowrap">Draft</label>
          <select id="msow-draft-select" style="padding:6px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;min-width:200px">
            <option value="">— New MSOW —</option>
          </select>
        </div>
        <input id="msow-draft-name" placeholder="Draft name…" value="" style="padding:6px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;min-width:180px" />
        <div style="flex:1"></div>
        <button type="button" id="msow-clear-draft" class="btn btn-secondary" style="font-size:11px;padding:4px 12px">New Blank</button>
        <button type="button" id="msow-delete-draft" class="btn btn-secondary" style="font-size:11px;padding:4px 12px;color:var(--red);border-color:var(--red);display:none">Delete Draft</button>
      </div>
      <div id="msow-draft-status" style="font-size:11px;color:var(--text3);margin-top:6px"></div>
    </div>

    ${colCard('msow-s1', 'Section 1 — Cover Information',       sec1, true)}
    ${colCard('msow-s2', 'Section 2 — Task Information',        sec2)}
    ${colCard('msow-s3', 'Section 3 — Sequence of Operations',  sec3)}
    ${colCard('msow-s4', 'Section 4 — Safety & Controls',       sec4)}
    ${colCard('msow-s5', 'Section 5 — Emergency Procedures',    sec5)}
    ${colCard('msow-s6', 'Section 6 — Daily Briefing Record',   sec6)}
    ${colCard('msow-s7', 'Section 7 — Risk Assessment',         sec7)}

    <div style="display:flex;justify-content:flex-end;padding:8px 0 32px;gap:8px">
      <button type="button" class="btn btn-primary" id="msow-save-btn-2">💾 Save Draft</button>
    </div>
  `;

  // ── Default field values ──────────────────────────────────────────────
  const setVal = (id, val) => {
    const el = document.getElementById(`msow-${id}`);
    if (el) el.value = val;
  };
  setVal('contractor_name', 'Munters Corporation');
  setVal('date', new Date().toISOString().slice(0, 10));

  // Apply site prefill
  Object.entries(prefill).forEach(([k, v]) => setVal(k, v));

  // ── Collapsible card toggle ────────────────────────────────────────────
  window.msowToggleCard = function(id) {
    const body = document.getElementById(id + '-body');
    const chev = document.getElementById(id + '-chev');
    const hdr  = document.getElementById(id + '-hdr');
    if (!body) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    if (chev) chev.style.transform = open ? '' : 'rotate(90deg)';
    if (hdr)  hdr.style.paddingBottom = open ? '0' : '12px';
  };

  // ── Table row builders ────────────────────────────────────────────────
  const cellInput = (name, type = 'text', ph = '') =>
    `<input type="${type}" data-field="${name}" placeholder="${ph}" ${inputStyle.replace('width:100%','width:100%')} />`;

  const cellSelect = (name, opts) =>
    `<select data-field="${name}" style="padding:6px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;width:100%">
      ${opts.map(o => `<option value="${o}">${o}</option>`).join('')}
    </select>`;

  const delBtn = (tblId) =>
    `<button type="button" onclick="msowDelRow(this,'${tblId}')"
      style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;line-height:1;padding:4px" title="Remove">×</button>`;

  const trStyle = `style="border-bottom:1px solid var(--border)"`;

  function addPersonnelRow(data = {}) {
    const tr = document.createElement('tr');
    tr.setAttribute('style','border-bottom:1px solid var(--border)');
    tr.innerHTML = `
      <td style="padding:4px 6px">${cellInput('name','text','Full name')}</td>
      <td style="padding:4px 6px">${cellInput('role','text','Role / Trade')}</td>
      <td style="padding:4px 6px">${cellInput('email','email','email@example.com')}</td>
      <td style="padding:4px 6px">${cellInput('tel','tel','+1...')}</td>
      <td style="padding:4px 6px;text-align:center">${delBtn('personnel')}</td>`;
    if (data.name)  tr.querySelector('[data-field="name"]').value  = data.name;
    if (data.role)  tr.querySelector('[data-field="role"]').value  = data.role;
    if (data.email) tr.querySelector('[data-field="email"]').value = data.email;
    if (data.tel)   tr.querySelector('[data-field="tel"]').value   = data.tel;
    document.getElementById('msow-personnel-body').appendChild(tr);
  }

  function addStepRow(data = {}, idx = null) {
    const body = document.getElementById('msow-steps-body');
    const num  = idx !== null ? idx : body.children.length + 1;
    const tr   = document.createElement('tr');
    tr.setAttribute('style','border-bottom:1px solid var(--border)');
    tr.innerHTML = `
      <td style="padding:4px 6px">${cellInput('number','text', String(num))}</td>
      <td style="padding:4px 6px">${cellInput('description','text','Step description…')}</td>
      <td style="padding:4px 6px">${cellInput('initials','text','')}</td>
      <td style="padding:4px 6px;text-align:center">${delBtn('steps')}</td>`;
    if (data.number      !== undefined) tr.querySelector('[data-field="number"]').value      = data.number;
    if (data.description !== undefined) tr.querySelector('[data-field="description"]').value = data.description;
    if (data.initials    !== undefined) tr.querySelector('[data-field="initials"]').value    = data.initials;
    if (!data.number) tr.querySelector('[data-field="number"]').value = String(num);
    body.appendChild(tr);
  }

  function addHazmatRow(data = {}) {
    const tr = document.createElement('tr');
    tr.setAttribute('style','border-bottom:1px solid var(--border)');
    tr.innerHTML = `
      <td style="padding:4px 6px">${cellInput('name','text','Substance name')}</td>
      <td style="padding:4px 6px">${cellInput('use','text','How used')}</td>
      <td style="padding:4px 6px">${cellSelect('msds',['Y','N'])}</td>
      <td style="padding:4px 6px;text-align:center">${delBtn('hazmat')}</td>`;
    if (data.name) tr.querySelector('[data-field="name"]').value = data.name;
    if (data.use)  tr.querySelector('[data-field="use"]').value  = data.use;
    if (data.msds) tr.querySelector('[data-field="msds"]').value = data.msds;
    document.getElementById('msow-hazmat-body').appendChild(tr);
  }

  function addPermitRow(data = {}) {
    const tr = document.createElement('tr');
    tr.setAttribute('style','border-bottom:1px solid var(--border)');
    tr.innerHTML = `
      <td style="padding:4px 6px">${cellInput('name','text','Permit name')}</td>
      <td style="padding:4px 6px">${cellInput('description','text','Task description')}</td>
      <td style="padding:4px 6px;text-align:center">${delBtn('permits')}</td>`;
    if (data.name)        tr.querySelector('[data-field="name"]').value        = data.name;
    if (data.description) tr.querySelector('[data-field="description"]').value = data.description;
    document.getElementById('msow-permits-body').appendChild(tr);
  }

  function addAcceptRow(data = {}) {
    const tr = document.createElement('tr');
    tr.setAttribute('style','border-bottom:1px solid var(--border)');
    tr.innerHTML = `
      <td style="padding:4px 6px">${cellInput('name','text','Name')}</td>
      <td style="padding:4px 6px">${cellInput('signature','text','Signature')}</td>
      <td style="padding:4px 6px">${cellInput('date','date','')}</td>
      <td style="padding:4px 6px;text-align:center">${delBtn('accept')}</td>`;
    if (data.name)      tr.querySelector('[data-field="name"]').value      = data.name;
    if (data.signature) tr.querySelector('[data-field="signature"]').value = data.signature;
    if (data.date)      tr.querySelector('[data-field="date"]').value      = data.date;
    document.getElementById('msow-accept-body').appendChild(tr);
  }

  function ratingBadge(r) {
    if (!r || isNaN(r)) return `<span style="color:var(--text3)">—</span>`;
    const n = Number(r);
    const bg = n <= 6 ? '#22c55e' : n <= 16 ? '#eab308' : '#ef4444';
    return `<span style="background:${bg};color:#fff;border-radius:4px;padding:2px 6px;font-weight:700;font-size:12px">${n}</span>`;
  }

  function addHazardRow(data = {}) {
    const ls = ['','1','2','3','4','5'];
    const sel = (field, val) => `<select data-field="${field}" class="msow-hz-sel"
        style="padding:5px 4px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;width:100%;text-align:center">
        ${ls.map(v => `<option value="${v}" ${v == val ? 'selected' : ''}>${v || '—'}</option>`).join('')}
      </select>`;

    const tr = document.createElement('tr');
    tr.setAttribute('style','border-bottom:1px solid var(--border)');
    tr.innerHTML = `
      <td style="padding:4px 5px">${cellInput('hazard','text','Hazard description')}</td>
      <td style="padding:4px 5px">${cellInput('persons_at_risk','text','Who is at risk')}</td>
      <td style="padding:4px 5px">${cellInput('existing_controls','text','Controls in place')}</td>
      <td style="padding:4px 5px;text-align:center">${sel('likelihood', data.likelihood || '')}</td>
      <td style="padding:4px 5px;text-align:center">${sel('severity',   data.severity   || '')}</td>
      <td style="padding:4px 5px;text-align:center" data-r-cell="1"><span style="color:var(--text3)">—</span></td>
      <td style="padding:4px 5px">${cellInput('further_controls','text','Further controls')}</td>
      <td style="padding:4px 5px;text-align:center">${sel('residual_likelihood', data.residual_likelihood || '')}</td>
      <td style="padding:4px 5px;text-align:center">${sel('residual_severity',   data.residual_severity   || '')}</td>
      <td style="padding:4px 5px;text-align:center" data-rr-cell="1"><span style="color:var(--text3)">—</span></td>
      <td style="padding:4px 5px;text-align:center">${delBtn('hazards')}</td>`;

    // Populate text fields
    const textFields = ['hazard','persons_at_risk','existing_controls','further_controls'];
    textFields.forEach(f => { if (data[f]) tr.querySelector(`[data-field="${f}"]`).value = data[f]; });

    // Auto-calc R badges
    function updateRatings() {
      const L  = Number(tr.querySelector('[data-field="likelihood"]').value)          || 0;
      const S  = Number(tr.querySelector('[data-field="severity"]').value)             || 0;
      const RL = Number(tr.querySelector('[data-field="residual_likelihood"]').value)  || 0;
      const RS = Number(tr.querySelector('[data-field="residual_severity"]').value)    || 0;
      tr.querySelector('[data-r-cell]').innerHTML  = ratingBadge(L && S  ? L * S  : null);
      tr.querySelector('[data-rr-cell]').innerHTML = ratingBadge(RL && RS ? RL * RS : null);
    }
    tr.querySelectorAll('.msow-hz-sel').forEach(s => s.addEventListener('change', () => { updateRatings(); msowSaveDraft(); }));
    updateRatings();

    document.getElementById('msow-hazards-body').appendChild(tr);
  }

  // ── Figure slots ─────────────────────────────────────────────────────
  function renderFigures(saved = []) {
    const grid = document.getElementById('msow-figures-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const desc = (saved[i] && saved[i].description) ? saved[i].description : '';
      const slot = document.createElement('div');
      slot.style.cssText = 'background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px';
      slot.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Figure ${i + 1}</div>
        <textarea data-fig="${i}" rows="2" placeholder="Caption / description…"
          style="width:100%;padding:7px 9px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;resize:vertical">${escHtml(desc)}</textarea>
        <div style="font-size:10px;color:var(--text3);margin-top:4px">Paste or upload image into Word doc</div>`;
      grid.appendChild(slot);
    }
  }
  renderFigures();

  // ── Seed default rows ─────────────────────────────────────────────────
  for (let i = 0; i < 3; i++) addPersonnelRow();
  for (let i = 1; i <= 5; i++) addStepRow({}, i);
  addHazmatRow();
  addPermitRow();
  for (let i = 0; i < 3; i++) addAcceptRow();
  addHazardRow();
  addHazardRow();

  // ── Button event listeners ────────────────────────────────────────────
  document.getElementById('msow-add-person').addEventListener('click', () => { addPersonnelRow(); msowSaveDraft(); });
  document.getElementById('msow-add-step').addEventListener('click', () => {
    const body = document.getElementById('msow-steps-body');
    addStepRow({}, body.children.length + 1);
    msowSaveDraft();
  });
  document.getElementById('msow-add-hazmat').addEventListener('click', () => { addHazmatRow(); msowSaveDraft(); });
  document.getElementById('msow-add-permit').addEventListener('click', () => { addPermitRow(); msowSaveDraft(); });
  document.getElementById('msow-add-accept').addEventListener('click', () => { addAcceptRow(); msowSaveDraft(); });
  document.getElementById('msow-add-hazard').addEventListener('click', () => { addHazardRow(); msowSaveDraft(); });

  // ── LOTO toggle ───────────────────────────────────────────────────────
  function updateLotoVis() {
    const yes = document.getElementById('msow-loto-yes').checked;
    document.getElementById('msow-loto-section').style.display = yes ? 'block' : 'none';
  }
  document.getElementById('msow-loto-yes').addEventListener('change', updateLotoVis);
  document.getElementById('msow-loto-no').addEventListener('change',  updateLotoVis);

  // ── Row deletion ─────────────────────────────────────────────────────
  window.msowDelRow = function(btn, tblId) {
    btn.closest('tr').remove();
    msowSaveDraft();
  };

  // ── collect form data ─────────────────────────────────────────────────
  function tableRows(tbodyId, fields) {
    const rows = [];
    document.getElementById(tbodyId).querySelectorAll('tr').forEach(tr => {
      const obj = {};
      fields.forEach(f => {
        const el = tr.querySelector(`[data-field="${f}"]`);
        obj[f] = el ? el.value : '';
      });
      rows.push(obj);
    });
    return rows;
  }

  function collectFormData() {
    const g = (id) => {
      const el = document.getElementById(`msow-${id}`);
      return el ? el.value : '';
    };

    const figures = [];
    document.querySelectorAll('[data-fig]').forEach(ta => {
      figures[Number(ta.dataset.fig)] = { description: ta.value };
    });

    return {
      date:                    g('date'),
      equipment_tag:           g('equipment_tag'),
      cmms_wo:                 g('cmms_wo'),
      contractor_name:         g('contractor_name'),
      author_name:             g('author_name'),
      poc_phone:               g('poc_phone'),
      poc_email:               g('poc_email'),
      project_name:            g('project_name'),
      site_address:            g('site_address'),
      task_description:        g('task_description'),
      site_supervisor:         g('site_supervisor'),
      supervisor_tel:          g('supervisor_tel'),
      supervisor_email:        g('supervisor_email'),
      safety_officer:          g('safety_officer'),
      safety_tel:              g('safety_tel'),
      safety_email:            g('safety_email'),
      location_of_work:        g('location_of_work'),
      documentation_references:g('documentation_references'),
      start_datetime:          g('start_datetime'),
      finish_datetime:         g('finish_datetime'),
      duration:                g('duration'),
      personnel:               tableRows('msow-personnel-body', ['name','role','email','tel']),
      calibrated_tools:        g('calibrated_tools'),
      tools_and_materials:     g('tools_and_materials'),
      temporary_supports:      g('temporary_supports'),
      loto_required:           document.getElementById('msow-loto-yes')?.checked || false,
      loto_equipment:          g('loto_equipment'),
      staff_training:          g('staff_training'),
      steps:                   tableRows('msow-steps-body', ['number','description','initials']),
      general_comments:        g('general_comments'),
      figures:                 figures,
      access_egress:           g('access_egress'),
      fall_protection:         g('fall_protection'),
      ppe:                     g('ppe'),
      hazardous_substances:    tableRows('msow-hazmat-body', ['name','use','msds']),
      storage:                 g('storage'),
      permits:                 tableRows('msow-permits-body', ['name','description']),
      soc_number:              g('soc_number'),
      foc_number:              g('foc_number'),
      first_aider:             g('first_aider'),
      first_aid_location:      g('first_aid_location'),
      hospital_location:       g('hospital_location'),
      welfare:                 g('welfare'),
      services_others:         g('services_others'),
      other_comments:          g('other_comments'),
      briefing_by:             g('briefing_by'),
      briefing_position:       g('briefing_position'),
      briefing_date:           g('briefing_date'),
      acceptance_list:         tableRows('msow-accept-body', ['name','signature','date']),
      ra_date:                 g('ra_date'),
      ra_assessed_by:          g('ra_assessed_by'),
      ra_checked_by:           g('ra_checked_by'),
      ra_location:             g('ra_location'),
      ra_task:                 g('ra_task'),
      ra_equipment:            g('ra_equipment'),
      hazards:                 tableRows('msow-hazards-body',
                                 ['hazard','persons_at_risk','existing_controls',
                                  'likelihood','severity','further_controls',
                                  'residual_likelihood','residual_severity']),
    };
  }

  // ── Auto-save (localStorage + status indicator) ─────────────────────
  let saveTimer = null;
  function msowSaveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem('msow-draft', JSON.stringify(collectFormData())); }
      catch (e) { /* quota exceeded — ignore */ }
      const statusEl = document.getElementById('msow-draft-status');
      if (statusEl) statusEl.textContent = 'Draft auto-saved locally · ' + new Date().toLocaleTimeString();
    }, 500);
  }

  // Make accessible to row-delete and select handlers
  window.msowSaveDraft = msowSaveDraft;

  // Attach input listener to the container for auto-save
  container.addEventListener('input', msowSaveDraft);
  container.addEventListener('change', msowSaveDraft);

  // ── Save to server ──────────────────────────────────────────────────
  async function saveToServer() {
    const data = collectFormData();
    const name = document.getElementById('msow-draft-name').value.trim()
      || data.project_name || 'Untitled MSOW';
    const siteId = document.getElementById('msow-site-select').value || null;

    try {
      if (currentDraftId) {
        await API.msow.update(currentDraftId, { name, form_data: data });
        toast('Draft saved');
      } else {
        const created = await API.msow.create({ site_id: siteId, name, form_data: data });
        currentDraftId = created.id;
        currentSiteId = siteId;
        toast('Draft created');
        document.getElementById('msow-delete-draft').style.display = '';
      }
      const statusEl = document.getElementById('msow-draft-status');
      if (statusEl) statusEl.textContent = `Saved to server · ${name} · ${new Date().toLocaleTimeString()}`;
      await refreshDraftList();
    } catch (e) {
      toast('Save failed: ' + e.message, 'error');
    }
  }

  // ── Load drafts list for dropdown ──────────────────────────────────
  async function refreshDraftList() {
    const siteId = document.getElementById('msow-site-select').value || null;
    try {
      const drafts = await API.msow.list(siteId ? { site_id: siteId } : {});
      const sel = document.getElementById('msow-draft-select');
      const prev = sel.value;
      sel.innerHTML = '<option value="">— New MSOW —</option>' +
        drafts.map(d => `<option value="${d.id}"${d.id === currentDraftId ? ' selected' : ''}>${escHtml(d.name)} (${new Date(d.updated_at).toLocaleDateString()})</option>`).join('');
      if (currentDraftId && !drafts.find(d => d.id === currentDraftId)) {
        // Current draft not in list (different site) — keep selection
      }
    } catch (e) { /* ignore */ }
  }

  // ── Load a draft from server ──────────────────────────────────────
  async function loadServerDraft(draftId) {
    if (!draftId) return;
    try {
      const draft = await API.msow.get(draftId);
      currentDraftId = draft.id;
      currentSiteId = draft.site_id;
      document.getElementById('msow-draft-name').value = draft.name || '';
      if (draft.site_id) document.getElementById('msow-site-select').value = draft.site_id;
      document.getElementById('msow-delete-draft').style.display = '';
      loadDraft(draft.form_data);
      const statusEl = document.getElementById('msow-draft-status');
      if (statusEl) statusEl.textContent = `Loaded: ${draft.name} · last saved ${new Date(draft.updated_at).toLocaleString()}`;
      toast('Draft loaded');
    } catch (e) {
      toast('Failed to load draft: ' + e.message, 'error');
    }
  }

  // ── Load draft ────────────────────────────────────────────────────────
  function loadDraft(draft) {
    if (!draft) return;

    const setFld = (id, val) => {
      const el = document.getElementById(`msow-${id}`);
      if (el && val !== undefined && val !== null) el.value = val;
    };

    // Scalar fields
    const scalarFields = [
      'date','equipment_tag','cmms_wo','contractor_name','author_name',
      'poc_phone','poc_email','project_name','site_address','task_description',
      'site_supervisor','supervisor_tel','supervisor_email','safety_officer',
      'safety_tel','safety_email','location_of_work','documentation_references',
      'start_datetime','finish_datetime','duration','calibrated_tools',
      'tools_and_materials','temporary_supports','loto_equipment','staff_training',
      'general_comments','access_egress','fall_protection','ppe','storage',
      'soc_number','foc_number','first_aider','first_aid_location','hospital_location',
      'welfare','services_others','other_comments','briefing_by','briefing_position',
      'briefing_date','ra_date','ra_assessed_by','ra_checked_by','ra_location',
      'ra_task','ra_equipment',
    ];
    scalarFields.forEach(f => setFld(f, draft[f]));

    // LOTO radio
    if (draft.loto_required) {
      document.getElementById('msow-loto-yes').checked = true;
      updateLotoVis();
    }

    // Personnel
    if (draft.personnel && draft.personnel.length) {
      document.getElementById('msow-personnel-body').innerHTML = '';
      draft.personnel.forEach(r => addPersonnelRow(r));
    }

    // Steps
    if (draft.steps && draft.steps.length) {
      document.getElementById('msow-steps-body').innerHTML = '';
      draft.steps.forEach((r, i) => addStepRow(r, i + 1));
    }

    // Figures
    if (draft.figures && draft.figures.length) {
      renderFigures(draft.figures);
    }

    // Hazmat
    if (draft.hazardous_substances && draft.hazardous_substances.length) {
      document.getElementById('msow-hazmat-body').innerHTML = '';
      draft.hazardous_substances.forEach(r => addHazmatRow(r));
    }

    // Permits
    if (draft.permits && draft.permits.length) {
      document.getElementById('msow-permits-body').innerHTML = '';
      draft.permits.forEach(r => addPermitRow(r));
    }

    // Acceptance list
    if (draft.acceptance_list && draft.acceptance_list.length) {
      document.getElementById('msow-accept-body').innerHTML = '';
      draft.acceptance_list.forEach(r => addAcceptRow(r));
    }

    // Hazards
    if (draft.hazards && draft.hazards.length) {
      document.getElementById('msow-hazards-body').innerHTML = '';
      draft.hazards.forEach(r => addHazardRow(r));
    }
  }

  // ── Load existing draft ──────────────────────────────────────────────
  if (params.draftId) {
    // Load specific draft from server
    await loadServerDraft(params.draftId);
  } else {
    // Load from localStorage as fallback
    const savedDraft = localStorage.getItem('msow-draft');
    if (savedDraft && !params.siteId) {
      try { loadDraft(JSON.parse(savedDraft)); }
      catch (e) { /* corrupted draft — ignore */ }
    }
  }

  // Load draft list for the selected site
  await refreshDraftList();

  // ── Event: site selector changes → reload drafts list ──────────────
  document.getElementById('msow-site-select').addEventListener('change', async (e) => {
    currentSiteId = e.target.value || null;
    await refreshDraftList();
  });

  // ── Event: draft selector changes → load that draft ────────────────
  document.getElementById('msow-draft-select').addEventListener('change', async (e) => {
    const draftId = e.target.value;
    if (draftId) {
      await loadServerDraft(draftId);
    } else {
      // "New MSOW" — clear form
      currentDraftId = null;
      document.getElementById('msow-draft-name').value = '';
      document.getElementById('msow-delete-draft').style.display = 'none';
      renderMSOW(container, { siteId: currentSiteId });
    }
  });

  // ── Clear / New blank ──────────────────────────────────────────────────
  document.getElementById('msow-clear-draft').addEventListener('click', () => {
    if (!confirm('Start a new blank MSOW? Any unsaved changes will be lost.')) return;
    localStorage.removeItem('msow-draft');
    currentDraftId = null;
    renderMSOW(container, { siteId: currentSiteId });
    toast('New blank MSOW');
  });

  // ── Delete draft ───────────────────────────────────────────────────────
  document.getElementById('msow-delete-draft').addEventListener('click', async () => {
    if (!currentDraftId) return;
    if (!confirm('Delete this saved MSOW draft? This cannot be undone.')) return;
    try {
      await API.msow.delete(currentDraftId);
      toast('Draft deleted');
      localStorage.removeItem('msow-draft');
      currentDraftId = null;
      renderMSOW(container, { siteId: currentSiteId });
    } catch (e) {
      toast('Delete failed: ' + e.message, 'error');
    }
  });

  // ── Save buttons ───────────────────────────────────────────────────────
  document.getElementById('msow-save-btn')?.addEventListener('click', saveToServer);
  document.getElementById('msow-save-btn-2')?.addEventListener('click', saveToServer);

  // Show delete button if editing existing draft
  if (currentDraftId) {
    document.getElementById('msow-delete-draft').style.display = '';
  }
}
