async function renderNotes(container, params = {}) {
  container.innerHTML = `
    <div class="page-header" style="margin-bottom:20px">
      <div>
        <h1 style="margin:0">Notes</h1>
        <div class="page-subtitle">Search notes across all sites and units</div>
      </div>
    </div>

    <!-- Search bar -->
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <input id="notes-search-input" type="text" placeholder="Search by keyword, site, or unit…"
          style="flex:1;min-width:200px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-size:14px"
          value="${escHtml(params.q || '')}"/>
        <button class="btn btn-primary" id="notes-search-btn">Search</button>
        <button class="btn btn-secondary" id="notes-clear-btn">Clear</button>
      </div>
    </div>

    <!-- Results -->
    <div id="notes-results">
      <div style="color:var(--text3);font-size:13px;padding:12px 0">Enter a search term to find notes, or leave blank to see all recent notes.</div>
    </div>
  `;

  const searchInput = document.getElementById('notes-search-input');
  const resultsEl   = document.getElementById('notes-results');

  async function doSearch() {
    const q = searchInput.value.trim();
    resultsEl.innerHTML = '<div style="color:var(--text2);font-size:13px;padding:12px 0">Searching…</div>';
    try {
      const results = await API.notes.search(q ? { q } : {});
      renderResults(results, q);
    } catch (e) {
      resultsEl.innerHTML = `<div style="color:var(--red);padding:12px 0">Error: ${escHtml(e.message)}</div>`;
    }
  }

  function renderResults(list, q) {
    if (!list.length) {
      resultsEl.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:12px 0">No notes found.</div>';
      return;
    }

    // Group by site
    const bySite = {};
    list.forEach(n => {
      const key = n.site_id || '__no_site__';
      if (!bySite[key]) bySite[key] = { site_name: n.site_name, site_id: n.site_id, notes: [] };
      bySite[key].notes.push(n);
    });

    const html = Object.values(bySite).map(group => {
      const siteName = group.site_name || 'Unknown Site';
      const notesHtml = group.notes.map(n => {
        const unitLabel = n.unit_asset_tag || n.unit_serial || null;
        const NOTE_TYPE_CONFIG = {
          meeting:    { icon: '👥', label: 'Meeting',    color: '#7c3aed' },
          phone_call: { icon: '📞', label: 'Phone Call', color: '#2563eb' },
          email:      { icon: '✉️',  label: 'Email',      color: '#0891b2' },
          note:       { icon: '📝', label: 'Note',       color: '#6b7280' },
        };
        const CONTENT_LABELS = { date:'Date', attendees:'Attendees', agenda:'Agenda', notes:'Notes', actions:'Action Items', with:'With', purpose:'Purpose', to_from:'To / From', subject:'Subject' };
        const typeCfg = NOTE_TYPE_CONFIG[n.note_type] || NOTE_TYPE_CONFIG.note;

        // Parse structured JSON content
        let parsed = null;
        try { const c = n.content?.trim(); if (c?.startsWith('{')) parsed = JSON.parse(c); } catch {}

        const whoField = parsed?.attendees || parsed?.with || parsed?.to_from || null;

        function renderContent(p) {
          if (!p) return '';
          return Object.entries(p)
            .filter(([k, v]) => v && k !== 'notes')
            .map(([k, v]) => `<div style="margin-bottom:6px"><span style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3)">${CONTENT_LABELS[k]||k}</span><div style="font-size:12px;color:var(--text2);white-space:pre-wrap">${escHtml(v)}</div></div>`)
            .join('') +
            (p.notes ? `<div><span style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3)">Notes</span><div style="font-size:13px;color:var(--text);white-space:pre-wrap;margin-top:2px">${escHtml(p.notes)}</div></div>` : '');
        }

        const highlight = (text) => {
          if (!q) return escHtml(text);
          const safe = escHtml(text);
          const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
          return safe.replace(re, '<mark style="background:var(--yellow)33;color:var(--yellow);border-radius:2px">$1</mark>');
        };

        return `
          <div style="border:1px solid var(--border);border-left:3px solid ${typeCfg.color};border-radius:8px;padding:12px;margin-bottom:8px;background:var(--bg3);cursor:pointer" onclick="openNoteEdit('${n.id}')">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:${parsed ? 8 : 4}px;flex-wrap:wrap;gap:6px">
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <span style="font-size:11px;font-weight:700;color:${typeCfg.color};background:${typeCfg.color}18;border:1px solid ${typeCfg.color}44;border-radius:99px;padding:1px 8px">${typeCfg.icon} ${typeCfg.label}</span>
                ${whoField ? `<span style="font-size:12px;color:var(--text2)">${escHtml(whoField)}</span>` : ''}
                ${unitLabel ? `<span style="font-size:11px;font-family:monospace;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:1px 6px" onclick="event.stopPropagation();navigate('unit-detail',{id:'${n.unit_id}'})">${escHtml(unitLabel)}</span>` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:11px;color:var(--text3)">${fmt(n.created_at)}</span>
                <span class="edit-ui" style="font-size:11px;color:var(--accent);font-weight:600">Edit</span>
              </div>
            </div>
            ${parsed
              ? `<div style="margin-top:4px">${renderContent(parsed)}</div>`
              : `<div style="white-space:pre-wrap;font-size:13px;color:var(--text)">${highlight(n.content||'')}</div>`
            }
          </div>`;
      }).join('');

      return `
        <div style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <a onclick="navigate('site-detail',{id:'${group.site_id}'})" style="cursor:pointer;font-size:15px;font-weight:600;color:var(--text)">${escHtml(siteName)}</a>
            <span style="font-size:11px;color:var(--text3)">${group.notes.length} note${group.notes.length !== 1 ? 's' : ''}</span>
          </div>
          ${notesHtml}
        </div>`;
    }).join('');

    resultsEl.innerHTML = `
      <div style="font-size:12px;color:var(--text3);margin-bottom:12px">${list.length} note${list.length !== 1 ? 's' : ''} found</div>
      ${html}`;
  }

  document.getElementById('notes-search-btn').addEventListener('click', doSearch);
  document.getElementById('notes-clear-btn').addEventListener('click', () => {
    searchInput.value = '';
    resultsEl.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:12px 0">Enter a search term to find notes, or leave blank to see all recent notes.</div>';
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  // Auto-search if query param passed, or load all on open
  doSearch();

  // ── Note edit modal ────────────────────────────────────────────────────────
  let allNotesCache = [];

  // Keep a fresh cache after each search so edit modal can find the note
  const _origRender = renderResults;
  renderResults = (list, q) => { allNotesCache = list; _origRender(list, q); };

  window.openNoteEdit = (noteId) => {
    const note = allNotesCache.find(n => n.id === noteId);
    if (!note) return;

    const NOTE_TYPE_CONFIG = {
      meeting:    { icon: '👥', label: 'Meeting',    color: '#7c3aed' },
      phone_call: { icon: '📞', label: 'Phone Call', color: '#2563eb' },
      email:      { icon: '✉️',  label: 'Email',      color: '#0891b2' },
      note:       { icon: '📝', label: 'Note',       color: '#6b7280' },
    };
    const NOTE_TEMPLATES = {
      meeting:    ['date','attendees','agenda','notes','actions'],
      phone_call: ['date','with','purpose','notes','actions'],
      email:      ['date','to_from','subject','notes','actions'],
      note:       ['notes'],
    };
    const FIELD_LABELS = { date:'Date', attendees:'Attendees', agenda:'Agenda', notes:'Notes', actions:'Action Items', with:'With', purpose:'Purpose', to_from:'To / From', subject:'Subject' };
    const FIELD_TYPES  = { date:'datetime-local' };

    let parsed = null;
    try { const c = note.content?.trim(); if (c?.startsWith('{')) parsed = JSON.parse(c); } catch {}
    const activeType = note.note_type || 'note';

    const mid = 'global-note-edit-modal';
    document.getElementById(mid)?.remove();
    const modal = document.createElement('div');
    modal.id = mid;
    modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:2000;display:flex;align-items:center;justify-content:center;padding:24px';

    function buildFields(type, data) {
      return (NOTE_TEMPLATES[type] || NOTE_TEMPLATES.note).map(field => {
        const label = FIELD_LABELS[field] || field;
        const val   = escHtml(data?.[field] || '');
        const ftype = FIELD_TYPES[field] || 'text';
        if (field === 'notes' || field === 'agenda' || field === 'actions' || field === 'purpose') {
          return `<div class="form-group" style="margin-bottom:10px"><label style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3)">${label}</label><textarea name="${field}" rows="3" style="width:100%;box-sizing:border-box">${val}</textarea></div>`;
        }
        return `<div class="form-group" style="margin-bottom:10px"><label style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3)">${label}</label><input type="${ftype}" name="${field}" value="${val}" style="width:100%;box-sizing:border-box"/></div>`;
      }).join('');
    }

    modal.innerHTML = `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:520px;width:100%;max-height:88vh;overflow-y:auto">
        <div style="font-size:16px;font-weight:700;margin-bottom:4px">Edit Log Entry</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:16px">${escHtml(note.site_name || 'Unknown Site')}</div>
        <form id="note-edit-form">
          <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
            ${Object.entries(NOTE_TYPE_CONFIG).map(([val, cfg]) =>
              `<label style="flex:1;cursor:pointer;min-width:80px">
                <input type="radio" name="note_type" value="${val}" style="display:none" ${activeType===val?'checked':''}>
                <div class="note-type-btn" data-val="${val}" style="text-align:center;padding:7px 4px;border:1px solid var(--border);border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;${activeType===val?'background:var(--accent);color:#fff;border-color:var(--accent)':''}">${cfg.icon} ${cfg.label}</div>
              </label>`
            ).join('')}
          </div>
          <div id="note-edit-fields">${buildFields(activeType, parsed)}</div>
          <input type="hidden" name="content" id="note-edit-content"/>
          <div style="display:flex;justify-content:space-between;gap:8px;margin-top:16px">
            <button type="button" class="btn btn-secondary" style="color:var(--red)" id="delete-note-btn">Delete</button>
            <div style="display:flex;gap:8px">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('${mid}')?.remove()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);

    // Type switcher
    modal.querySelectorAll('.note-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.note-type-btn').forEach(b => { b.style.background=''; b.style.color=''; b.style.borderColor='var(--border)'; });
        btn.style.background='var(--accent)'; btn.style.color='#fff'; btn.style.borderColor='var(--accent)';
        modal.querySelector(`input[value="${btn.dataset.val}"]`).checked = true;
        document.getElementById('note-edit-fields').innerHTML = buildFields(btn.dataset.val, null);
      });
    });

    modal.querySelector('#note-edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const type = fd.get('note_type') || 'note';
      const contentObj = {};
      (NOTE_TEMPLATES[type] || NOTE_TEMPLATES.note).forEach(f => { const v = fd.get(f); if (v) contentObj[f] = v; });
      fd.set('content', JSON.stringify(contentObj));
      const data = { note_type: type, content: fd.get('content') };
      try {
        await API.notes.update(note.id, data);
        modal.remove();
        toast('Note saved');
        doSearch();
      } catch (err) { toast('Error: ' + err.message, 'error'); }
    });

    modal.querySelector('#delete-note-btn').addEventListener('click', async () => {
      if (!confirm('Delete this note?')) return;
      try {
        await API.notes.delete(note.id);
        modal.remove();
        toast('Note deleted');
        doSearch();
      } catch (err) { toast('Error: ' + err.message, 'error'); }
    });
  };
}
