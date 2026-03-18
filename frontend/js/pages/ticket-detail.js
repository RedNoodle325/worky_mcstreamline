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
  const siteName = (sid) => sites.find(s => s.id === sid)?.name || '—';
  const unitSerial = (uid) => { const u = units.find(u => u.id === uid); return u ? serial(u) : '—'; };

  function renderPage() {
    container.innerHTML = `
      <div class="page-header" style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-secondary btn-sm" id="back-btn">← Back</button>
          <div>
            <h1 style="margin:0;font-family:monospace">${editing ? escHtml(ticket.astea_request_id || 'Ticket') : 'New Ticket'}</h1>
            ${editing ? `<div class="page-subtitle">${statusBadge(ticket.status)} <span style="margin-left:8px;color:var(--text2)">${escHtml(ticket.title||'')}</span></div>` : ''}
          </div>
        </div>
        ${editing ? `<button class="btn btn-sm" id="delete-ticket-btn" style="background:var(--red)22;color:var(--red);border:1px solid var(--red)44">Delete Ticket</button>` : ''}
      </div>

      ${editing ? `
      <!-- Status panel -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:12px">Quick Status Update</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
          ${['open','parts_ordered','tech_dispatched','on_site','resolved','closed'].map(s =>
            `<button class="btn btn-sm ${ticket.status===s?'btn-primary':'btn-secondary'} status-btn" data-status="${s}">${s.replace(/_/g,' ')}</button>`
          ).join('')}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm ${ticket.parts_ordered?'btn-primary':'btn-secondary'}" id="toggle-parts">
            ${ticket.parts_ordered?'✓ ':''} Parts Ordered
          </button>
          <button class="btn btn-sm ${ticket.tech_dispatched?'btn-primary':'btn-secondary'}" id="toggle-tech">
            ${ticket.tech_dispatched?'✓ ':''} Tech Dispatched
          </button>
        </div>
      </div>` : ''}

      <form id="ticket-form" style="max-width:900px">
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:16px">Ticket Details</div>
          <div class="form-grid">
            <div class="form-group"><label>Astea Request ID</label>
              <input name="astea_request_id" placeholder="CS260317XXXX@@1" value="${escHtml(ticket.astea_request_id||'')}"/>
            </div>
            <div class="form-group"><label>Line Number</label>
              <input name="ticket_line_number" type="number" min="1" max="100" value="${ticket.ticket_line_number||1}"/>
            </div>
            <div class="form-group"><label>Site *</label>
              <select name="site_id" required>
                <option value="">— Select Site —</option>
                ${sites.map(s => `<option value="${s.id}" ${s.id===(ticket.site_id||prefillSiteId||'')?'selected':''}>${escHtml(s.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Unit (optional)</label>
              <select name="unit_id">
                <option value="">— No specific unit —</option>
                ${units.map(u => `<option value="${u.id}" ${u.id===(ticket.unit_id||prefillUnitId||'')?'selected':''}>${escHtml(serial(u))} – ${escHtml(u.unit_type||'')}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Ticket Type</label>
              <select name="ticket_type">
                <option value="complaint" ${(ticket.ticket_type||'complaint')==='complaint'?'selected':''}>Complaint</option>
                <option value="service_order" ${ticket.ticket_type==='service_order'?'selected':''}>Service Order</option>
                <option value="warranty" ${ticket.ticket_type==='warranty'?'selected':''}>Warranty</option>
                <option value="pm" ${ticket.ticket_type==='pm'?'selected':''}>Preventive Maintenance</option>
              </select>
            </div>
            <div class="form-group"><label>Reported By</label>
              <select name="reported_by_type">
                <option value="technician" ${(ticket.reported_by_type||'technician')==='technician'?'selected':''}>Technician</option>
                <option value="site_representative" ${ticket.reported_by_type==='site_representative'?'selected':''}>Site Representative</option>
                <option value="internal" ${ticket.reported_by_type==='internal'?'selected':''}>Internal</option>
              </select>
            </div>
            <div class="form-group full"><label>Title *</label>
              <input name="title" required value="${escHtml(ticket.title||'')}" placeholder="Brief description of the issue"/>
            </div>
            <div class="form-group full"><label>Description</label>
              <textarea name="description" rows="4">${escHtml(ticket.description||'')}</textarea>
            </div>
            <div class="form-group full"><label>Resolution Notes</label>
              <textarea name="resolution" rows="3">${escHtml(ticket.resolution||'')}</textarea>
            </div>
          </div>
        </div>

        ${editing ? `
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:12px">Record Info</div>
          <div class="grid-2">
            <div><div class="section-title">Site</div><div style="color:var(--text2)">${escHtml(siteName(ticket.site_id))}</div></div>
            <div><div class="section-title">Unit</div><div style="font-family:monospace;color:var(--text2)">${escHtml(unitSerial(ticket.unit_id))}</div></div>
            <div><div class="section-title">Opened</div><div style="color:var(--text2)">${fmt(ticket.created_at)}</div></div>
            <div><div class="section-title">Last Updated</div><div style="color:var(--text2)">${fmt(ticket.updated_at)}</div></div>
          </div>
        </div>` : ''}

        <div class="form-actions" style="padding:0 0 32px">
          <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
          <button type="submit" class="btn btn-primary">${editing ? 'Save Changes' : 'Open Ticket'}</button>
        </div>
      </form>`;

    document.getElementById('back-btn').addEventListener('click', back);
    document.getElementById('cancel-btn').addEventListener('click', back);

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
            toast('Status updated: ' + btn.dataset.status.replace(/_/g,' '));
            renderPage();
          } catch (e) { toast('Error: ' + e.message, 'error'); }
        });
      });

      document.getElementById('toggle-parts').addEventListener('click', async () => {
        try {
          await API.tickets.update(id, { parts_ordered: !ticket.parts_ordered });
          ticket.parts_ordered = !ticket.parts_ordered;
          toast('Parts ordered: ' + (ticket.parts_ordered ? 'yes' : 'no'));
          renderPage();
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });

      document.getElementById('toggle-tech').addEventListener('click', async () => {
        try {
          await API.tickets.update(id, { tech_dispatched: !ticket.tech_dispatched });
          ticket.tech_dispatched = !ticket.tech_dispatched;
          toast('Tech dispatched: ' + (ticket.tech_dispatched ? 'yes' : 'no'));
          renderPage();
        } catch (e) { toast('Error: ' + e.message, 'error'); }
      });
    }

    document.getElementById('ticket-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      data.ticket_line_number = parseInt(data.ticket_line_number) || 1;
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

  renderPage();
}
