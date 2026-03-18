async function renderTicketDetail(container, { id, backTo = 'tickets', backParams = {}, prefillSiteId, prefillUnitId } = {}) {
  const editing = !!id;
  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let ticket = {}, sites = [], units = [];
  try {
    [sites, units] = await Promise.all([API.sites.list(), API.units.list()]);
    if (editing) ticket = await API.tickets.get(id);
  } catch (e) {
    container.innerHTML = `<div style="color:var(--red);padding:40px">Error: ${escHtml(e.message)}</div>`;
    return;
  }

  const back = () => navigate(backTo, backParams);

  // Parts items state (for parts_order type)
  let partsItems = [];
  if (editing && ticket.parts_items) {
    try { partsItems = Array.isArray(ticket.parts_items) ? ticket.parts_items : JSON.parse(ticket.parts_items); }
    catch { partsItems = []; }
  }

  function siteUnits(siteId) {
    return units.filter(u => u.site_id === siteId);
  }

  function renderTypeFields(ticketType, siteId) {
    const su = siteUnits(siteId || ticket.site_id || prefillSiteId || '');
    if (ticketType === 'cs_ticket') {
      return `
        <div class="form-group"><label>Unit (optional)</label>
          <select name="unit_id">
            <option value="">— No specific unit —</option>
            ${su.map(u => `<option value="${u.id}" ${u.id===(ticket.unit_id||prefillUnitId||'')?'selected':''}>${escHtml(serial(u))} – ${escHtml(u.tag||u.unit_type||'')}</option>`).join('')}
          </select>
        </div>
        <div class="form-group full"><label>Description *</label>
          <textarea name="description" rows="5" required>${escHtml(ticket.description||'')}</textarea>
        </div>`;
    }
    if (ticketType === 'parts_order') {
      return `
        <div class="form-group"><label>Unit Tag</label>
          <input name="unit_tag" placeholder="e.g. AHU-01" value="${escHtml(ticket.unit_tag||'')}"/>
        </div>
        <div class="form-group"><label>Serial Number</label>
          <input name="unit_serial_number" placeholder="Serial #" value="${escHtml(ticket.unit_serial_number||'')}"/>
        </div>
        <div class="form-group full">
          <label>Parts List</label>
          <div id="parts-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">
            ${partsItems.map((p,i) => partsRow(p,i)).join('')}
            ${partsItems.length===0 ? partsRow({part_no:'',description:'',qty:1},0) : ''}
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="add-part-btn">+ Add Part</button>
        </div>`;
    }
    if (ticketType === 'service_line') {
      return `
        <div class="form-group full"><label>Scope of Work *</label>
          <textarea name="scope" rows="4" required>${escHtml(ticket.scope||'')}</textarea>
        </div>
        <div class="form-group"><label>Number of Technicians</label>
          <input name="num_techs" type="number" min="1" max="50" value="${ticket.num_techs||1}"/>
        </div>
        <div class="form-group"><label></label></div>
        <div class="form-group"><label>Start Date</label>
          <input name="service_start_date" type="date" value="${ticket.service_start_date?ticket.service_start_date.split('T')[0]:''}"/>
        </div>
        <div class="form-group"><label>End Date</label>
          <input name="service_end_date" type="date" value="${ticket.service_end_date?ticket.service_end_date.split('T')[0]:''}"/>
        </div>`;
    }
    return '';
  }

  function partsRow(p, i) {
    return `<div class="parts-row" style="display:grid;grid-template-columns:1fr 2fr 70px 32px;gap:6px;align-items:center">
      <input placeholder="Part #" value="${escHtml(p.part_no||'')}" data-field="part_no" data-idx="${i}" class="part-input" />
      <input placeholder="Description" value="${escHtml(p.description||'')}" data-field="description" data-idx="${i}" class="part-input" />
      <input placeholder="Qty" type="number" min="1" value="${p.qty||1}" data-field="qty" data-idx="${i}" class="part-input" style="text-align:center" />
      <button type="button" class="btn btn-sm" onclick="this.closest('.parts-row').remove();syncPartsFromDOM()" style="background:var(--red)22;color:var(--red);padding:4px 6px">✕</button>
    </div>`;
  }

  function syncPartsFromDOM() {
    partsItems = [];
    document.querySelectorAll('.parts-row').forEach(row => {
      partsItems.push({
        part_no: row.querySelector('[data-field="part_no"]')?.value || '',
        description: row.querySelector('[data-field="description"]')?.value || '',
        qty: parseInt(row.querySelector('[data-field="qty"]')?.value) || 1,
      });
    });
  }
  window.syncPartsFromDOM = syncPartsFromDOM;

  const currentType = ticket.ticket_type || 'cs_ticket';
  const currentSiteId = ticket.site_id || prefillSiteId || '';

  function renderPage() {
    const type = ticket.ticket_type || 'cs_ticket';
    const typeLabels = { cs_ticket: 'CS Ticket', parts_order: 'Parts Order', service_line: 'Service Line' };

    container.innerHTML = `
      <div class="page-header" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-secondary btn-sm" id="back-btn">← Back</button>
          <div>
            <h1 style="margin:0">${editing ? escHtml(ticket.astea_request_id||'Ticket') : 'New Ticket'}</h1>
            ${editing ? `<div class="page-subtitle">${statusBadge(ticket.status)} <span class="badge" style="background:var(--bg3);color:var(--text2);margin-left:6px">${typeLabels[type]||type}</span></div>` : ''}
          </div>
        </div>
        ${editing ? `<button class="btn btn-sm" id="delete-ticket-btn" style="background:var(--red)22;color:var(--red);border:1px solid var(--red)44">Delete</button>` : ''}
      </div>

      ${editing ? `
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:10px">Status</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${['open','parts_ordered','tech_dispatched','on_site','resolved','closed'].map(s =>
            `<button class="btn btn-sm ${ticket.status===s?'btn-primary':'btn-secondary'} status-btn" data-status="${s}">${s.replace(/_/g,' ')}</button>`
          ).join('')}
        </div>
      </div>` : ''}

      <form id="ticket-form" style="max-width:900px">
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:16px">Ticket Details</div>
          <div class="form-grid">
            <div class="form-group"><label>Request ID</label>
              <input name="astea_request_id" placeholder="e.g. CS2603170028@@1" value="${escHtml(ticket.astea_request_id||'')}"/>
            </div>
            <div class="form-group"><label>Ticket Type</label>
              <select name="ticket_type" id="ticket-type-select">
                <option value="cs_ticket" ${type==='cs_ticket'?'selected':''}>CS Ticket — Customer Support</option>
                <option value="parts_order" ${type==='parts_order'?'selected':''}>Parts Order</option>
                <option value="service_line" ${type==='service_line'?'selected':''}>Service Line</option>
              </select>
            </div>
            <div class="form-group"><label>Site *</label>
              <select name="site_id" id="site-select" required>
                <option value="">— Select Site —</option>
                ${sites.map(s => `<option value="${s.id}" ${s.id===currentSiteId?'selected':''}>${escHtml(s.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Title / Summary</label>
              <input name="title" value="${escHtml(ticket.title||'')}" placeholder="Brief summary"/>
            </div>
          </div>
        </div>

        <div class="card" id="type-fields-card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:16px" id="type-fields-label">${typeLabels[type]||type}</div>
          <div class="form-grid" id="type-fields">
            ${renderTypeFields(type, currentSiteId)}
          </div>
        </div>

        ${editing ? `
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:10px">Resolution Notes</div>
          <textarea name="resolution" rows="3" style="width:100%">${escHtml(ticket.resolution||'')}</textarea>
        </div>` : ''}

        <div class="form-actions" style="padding:0 0 32px">
          <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
          <button type="submit" class="btn btn-primary">${editing ? 'Save Changes' : 'Open Ticket'}</button>
        </div>
      </form>`;

    document.getElementById('back-btn').addEventListener('click', back);
    document.getElementById('cancel-btn').addEventListener('click', back);

    // Type switcher — re-render type-specific fields
    document.getElementById('ticket-type-select').addEventListener('change', function() {
      const newType = this.value;
      ticket.ticket_type = newType;
      const labels = { cs_ticket: 'CS Ticket — Customer Support', parts_order: 'Parts Order', service_line: 'Service Line' };
      document.getElementById('type-fields-label').textContent = labels[newType]||newType;
      const siteId = document.getElementById('site-select').value;
      document.getElementById('type-fields').innerHTML = renderTypeFields(newType, siteId);
      bindPartsBtn();
    });

    // Site change — re-render unit dropdown in CS ticket type
    document.getElementById('site-select').addEventListener('change', function() {
      const typeEl = document.getElementById('ticket-type-select');
      if (typeEl && typeEl.value === 'cs_ticket') {
        const siteId = this.value;
        document.getElementById('type-fields').innerHTML = renderTypeFields('cs_ticket', siteId);
      }
    });

    bindPartsBtn();

    if (editing) {
      document.getElementById('delete-ticket-btn').addEventListener('click', async () => {
        if (!confirm('Delete this ticket? This cannot be undone.')) return;
        try { await API.tickets.delete(id); toast('Ticket deleted'); navigate(backTo, backParams); }
        catch (e) { toast('Error: ' + e.message, 'error'); }
      });

      document.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await API.tickets.update(id, { status: btn.dataset.status });
            ticket.status = btn.dataset.status;
            toast('Status: ' + btn.dataset.status.replace(/_/g,' '));
            renderPage();
          } catch (e) { toast('Error: ' + e.message, 'error'); }
        });
      });
    }

    document.getElementById('ticket-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      const tType = data.ticket_type || ticket.ticket_type || 'cs_ticket';

      // Collect parts items for parts_order
      if (tType === 'parts_order') {
        syncPartsFromDOM();
        data.parts_items = partsItems;
      }
      // num_techs as int
      if (data.num_techs) data.num_techs = parseInt(data.num_techs);
      // Clear empty strings to null
      Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });

      try {
        if (editing) {
          await API.tickets.update(id, data);
          toast('Ticket updated');
          navigate(backTo, backParams);
        } else {
          await API.tickets.create(data);
          toast('Ticket opened');
          navigate('tickets');
        }
      } catch (err) { toast('Error: ' + err.message, 'error'); }
    });
  }

  function bindPartsBtn() {
    document.getElementById('add-part-btn')?.addEventListener('click', () => {
      syncPartsFromDOM();
      partsItems.push({ part_no: '', description: '', qty: 1 });
      const list = document.getElementById('parts-list');
      if (list) {
        const div = document.createElement('div');
        div.innerHTML = partsRow({part_no:'',description:'',qty:1}, partsItems.length-1);
        list.appendChild(div.firstElementChild);
      }
    });
  }

  renderPage();
}
