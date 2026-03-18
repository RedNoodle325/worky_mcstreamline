async function renderBom(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>BOM / Parts</h1><div class="page-subtitle">Glovia BOM imports &amp; parts catalog</div></div>
      <button class="btn btn-primary" id="import-bom-btn">↑ Import BOM PDF</button>
    </div>

    <div class="grid-2" style="gap:16px;margin-bottom:16px">
      <div class="card">
        <div class="card-title">Parts Search</div>
        <div class="search-bar" style="margin-bottom:12px">
          <input id="parts-search" placeholder="Part number or description…"/>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Part Number</th><th>Description</th><th>UM</th></tr></thead>
            <tbody id="parts-results"><tr><td colspan="3" style="color:var(--text3)">Search above to find parts</td></tr></tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-title">BOM Imports</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Assembly</th><th>File</th><th>Imported</th><th></th></tr></thead>
            <tbody id="bom-imports-body"><tr><td colspan="4" style="color:var(--text3)">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card" id="bom-items-card" style="display:none">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="card-title" id="bom-items-title">BOM Items</div>
        <button class="btn btn-sm btn-secondary" onclick="document.getElementById('bom-items-card').style.display='none'">✕ Close</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Qty</th><th>UM</th><th>Component</th><th>Rev</th><th>Description</th></tr></thead>
          <tbody id="bom-items-body"></tbody>
        </table>
      </div>
    </div>`;

  let imports = [];
  let searchTimeout;

  async function loadImports() {
    try {
      imports = await API.bom.list();
      renderImports(imports);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  function renderImports(data) {
    const tbody = document.getElementById('bom-imports-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text3)">No BOMs imported yet</td></tr>'; return; }
    tbody.innerHTML = data.map(b => `<tr>
      <td style="font-family:monospace;font-size:12px">${escHtml(b.assembly_number||'—')}</td>
      <td style="font-size:12px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(b.source_filename||'—')}</td>
      <td style="font-size:12px">${fmt(b.imported_at)}</td>
      <td><button class="btn btn-sm btn-secondary" onclick="viewBomItems('${b.id}','${escHtml(b.assembly_number||b.source_filename||'BOM')}')">View</button></td>
    </tr>`).join('');
  }

  // Parts search with debounce
  document.getElementById('parts-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const q = e.target.value.trim();
    if (q.length < 2) {
      document.getElementById('parts-results').innerHTML = '<tr><td colspan="3" style="color:var(--text3)">Type at least 2 characters…</td></tr>';
      return;
    }
    searchTimeout = setTimeout(async () => {
      try {
        const parts = await API.bom.searchParts(q);
        const tbody = document.getElementById('parts-results');
        if (!parts.length) {
          tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text3)">No parts found</td></tr>';
          return;
        }
        tbody.innerHTML = parts.map(p => `<tr>
          <td style="font-family:monospace;font-size:12px">${escHtml(p.part_number)}</td>
          <td style="font-size:12px">${escHtml(p.description||'—')}</td>
          <td style="font-size:12px">${escHtml(p.unit_of_measure||'—')}</td>
        </tr>`).join('');
      } catch (e) { toast('Search error: ' + e.message, 'error'); }
    }, 300);
  });

  window.viewBomItems = async (bomId, title) => {
    try {
      const items = await API.bom.getItems(bomId);
      document.getElementById('bom-items-card').style.display = 'block';
      document.getElementById('bom-items-title').textContent = `BOM: ${title} (${items.length} items)`;
      const tbody = document.getElementById('bom-items-body');
      if (!items.length) { tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text3)">No items</td></tr>'; return; }
      tbody.innerHTML = items.map(i => `<tr>
        <td style="text-align:right;font-size:12px">${i.quantity ?? '—'}</td>
        <td style="font-size:12px">${escHtml(i.unit_of_measure||'—')}</td>
        <td style="font-family:monospace;font-size:12px">${escHtml(i.component)}</td>
        <td style="font-size:12px">${escHtml(i.rev||'')}</td>
        <td style="font-size:12px">${escHtml(i.description||'—')}</td>
      </tr>`).join('');
      document.getElementById('bom-items-card').scrollIntoView({ behavior: 'smooth' });
    } catch (e) { toast('Error loading items: ' + e.message, 'error'); }
  };

  document.getElementById('import-bom-btn').addEventListener('click', () => showBomImportForm(loadImports));

  await loadImports();
}

function showBomImportForm(onSave) {
  openModal('Import Glovia BOM PDF', `
    <p style="color:var(--text2);margin-bottom:16px;font-size:13px">
      Upload the Multilevel Bill of Materials Report PDF from Glovia.
      Parts will be parsed and added to the catalog automatically.
    </p>
    <form id="bom-import-form">
      <div class="form-grid">
        <div class="form-group full">
          <label>BOM PDF *</label>
          <div class="file-drop" onclick="this.querySelector('input').click()">
            <input type="file" name="file" accept=".pdf" required onchange="document.getElementById('bom-file-label').textContent=this.files[0]?.name||'Choose PDF'"/>
            <div id="bom-file-label">Click to choose PDF</div>
            <div style="font-size:11px;color:var(--text3);margin-top:4px">Glovia Multilevel BOM Report</div>
          </div>
        </div>
        <div class="form-group"><label>Site (optional)</label>
          <select name="site_id" id="bom-site-select">
            <option value="">— No site —</option>
          </select>
        </div>
        <div class="form-group"><label>Unit (optional)</label>
          <select name="unit_id" id="bom-unit-select">
            <option value="">— No unit —</option>
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" id="bom-submit-btn">Import BOM</button>
      </div>
    </form>`);

  // Load sites/units for dropdowns
  Promise.all([API.sites.list(), API.units.list()]).then(([sites, units]) => {
    const siteSelect = document.getElementById('bom-site-select');
    sites.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; siteSelect.appendChild(o); });
    const unitSelect = document.getElementById('bom-unit-select');
    units.forEach(u => { const o = document.createElement('option'); o.value = u.id; o.textContent = `${serial(u)} (${u.unit_type||''})`; unitSelect.appendChild(o); });
  }).catch(() => {});

  document.getElementById('bom-import-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('bom-submit-btn');
    btn.disabled = true; btn.textContent = 'Importing…';
    const fd = new FormData(e.target);
    // Remove empty selects
    if (!fd.get('site_id')) fd.delete('site_id');
    if (!fd.get('unit_id')) fd.delete('unit_id');
    try {
      const result = await API.bom.import(fd);
      if (result.error) throw new Error(result.error);
      toast('BOM imported successfully');
      closeModal(); onSave();
    } catch (err) {
      toast('Import failed: ' + err.message, 'error');
      btn.disabled = false; btn.textContent = 'Import BOM';
    }
  });
}
