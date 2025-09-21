// Polished Task Manager - Bootstrap only, per-user localStorage, edit modal, sorting, alerts

// ---- Utilities: storage helpers ----
function getUsers() {
  return JSON.parse(localStorage.getItem('tm_users') || '[]');
}
function saveUsers(users) {
  localStorage.setItem('tm_users', JSON.stringify(users));
}
function getLoggedInUser() {
  return localStorage.getItem('tm_loggedIn') || null;
}
function setLoggedInUser(u) {
  if (u) localStorage.setItem('tm_loggedIn', u);
  else localStorage.removeItem('tm_loggedIn');
}
function getTasks(username) {
  return JSON.parse(localStorage.getItem('tm_tasks_' + username) || '[]');
}
function saveTasks(username, tasks) {
  localStorage.setItem('tm_tasks_' + username, JSON.stringify(tasks));
}

// ---- Alerts ----
function showAlert(message, type='success', timeout=2800, target='alert-area') {
  const area = document.getElementById(target);
  if (!area) return;
  const id = 'a' + Date.now();
  const html = `<div id="${id}" class="alert alert-${type} alert-dismissible shadow-sm" role="alert">
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  </div>`;
  area.insertAdjacentHTML('afterbegin', html);
  if (timeout) setTimeout(()=>{ const el = document.getElementById(id); if(el) el.remove(); }, timeout);
}

// ---- Auth pages (signup / login) ----
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', e => {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const users = getUsers();
    if (users.find(u=>u.username===username)) { showAlert('Username already taken','danger','', 'alert-placeholder'); return; }
    if (password.length < 6) { showAlert('Password must be 6+ chars','warning','', 'alert-placeholder'); return; }
    users.push({username, password});
    saveUsers(users);
    showAlert('Account created — please login','success',3000,'alert-placeholder');
    setTimeout(()=> location.href='index.html', 700);
  });
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', e=> {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const users = getUsers();
    const u = users.find(x=>x.username===username && x.password===password);
    if (u) {
      setLoggedInUser(username);
      location.href='tasks.html';
    } else {
      showAlert('Invalid username or password','danger',3500,'alert-placeholder');
    }
  });
}

// ---- Tasks page logic ----
if (window.location.pathname.includes('tasks.html')) {
  const user = getLoggedInUser();
  if (!user) { location.href = 'index.html'; }
  const userDisplay = document.getElementById('userDisplay');
  const logoutBtn = document.getElementById('logoutBtn');
  const taskForm = document.getElementById('taskForm');
  const filterCategory = document.getElementById('filterCategory');
  const sortBy = document.getElementById('sortBy');
  const tasksContainer = document.getElementById('tasksContainer');
  const resetBtn = document.getElementById('resetBtn');
  const editModal = new bootstrap.Modal(document.getElementById('editModal'));
  const modalEditForm = document.getElementById('modalEditForm');

  userDisplay.textContent = user;

  logoutBtn.addEventListener('click', ()=> { setLoggedInUser(null); location.href='index.html'; });

  function loadAndRender() {
    let tasks = getTasks(user);
    // sort
    const s = sortBy.value || 'deadline_asc';
    if (s === 'deadline_asc') tasks.sort((a,b)=> new Date(a.deadline) - new Date(b.deadline));
    if (s === 'deadline_desc') tasks.sort((a,b)=> new Date(b.deadline) - new Date(a.deadline));
    if (s === 'created_desc') tasks.sort((a,b)=> (b.createdAt||0) - (a.createdAt||0));
    renderTasks(tasks);
  }

  function renderTasks(tasks) {
    tasksContainer.innerHTML = '';
    const filter = filterCategory.value || 'all';
    if (!tasks.length) { tasksContainer.innerHTML = '<div class="col"><div class="card p-3 text-center text-muted">No tasks yet — add one!</div></div>'; return; }

    tasks.forEach((t, idx) => {
      if (filter !== 'all' && t.category !== filter) return;
      const dl = new Date(t.deadline);
      const now = new Date();
      const today = new Date(); today.setHours(0,0,0,0);
      const isOverdue = dl < today;
      const isToday = dl.getFullYear()===today.getFullYear() && dl.getMonth()===today.getMonth() && dl.getDate()===today.getDate();
      const badgeColor = t.category === 'urgent' ? 'danger' : t.category === 'work' ? 'primary' : 'success';
      const card = document.createElement('div');
      card.className = 'col';
      card.innerHTML = `
        <div class="card task-card p-3 shadow-sm ${t.completed ? 'completed' : ''}">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h6 class="mb-1">${escapeHtml(t.title)}</h6>
              <div class="small-muted">${escapeHtml(t.description||'')}</div>
            </div>
            <div class="text-end">
              <span class="badge bg-${badgeColor} mb-2">${t.category}</span>
              <div class="${isOverdue ? 'overdue' : isToday ? 'due-today' : 'text-success'} small">${t.deadline}</div>
            </div>
          </div>
          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-sm ${t.completed ? 'btn-secondary' : 'btn-success'}" data-action="toggle">${t.completed ? 'Undo' : 'Complete'}</button>
            <button class="btn btn-sm btn-outline-primary" data-action="edit">Edit</button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete">Delete</button>
          </div>
        </div>
      `;
      // actions
      card.querySelectorAll('button').forEach(btn=>{
        btn.addEventListener('click', async (e)=>{
          const action = btn.getAttribute('data-action');
          if (action === 'toggle') {
            t.completed = !t.completed;
            saveTasks(user, tasks);
            loadAndRender();
            showAlert(t.completed ? 'Marked completed' : 'Marked incomplete', 'success');
          } else if (action === 'edit') {
            // populate modal and show
            document.getElementById('modalTitle').value = t.title;
            document.getElementById('modalDesc').value = t.description || '';
            document.getElementById('modalDeadline').value = t.deadline;
            document.getElementById('modalCategory').value = t.category;
            // attach submit handler for modal form
            modalEditForm.onsubmit = function(ev) {
              ev.preventDefault();
              t.title = document.getElementById('modalTitle').value.trim();
              t.description = document.getElementById('modalDesc').value.trim();
              t.deadline = document.getElementById('modalDeadline').value;
              t.category = document.getElementById('modalCategory').value;
              saveTasks(user, tasks);
              editModal.hide();
              loadAndRender();
              showAlert('Task updated','success');
            };
            editModal.show();
          } else if (action === 'delete') {
            if (!confirm('Delete this task?')) return;
            tasks.splice(idx,1);
            saveTasks(user,tasks);
            loadAndRender();
            showAlert('Task deleted','warning');
          }
        });
      });

      tasksContainer.appendChild(card);
    });
  }

  // add new or update
  taskForm.addEventListener('submit', e=>{
    e.preventDefault();
    const title = document.getElementById('taskTitle').value.trim();
    const desc = document.getElementById('taskDesc').value.trim();
    const deadline = document.getElementById('taskDeadline').value;
    const category = document.getElementById('taskCategory').value;
    if (!title || !deadline) { showAlert('Title and deadline required','danger'); return; }
    const tasks = getTasks(user);
    const newTask = { title, description: desc, deadline, category, completed:false, createdAt: Date.now() };
    tasks.push(newTask);
    saveTasks(user,tasks);
    taskForm.reset();
    loadAndRender();
    showAlert('Task added','success');
  });

  resetBtn.addEventListener('click', ()=>{ document.getElementById('editIndex').value = ''; taskForm.reset(); });

  filterCategory.addEventListener('change', loadAndRender);
  sortBy.addEventListener('change', loadAndRender);

  // initial load
  loadAndRender();
}

// small escape helper
function escapeHtml(s){ if(!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
