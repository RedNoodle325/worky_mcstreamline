const TODO_PRIORITY = {
  urgent: { label: 'Urgent', color: '#dc2626' },
  high:   { label: 'High',   color: '#ea580c' },
  normal: { label: 'Normal', color: '#2563eb' },
  low:    { label: 'Low',    color: '#6b7280' },
};
const TODO_STATUS = {
  todo:        { label: 'To Do',       color: '#6b7280' },
  in_progress: { label: 'In Progress', color: '#d97706' },
  done:        { label: 'Done',        color: '#16a34a' },
};

async function renderTodos(container, params = {}) {
  container.innerHTML = `
    <div class="page-header" style="margin-bottom:20px">
      <div>
        <h1 style="margin:0">To-Do</h1>
        <div class="page-subtitle">Personal task list</div>
      </div>
      <button class="btn btn-primary btn-sm" id="new-todo-btn">+ New Task</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="todo-filter btn btn-secondary btn-sm active" data-status="">All</button>
      <button class="todo-filter btn btn-secondary btn-sm" data-status="todo">To Do</button>
      <button class="todo-filter btn btn-secondary btn-sm" data-status="in_progress">In Progress</button>
      <button class="todo-filter btn btn-secondary btn-sm" data-status="done">Done</button>
    </div>
    <div id="todos-list"><div style="color:var(--text3);padding:20px">Loading…</div></div>`;

  let todos = [], sites = [];
  let activeStatus = '';

  async function load() {
    try {
      [todos, sites] = await Promise.all([
        API.todos.list(activeStatus ? { status: activeStatus } : {}),
        API.sites.list(),
      ]);
      render();
    } catch (e) { toast('Failed to load todos: ' + e.message, 'error'); }
  }

  function siteNameFor(id) {
    return id ? (sites.find(s => s.id === id)?.name || '—') : null;
  }

  function render() {
    const el = document.getElementById('todos-list');
    if (!todos.length) {
      el.innerHTML = `<div style="color:var(--text3);padding:20px;text-align:center">No tasks yet. Add one!</div>`;
      return;
    }
    el.innerHTML = todos.map(t => todoCard(t)).join('');
  }

  function todoCard(t) {
    const pri  = TODO_PRIORITY[t.priority] || TODO_PRIORITY.normal;
    const st   = TODO_STATUS[t.status]     || TODO_STATUS.todo;
    const site = siteNameFor(t.site_id);
    const due  = t.due_date ? new Date(t.due_date + 'T00:00:00') : null;
    const overdue = due && due < new Date() && t.status !== 'done';
    const dueStr = due ? due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
    return `
      <div style="border:1px solid var(--border);border-left:3px solid ${pri.color};border-radius:8px;padding:12px 14px;margin-bottom:8px;background:var(--bg2);display:flex;align-items:flex-start;gap:12px;${t.status==='done'?'opacity:0.6':''}">
        <input type="checkbox" style="margin-top:3px;cursor:pointer;width:16px;height:16px;flex-shrink:0" ${t.status==='done'?'checked':''} onchange="toggleTodoDone('${t.id}', this.checked)">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-size:14px;font-weight:600;${t.status==='done'?'text-decoration:line-through;color:var(--text3)':''}">${escHtml(t.title)}</span>
            <span style="font-size:10px;font-weight:700;color:${st.color};background:${st.color}18;border:1px solid ${st.color}44;border-radius:99px;padding:1px 7px">${st.label}</span>
            <span style="font-size:10px;font-weight:700;color:${pri.color};background:${pri.color}18;border:1px solid ${pri.color}44;border-radius:99px;padding:1px 7px">${pri.label}</span>
          </div>
          ${t.description ? `<div style="font-size:12px;color:var(--text2);margin-bottom:4px;white-space:pre-wrap">${escHtml(t.description)}</div>` : ''}
          <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--text3)">
            ${site ? `<span>📍 <a onclick="navigate('site-detail',{id:'${t.site_id}'})" style="cursor:pointer;color:var(--accent)">${escHtml(site)}</a></span>` : ''}
            ${dueStr ? `<span style="color:${overdue?'var(--red)':'var(--text3)'}">⏰ ${overdue?'Overdue · ':''}${dueStr}</span>` : ''}
          </div>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="openTodoModal('${t.id}')" style="flex-shrink:0">Edit</button>
      </div>`;
  }

  window.toggleTodoDone = async (id, checked) => {
    try {
      const updated = await API.todos.update(id, { status: checked ? 'done' : 'todo' });
      const idx = todos.findIndex(t => t.id === id);
      if (idx >= 0) todos[idx] = updated;
      render();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  };

  window.openTodoModal = (todoId) => {
    const existing = todoId ? todos.find(t => t.id === todoId) : null;
    const mid = 'todo-modal';
    document.getElementById(mid)?.remove();
    const modal = document.createElement('div');
    modal.id = mid;
    modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:2000;display:flex;align-items:center;justify-content:center;padding:24px';
    modal.innerHTML = `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:480px;width:100%">
        <div style="font-size:16px;font-weight:700;margin-bottom:16px">${existing ? 'Edit Task' : 'New Task'}</div>
        <form id="todo-form">
          <div class="form-group" style="margin-bottom:12px"><label>Task *</label>
            <input name="title" required value="${escHtml(existing?.title||'')}" placeholder="e.g. Complete MSOW for QTS Chicago"/>
          </div>
          <div class="form-group" style="margin-bottom:12px"><label>Details</label>
            <textarea name="description" rows="3" placeholder="Additional notes…">${escHtml(existing?.description||'')}</textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div class="form-group"><label>Priority</label>
              <select name="priority">
                ${Object.entries(TODO_PRIORITY).map(([v,c]) => `<option value="${v}" ${(existing?.priority||'normal')===v?'selected':''}>${c.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Status</label>
              <select name="status">
                ${Object.entries(TODO_STATUS).map(([v,c]) => `<option value="${v}" ${(existing?.status||'todo')===v?'selected':''}>${c.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div class="form-group"><label>Due Date</label>
              <input type="date" name="due_date" value="${existing?.due_date||''}"/>
            </div>
            <div class="form-group"><label>Site (optional)</label>
              <select name="site_id">
                <option value="">— Not site-specific —</option>
                ${sites.map(s => `<option value="${s.id}" ${existing?.site_id===s.id?'selected':''}>${escHtml(s.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;gap:8px">
            ${existing ? `<button type="button" class="btn btn-secondary" style="color:var(--red)" id="del-todo-btn">Delete</button>` : '<span></span>'}
            <div style="display:flex;gap:8px">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('${mid}')?.remove()">Cancel</button>
              <button type="submit" class="btn btn-primary">${existing ? 'Save' : 'Add Task'}</button>
            </div>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('#todo-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      Object.keys(data).forEach(k => { if (data[k]==='') data[k]=null; });
      try {
        if (existing) {
          const updated = await API.todos.update(existing.id, data);
          const idx = todos.findIndex(t => t.id === existing.id);
          if (idx >= 0) todos[idx] = updated; else todos.unshift(updated);
        } else {
          const created = await API.todos.create(data);
          todos.unshift(created);
        }
        render();
        modal.remove();
        toast(existing ? 'Task saved' : 'Task added');
      } catch (err) { toast('Error: ' + err.message, 'error'); }
    });

    modal.querySelector('#del-todo-btn')?.addEventListener('click', async () => {
      if (!confirm('Delete this task?')) return;
      try {
        await API.todos.delete(existing.id);
        todos = todos.filter(t => t.id !== existing.id);
        render();
        modal.remove();
        toast('Task deleted');
      } catch (err) { toast('Error: ' + err.message, 'error'); }
    });
  };

  document.getElementById('new-todo-btn').addEventListener('click', () => openTodoModal(null));

  document.querySelectorAll('.todo-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.todo-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeStatus = btn.dataset.status;
      load();
    });
  });

  await load();
}
