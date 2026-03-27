async function renderUnitForm(container, { id, siteId, backTo = 'units', backParams = {} } = {}) {
  const editing = !!id;
  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let unit = {}, sites = [];
  try {
    [sites] = await Promise.all([API.sites.list()]);
    if (editing) unit = await API.units.get(id);
  } catch (e) {
    container.innerHTML = `<div style="color:var(--red);padding:40px">Error: ${escHtml(e.message)}</div>`;
    return;
  }

  const preselectedSite = siteId || unit.site_id || '';
  const back = () => navigate(backTo, backParams);

  container.innerHTML = `
    <div class="page-header" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-secondary btn-sm" id="back-btn">← Back</button>
        <div>
          <h1 style="margin:0">${editing ? `Edit Unit ${escHtml(unit.serial_number || serial(unit) || '')}` : 'New Unit'}</h1>
          ${editing ? `<div class="page-subtitle">${unitTypeBadge(unit.unit_type)} ${escHtml(unit.model||'')}</div>` : ''}
        </div>
      </div>
      ${editing ? `<button class="btn btn-sm" id="delete-unit-btn" style="background:var(--red)22;color:var(--red);border:1px solid var(--red)44">Delete Unit</button>` : ''}
    </div>

    <form id="unit-form" style="max-width:900px">

      <!-- Identification -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Unit Identification</div>
        <div class="form-grid">
          <div class="form-group full">
            <label>Site *</label>
            <select name="site_id" required ${editing ? 'disabled' : ''}>
              <option value="">— Select Site —</option>
              ${sites.map(s => `<option value="${s.id}" ${s.id===preselectedSite?'selected':''}>${escHtml(s.project_name || s.name || s.project_number)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Serial Number *</label>
            <input name="serial_number" required value="${escHtml(unit.serial_number||'')}"
                   placeholder="e.g. 22366582-0001-COND"
                   style="font-family:var(--font-mono,monospace)"
                   ${editing ? 'readonly style="opacity:.6;font-family:var(--font-mono,monospace)"' : ''}/>
          </div>
          <div class="form-group">
            <label>Unit Type *</label>
            <select name="unit_type" required>
              <option value="">— Select Type —</option>
              <option value="condenser"            ${unit.unit_type==='condenser'?'selected':''}>Condenser</option>
              <option value="evaporator"           ${unit.unit_type==='evaporator'?'selected':''}>Evaporator</option>
              <option value="chiller"              ${unit.unit_type==='chiller'?'selected':''}>Chiller</option>
              <option value="air_handler"          ${unit.unit_type==='air_handler'?'selected':''}>Air Handler</option>
              <option value="indirect_cooling"     ${unit.unit_type==='indirect_cooling'?'selected':''}>Indirect Cooling</option>
              <option value="indirect_evaporative" ${unit.unit_type==='indirect_evaporative'?'selected':''}>Indirect Evaporative</option>
              <option value="sycool"               ${unit.unit_type==='sycool'?'selected':''}>SyCool</option>
            </select>
          </div>
          <div class="form-group">
            <label>Job Number</label>
            <input name="job_number" value="${escHtml(unit.job_number||'')}"
                   placeholder="e.g. 22366582"
                   style="font-family:var(--font-mono,monospace)"/>
          </div>
          <div class="form-group">
            <label>Line Number</label>
            <input name="line_number" type="number" min="1" value="${unit.line_number||''}"/>
          </div>
          <div class="form-group">
            <label>Manufacturer</label>
            <input name="manufacturer" value="${escHtml(unit.manufacturer||'')}" placeholder="e.g. Munters"/>
          </div>
          <div class="form-group">
            <label>Model</label>
            <input name="model" value="${escHtml(unit.model||'')}" placeholder="e.g. SYS500C"/>
          </div>
          <div class="form-group full">
            <label>Description</label>
            <input name="description" value="${escHtml(unit.description||'')}"/>
          </div>
          <div class="form-group full">
            <label>Location on Site</label>
            <input name="location_in_site" value="${escHtml(unit.location_in_site||'')}" placeholder="e.g. VA: BUENA VISTA"/>
          </div>
        </div>
      </div>

      <!-- Commission & Status -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Commission & Status</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Commission Level <span style="font-weight:400;color:var(--text3);font-size:11px">(unit-level: L2 & L3 only)</span></label>
            <select name="commission_level">
              <option value="none" ${(unit.commission_level||'none')==='none'||unit.commission_level==='L1'?'selected':''}>Not Started</option>
              <option value="l2"   ${unit.commission_level==='l2'||unit.commission_level==='L2'?'selected':''}>L2 – Pre-Energization Complete</option>
              <option value="l3"   ${unit.commission_level==='l3'||unit.commission_level==='L3'||unit.commission_level==='complete'||unit.commission_level==='L4'||unit.commission_level==='L5'?'selected':''}>L3 – Startup Complete (Commissioned)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Install Date</label>
            <input type="date" name="install_date" value="${unit.install_date||''}"/>
          </div>
        </div>
      </div>

      <!-- Warranty -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Warranty</div>
        <div class="form-grid">
          <div class="form-group"><label>Warranty Start</label><input type="date" name="warranty_start_date" value="${unit.warranty_start_date||''}"/></div>
          <div class="form-group"><label>Warranty End</label><input type="date" name="warranty_end_date" value="${unit.warranty_end_date||''}"/></div>
        </div>
      </div>

      <!-- RFE (Retrofit Field Enhancement) -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:4px">Retrofit Field Enhancement (RFE)</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:14px">Track component upgrade retrofits performed on this unit</div>
        <div class="form-grid">
          <div class="form-group">
            <label>RFE Job Number</label>
            <input name="rfe_job_number" value="${escHtml(unit.rfe_job_number||'')}" placeholder="e.g. J-12345"/>
          </div>
          <div class="form-group">
            <label>RFE WO / Line</label>
            <input name="rfe_wo_number" value="${escHtml(unit.rfe_wo_number||'')}" placeholder="e.g. WO-98765 / Line 3"/>
          </div>
          <div class="form-group">
            <label>RFE Date</label>
            <input type="date" name="rfe_date" value="${unit.rfe_date||''}"/>
          </div>
          <div class="form-group full">
            <label>RFE Description</label>
            <textarea name="rfe_description" rows="2" placeholder="Describe the components upgraded or work performed">${escHtml(unit.rfe_description||'')}</textarea>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Notes</div>
        <div class="form-grid">
          <div class="form-group full"><textarea name="notes" rows="4">${escHtml(unit.notes||'')}</textarea></div>
        </div>
      </div>

      <div class="form-actions" style="padding:0 0 32px">
        <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">${editing ? 'Save Changes' : 'Create Unit'}</button>
      </div>
    </form>`;

  document.getElementById('back-btn').addEventListener('click', back);
  document.getElementById('cancel-btn').addEventListener('click', back);

  if (editing) {
    document.getElementById('delete-unit-btn').addEventListener('click', async () => {
      if (!confirm(`Delete unit ${unit.serial_number || serial(unit)}? This cannot be undone.`)) return;
      try {
        await API.units.delete(id);
        toast('Unit deleted');
        navigate(backTo, backParams);
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    });
  }

  document.getElementById('unit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());

    // Always coerce numeric fields — FormData gives strings for everything
    if (data.line_number !== '' && data.line_number != null) {
      data.line_number = parseInt(data.line_number, 10);
    }
    // Remove disabled fields (select with disabled attr isn't submitted but guard anyway)
    if (editing) delete data.site_id;

    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });

    try {
      if (editing) {
        await API.units.update(id, data);
        toast('Unit updated');
        navigate('unit-detail', { id, backTo, backParams });
      } else {
        const created = await API.units.create(data);
        toast('Unit created');
        const dest = created.site_id ? 'site-detail' : 'units';
        const params = created.site_id ? { id: created.site_id } : {};
        navigate('unit-detail', { id: created.id, backTo: dest, backParams: params });
      }
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  });
}
