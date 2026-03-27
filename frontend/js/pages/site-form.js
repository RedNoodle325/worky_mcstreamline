async function renderSiteForm(container, { id, backTo = 'dashboard', backParams = {} } = {}) {
  const editing = !!id;
  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let site = {};
  let existingJobNumbers = [];
  if (editing) {
    try {
      [site, existingJobNumbers] = await Promise.all([
        API.sites.get(id),
        API.site_job_numbers.list(id).catch(() => []),
      ]);
    } catch (e) {
      container.innerHTML = `<div style="color:var(--red);padding:40px">Error: ${escHtml(e.message)}</div>`;
      return;
    }
  }

  const back = () => navigate(backTo, backParams);

  const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
  function stateSelect(name, val) {
    return `<select name="${name}" style="width:100%">
      <option value="">— Select —</option>
      ${US_STATES.map(s => `<option value="${s}" ${val===s?'selected':''}>${s}</option>`).join('')}
    </select>`;
  }

  // Detect if shipping already matches site address
  const siteShipSame = !!(
    site.shipping_address_street &&
    site.shipping_address_street === site.address &&
    site.shipping_address_city === site.city &&
    site.shipping_address_state === site.state &&
    site.shipping_address_zip === site.zip_code
  );

  // Initial job-number rows: use existing ones when editing, one blank row when creating
  const initRows = existingJobNumbers.length > 0
    ? existingJobNumbers
    : [{ job_number: '', description: '', is_primary: true }];

  function jobNumberRowHtml(jn, idx) {
    return `
      <div class="job-number-row" data-idx="${idx}" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <input class="jn-number" placeholder="e.g. 22366582" value="${escHtml(jn.job_number || '')}"
               style="flex:0 0 180px;font-family:var(--font-mono,monospace)"/>
        <input class="jn-desc" placeholder="Description (optional)" value="${escHtml(jn.description || '')}" style="flex:1"/>
        <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;font-size:13px;cursor:pointer">
          <input type="radio" name="jn_primary" class="jn-primary" value="${idx}" ${jn.is_primary ? 'checked' : ''}/>
          Primary
        </label>
        <button type="button" class="btn btn-secondary btn-sm jn-remove" style="padding:4px 10px;line-height:1">✕</button>
      </div>`;
  }

  container.innerHTML = `
    <div class="page-header" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-secondary btn-sm" id="back-btn">← Back</button>
        <div>
          <h1 style="margin:0">${editing ? 'Edit Site' : 'New Site'}</h1>
          ${editing ? `<div class="page-subtitle">${escHtml(site.project_name || site.name || '')}</div>` : ''}
        </div>
      </div>
      ${editing ? `<button class="btn btn-sm" id="delete-site-btn" style="background:var(--red)22;color:var(--red);border:1px solid var(--red)44">Delete Site</button>` : ''}
    </div>

    <form id="site-form" style="max-width:900px">

      <!-- Basic Info -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Basic Info</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Project Number *</label>
            <input name="project_number" required value="${escHtml(site.project_number || '')}"
                   placeholder="e.g. QUAL055-GA1435" style="font-family:var(--font-mono,monospace)"/>
          </div>
          <div class="form-group">
            <label>Project Name *</label>
            <input name="project_name" required value="${escHtml(site.project_name || site.name || '')}"
                   placeholder="e.g. QTS Reno Data Center"/>
          </div>
          <div class="form-group full">
            <label>Customer Name</label>
            <input name="customer_name" value="${escHtml(site.customer_name || '')}"
                   placeholder="e.g. Quality Technology Services"/>
          </div>
        </div>
      </div>

      <!-- Job Numbers -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="card-title" style="margin:0">Job Numbers</div>
          <button type="button" class="btn btn-secondary btn-sm" id="add-job-number">+ Add Job #</button>
        </div>
        <p style="font-size:12px;color:var(--text3);margin:0 0 12px">
          Astea order numbers for this site (e.g. <code style="font-size:11px">22366582</code>).
          Mark one as Primary — this is used to match units imported from the Astea CSV.
        </p>
        <div id="job-numbers-list">
          ${initRows.map((jn, i) => jobNumberRowHtml(jn, i)).join('')}
        </div>
      </div>

      <!-- Site Address -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div class="card-title" style="margin:0">Site Address</div>
          <button type="button" class="btn btn-secondary btn-sm" id="verify-site-addr-btn">🔍 Verify Address</button>
        </div>
        <div class="form-grid">
          <div class="form-group full"><label>Street</label><input name="address" id="site-street" value="${escHtml(site.address || '')}"/></div>
          <div class="form-group"><label>City</label><input name="city" id="site-city" value="${escHtml(site.city || '')}"/></div>
          <div class="form-group"><label>State</label>${stateSelect('state', site.state || '')}</div>
          <div class="form-group"><label>Zip</label><input name="zip_code" id="site-zip" value="${escHtml(site.zip_code || '')}"/></div>
        </div>
        <div id="site-addr-suggestion" style="display:none;margin-top:12px;padding:12px;background:var(--blue)11;border:1px solid var(--blue)44;border-radius:8px;font-size:13px"></div>
      </div>

      <!-- Shipping Address -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="card-title" style="margin:0">Shipping Address</div>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;font-weight:500">
            <input type="checkbox" id="ship-same-as-site" ${siteShipSame ? 'checked' : ''}/> Same as site address
          </label>
        </div>
        <div id="shipping-fields">
          <div class="form-grid">
            <div class="form-group full">
              <label>Attention / Name Line <span style="font-weight:400;color:var(--text3);font-size:11px">e.g. QTS C/O MUNTERS</span></label>
              <input name="shipping_name" value="${escHtml(site.shipping_name || '')}" placeholder="CUSTOMER C/O MUNTERS"/>
            </div>
            <div class="form-group"><label>Point of Contact</label><input name="shipping_contact_name" value="${escHtml(site.shipping_contact_name || '')}" placeholder="Contact name"/></div>
            <div class="form-group"><label>Contact Phone</label><input name="shipping_contact_phone" value="${escHtml(site.shipping_contact_phone || '')}" placeholder="(555) 000-0000"/></div>
            <div style="display:flex;align-items:center;justify-content:space-between;grid-column:1/-1;margin-top:4px">
              <div style="font-size:12px;font-weight:600;color:var(--text2)">Shipping Address</div>
              <button type="button" class="btn btn-secondary btn-sm" id="verify-ship-addr-btn">🔍 Verify Address</button>
            </div>
            <div class="form-group full"><label>Street</label><input name="shipping_address_street" id="ship-street" value="${escHtml(site.shipping_address_street || '')}"/></div>
            <div class="form-group"><label>City</label><input name="shipping_address_city" id="ship-city" value="${escHtml(site.shipping_address_city || '')}"/></div>
            <div class="form-group"><label>State</label>${stateSelect('shipping_address_state', site.shipping_address_state || '')}</div>
            <div class="form-group"><label>Zip</label><input name="shipping_address_zip" id="ship-zip" value="${escHtml(site.shipping_address_zip || '')}"/></div>
          </div>
          <div id="ship-addr-suggestion" style="display:none;margin-top:12px;padding:12px;background:var(--blue)11;border:1px solid var(--blue)44;border-radius:8px;font-size:13px"></div>
        </div>
      </div>

      <!-- Site Requirements -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Site Requirements</div>
        <div class="form-grid">
          <div class="form-group full"><label>Access Requirements</label><textarea name="access_requirements" rows="3">${escHtml(site.access_requirements || '')}</textarea></div>
          <div class="form-group full"><label>Required Paperwork / Permits</label><textarea name="required_paperwork" rows="3">${escHtml(site.required_paperwork || '')}</textarea></div>
          <div class="form-group full"><label>Orientation / Safety Info</label><textarea name="orientation_info" rows="3">${escHtml(site.orientation_info || '')}</textarea></div>
        </div>
      </div>

      <!-- Primary Contact -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Primary Contact</div>
        <div class="form-grid">
          <div class="form-group full"><label>Contact Name</label><input name="customer_contact_name" value="${escHtml(site.customer_contact_name || '')}" placeholder="e.g. Jane Smith"/></div>
          <div class="form-group"><label>Phone</label><input name="customer_contact_phone" value="${escHtml(site.customer_contact_phone || '')}"/></div>
          <div class="form-group"><label>Email</label><input name="customer_contact_email" type="email" value="${escHtml(site.customer_contact_email || '')}"/></div>
          <div class="form-group full"><label>Notes</label><textarea name="notes" rows="3">${escHtml(site.notes || '')}</textarea></div>
        </div>
      </div>

      <!-- Lifecycle & Warranty -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Lifecycle &amp; Warranty</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Lifecycle Phase</label>
            <select name="lifecycle_phase">
              <optgroup label="─ Commissioning ─">
                <option value="production_shipping" ${(site.lifecycle_phase||'production_shipping')==='production_shipping'||site.lifecycle_phase==='pre_commissioning'?'selected':''}>Production &amp; Shipping</option>
                <option value="commissioning_l2"    ${site.lifecycle_phase==='commissioning_l2'?'selected':''}>L2 – Pre-Energization</option>
                <option value="commissioning_l3"    ${site.lifecycle_phase==='commissioning_l3'?'selected':''}>L3 – Startup</option>
                <option value="commissioning_l4"    ${site.lifecycle_phase==='commissioning_l4'?'selected':''}>L4 – Sequence of Operations / TAB / BMS</option>
                <option value="commissioning_l5"    ${site.lifecycle_phase==='commissioning_l5'?'selected':''}>L5 – Integrated Systems Testing (IST)</option>
              </optgroup>
              <optgroup label="─ Post-Commissioning ─">
                <option value="warranty"            ${site.lifecycle_phase==='warranty'?'selected':''}>Warranty</option>
                <option value="extended_warranty"   ${site.lifecycle_phase==='extended_warranty'?'selected':''}>Extended Warranty</option>
                <option value="out_of_warranty"     ${site.lifecycle_phase==='out_of_warranty'?'selected':''}>Out of Warranty</option>
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label>Site Operational Status</label>
            <select name="site_status">
              <option value="normal"        ${(site.site_status||'normal')==='normal'?'selected':''}>Normal</option>
              <option value="open_issues"  ${site.site_status==='open_issues'?'selected':''}>Open Issues</option>
              <option value="techs_onsite" ${site.site_status==='techs_onsite'?'selected':''}>Techs on Site</option>
              <option value="emergency"    ${site.site_status==='emergency'?'selected':''}>Emergency</option>
            </select>
          </div>
          <div class="form-group"><label>Warranty Start Date</label><input type="date" name="warranty_start_date" value="${site.warranty_start_date||''}"/></div>
          <div class="form-group"><label>Warranty End Date</label><input type="date" name="warranty_end_date" value="${site.warranty_end_date||''}"/></div>
          <div class="form-group"><label>Extended Warranty Start</label><input type="date" name="extended_warranty_start" value="${site.extended_warranty_start||''}"/></div>
          <div class="form-group"><label>Extended Warranty End</label><input type="date" name="extended_warranty_end" value="${site.extended_warranty_end||''}"/></div>
          <div class="form-group"><label>Astea Site ID</label><input type="text" name="astea_site_id" value="${site.astea_site_id||''}" placeholder="e.g. QUAL055-GA167"/></div>
        </div>
      </div>

      <div class="form-actions" style="padding:0 0 32px">
        <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">${editing ? 'Save Changes' : 'Create Site'}</button>
      </div>
    </form>`;

  // ── Address verification (Census Bureau Geocoder — free, no key) ────────────
  async function verifyAddress(street, city, state, zip, suggestionEl, applyFn) {
    if (!street) { toast('Enter a street address first', 'error'); return; }
    suggestionEl.style.display = 'none';
    suggestionEl.innerHTML = '';
    const btn = suggestionEl.previousElementSibling?.querySelector('button[id*="verify"]') ||
                suggestionEl.closest('.card')?.querySelector('button[id*="verify"]');
    const origText = btn?.textContent;
    if (btn) btn.textContent = 'Checking…';
    try {
      const params = new URLSearchParams({ street, city: city||'', state: state||'', zip: zip||'', benchmark: 'Public_AR_Current', format: 'json' });
      const res = await fetch(`https://geocoding.geo.census.gov/geocoder/locations/address?${params}`);
      const json = await res.json();
      const matches = json?.result?.addressMatches || [];
      if (!matches.length) {
        suggestionEl.innerHTML = `<span style="color:var(--red)">⚠ No matching address found. Double-check street, city, and zip.</span>`;
        suggestionEl.style.display = 'block';
        return;
      }
      const m = matches[0];
      const ac = m.addressComponents;
      const suggested = { street: `${ac.streetNumber} ${ac.preDirection||''} ${ac.streetName} ${ac.suffixType||''}`.replace(/\s+/g,' ').trim(), city: ac.city, state: ac.state, zip: ac.zip };
      const entered  = { street: street.trim().toUpperCase(), city: (city||'').trim().toUpperCase(), state: (state||'').trim().toUpperCase(), zip: (zip||'').trim() };
      const differs  = suggested.street.toUpperCase() !== entered.street || suggested.city.toUpperCase() !== entered.city || suggested.state.toUpperCase() !== entered.state || suggested.zip !== entered.zip;
      if (!differs) {
        suggestionEl.innerHTML = `<span style="color:var(--green)">✓ Address verified — looks good!</span>`;
      } else {
        suggestionEl.innerHTML = `
          <div style="font-weight:600;margin-bottom:6px">📬 Suggested correction:</div>
          <div style="font-family:monospace;font-size:13px;margin-bottom:10px">${escHtml(m.matchedAddress)}</div>
          <button type="button" class="btn btn-sm btn-primary" id="apply-suggestion">Use This Address</button>
          <button type="button" class="btn btn-sm btn-secondary" style="margin-left:6px" id="keep-original">Keep Mine</button>`;
        suggestionEl.querySelector('#apply-suggestion').onclick = () => {
          applyFn(suggested);
          suggestionEl.innerHTML = `<span style="color:var(--green)">✓ Address updated!</span>`;
        };
        suggestionEl.querySelector('#keep-original').onclick = () => { suggestionEl.style.display = 'none'; };
      }
      suggestionEl.style.display = 'block';
    } catch(e) {
      suggestionEl.innerHTML = `<span style="color:var(--red)">Could not reach address service. Check your connection.</span>`;
      suggestionEl.style.display = 'block';
    } finally {
      if (btn && origText) btn.textContent = origText;
    }
  }

  document.getElementById('verify-site-addr-btn').addEventListener('click', () => {
    const f = document.getElementById('site-form');
    verifyAddress(
      f.address?.value, f.city?.value, f.state?.value, f.zip_code?.value,
      document.getElementById('site-addr-suggestion'),
      (s) => { f.address.value = s.street; f.city.value = s.city; f.querySelector('[name="state"]').value = s.state; f.zip_code.value = s.zip; }
    );
  });

  document.getElementById('verify-ship-addr-btn')?.addEventListener('click', () => {
    const f = document.getElementById('site-form');
    verifyAddress(
      f.shipping_address_street?.value, f.shipping_address_city?.value, f.shipping_address_state?.value, f.shipping_address_zip?.value,
      document.getElementById('ship-addr-suggestion'),
      (s) => { f.shipping_address_street.value = s.street; f.shipping_address_city.value = s.city; f.querySelector('[name="shipping_address_state"]').value = s.state; f.shipping_address_zip.value = s.zip; }
    );
  });

  // ── Same as site address checkbox ─────────────────────────────────────────
  const shipSameChk = document.getElementById('ship-same-as-site');
  const shippingFields = document.getElementById('shipping-fields');

  function syncShipToSite() {
    const f = document.getElementById('site-form');
    f.shipping_address_street.value = f.address?.value || '';
    f.shipping_address_city.value   = f.city?.value || '';
    f.querySelector('[name="shipping_address_state"]').value = f.querySelector('[name="state"]')?.value || '';
    f.shipping_address_zip.value    = f.zip_code?.value || '';
  }

  function toggleShipFields() {
    const same = shipSameChk.checked;
    shippingFields.querySelectorAll('input[name^="shipping_address"], select[name^="shipping_address"]').forEach(el => { el.disabled = same; });
    if (same) syncShipToSite();
  }

  shipSameChk.addEventListener('change', toggleShipFields);
  // Apply initial state
  if (siteShipSame) toggleShipFields();

  // ── Job Numbers dynamic list ──────────────────────────────────────────────
  const jnList = document.getElementById('job-numbers-list');

  function reindexRows() {
    jnList.querySelectorAll('.job-number-row').forEach((row, i) => {
      row.dataset.idx = i;
      const radio = row.querySelector('.jn-primary');
      const wasChecked = radio.checked;
      radio.value = i;
      if (wasChecked) radio.checked = true;
    });
  }

  document.getElementById('add-job-number').addEventListener('click', () => {
    const idx = jnList.querySelectorAll('.job-number-row').length;
    const div = document.createElement('div');
    div.innerHTML = jobNumberRowHtml({ job_number: '', description: '', is_primary: false }, idx);
    jnList.appendChild(div.firstElementChild);
  });

  jnList.addEventListener('click', (e) => {
    if (!e.target.classList.contains('jn-remove')) return;
    const row = e.target.closest('.job-number-row');
    const wasPrimary = row.querySelector('.jn-primary').checked;
    row.remove();
    reindexRows();
    // Promote first row to primary if we removed the primary
    if (wasPrimary) {
      const first = jnList.querySelector('.jn-primary');
      if (first) first.checked = true;
    }
  });

  function collectJobNumbers() {
    const rows = jnList.querySelectorAll('.job-number-row');
    const primaryVal = jnList.querySelector('.jn-primary:checked')?.value;
    return Array.from(rows)
      .map((row, i) => ({
        job_number: row.querySelector('.jn-number').value.trim(),
        description: row.querySelector('.jn-desc').value.trim() || null,
        is_primary: String(i) === String(primaryVal),
      }))
      .filter(jn => jn.job_number !== '');
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  document.getElementById('back-btn').addEventListener('click', back);
  document.getElementById('cancel-btn').addEventListener('click', back);

  if (editing) {
    document.getElementById('delete-site-btn').addEventListener('click', async () => {
      if (!confirm(`Delete site "${site.project_name || site.name}"? This cannot be undone.`)) return;
      try {
        await API.sites.delete(id);
        toast('Site deleted');
        navigate('dashboard');
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  document.getElementById('site-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    // If "same as site" checked, copy values and temporarily re-enable so FormData picks them up
    const shippingAddrFields = document.querySelectorAll('[name^="shipping_address"]');
    if (document.getElementById('ship-same-as-site')?.checked) {
      syncShipToSite();
      shippingAddrFields.forEach(el => el.disabled = false);
    }

    const data = Object.fromEntries(new FormData(e.target).entries());

    // Re-disable after collection if same-as checked
    if (document.getElementById('ship-same-as-site')?.checked) {
      shippingAddrFields.forEach(el => el.disabled = true);
    }
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });

    // Keep `name` in sync with project_name (used for list ordering)
    data.name = data.project_name;

    // Attach job numbers (not captured by FormData)
    data.job_numbers = collectJobNumbers();

    try {
      if (editing) {
        await API.sites.update(id, data);
        // Replace job numbers: delete all existing, then re-create
        await Promise.all(existingJobNumbers.map(jn =>
          API.site_job_numbers.delete(id, jn.id).catch(() => {})
        ));
        await Promise.all(data.job_numbers.map(jn =>
          API.site_job_numbers.create(id, jn).catch(() => {})
        ));
        toast('Site updated');
        navigate('site-detail', { id });
      } else {
        const created = await API.sites.create(data);
        toast('Site created');
        navigate('site-detail', { id: created.id });
      }
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  });
}
