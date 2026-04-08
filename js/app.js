/* ===== Life Dashboard - app.js ===== */

// ── Storage helpers ──────────────────────────────────────────────
const store = {
  get: (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

// ── State ────────────────────────────────────────────────────────
let todos   = store.get('todos', []);
let links   = store.get('links', []);
let theme   = store.get('theme', 'dark');
let name    = store.get('userName', '');
let filter  = 'all';
let sort    = 'newest';

// Timer state
let timerSeconds  = 25 * 60;
let timerInterval = null;
let timerRunning  = false;

// ── DOM refs ─────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const clockEl      = $('clock');
const dateEl       = $('date');
const greetingEl   = $('greeting');
const themeToggle  = $('themeToggle');
const editNameBtn  = $('editNameBtn');
const nameModal    = $('nameModal');
const nameInput    = $('nameInput');
const saveName     = $('saveName');
const cancelName   = $('cancelName');

const timerDisplay = $('timerDisplay');
const timerLabel   = $('timerLabel');
const timerStart   = $('timerStart');
const timerStop    = $('timerStop');
const timerReset   = $('timerReset');

const todoInput    = $('todoInput');
const addTodoBtn   = $('addTodo');
const todoList     = $('todoList');
const todoEmpty    = $('todoEmpty');
const sortSelect   = $('sortSelect');

const linkName     = $('linkName');
const linkUrl      = $('linkUrl');
const addLinkBtn   = $('addLink');
const linksGrid    = $('linksGrid');
const linksEmpty   = $('linksEmpty');

// ── Clock & Greeting ─────────────────────────────────────────────
function updateClock() {
  const now  = new Date();
  const h    = String(now.getHours()).padStart(2, '0');
  const m    = String(now.getMinutes()).padStart(2, '0');
  const s    = String(now.getSeconds()).padStart(2, '0');
  clockEl.textContent = `${h}:${m}:${s}`;

  const days   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  dateEl.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  const hour = now.getHours();
  let salam = hour < 12 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';
  greetingEl.textContent = name ? `${salam}, ${name} 👋` : `${salam} 👋`;
}

// ── Theme ────────────────────────────────────────────────────────
function applyTheme(t) {
  theme = t;
  document.documentElement.setAttribute('data-theme', t);
  themeToggle.textContent = t === 'dark' ? '🌙' : '☀️';
  store.set('theme', t);
}

themeToggle.addEventListener('click', () => applyTheme(theme === 'dark' ? 'light' : 'dark'));

// ── Name Modal ───────────────────────────────────────────────────
function openNameModal() {
  nameInput.value = name;
  nameModal.classList.add('open');
  nameInput.focus();
}

function closeNameModal() {
  nameModal.classList.remove('open');
}

editNameBtn.addEventListener('click', openNameModal);
cancelName.addEventListener('click', closeNameModal);
nameModal.addEventListener('click', e => { if (e.target === nameModal) closeNameModal(); });

saveName.addEventListener('click', () => {
  const val = nameInput.value.trim();
  name = val;
  store.set('userName', name);
  closeNameModal();
  updateClock();
});

nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveName.click(); });

// Show name modal on first visit
if (!name) {
  setTimeout(openNameModal, 600);
}

// ── Focus Timer ──────────────────────────────────────────────────
function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTime(timerSeconds);
}

timerStart.addEventListener('click', () => {
  if (timerRunning) return;
  timerRunning = true;
  timerLabel.textContent = 'Sedang fokus...';
  timerDisplay.parentElement.classList.add('timer-running');
  timerInterval = setInterval(() => {
    timerSeconds--;
    renderTimer();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerLabel.textContent = 'Waktu habis! Istirahat dulu 🎉';
      timerDisplay.parentElement.classList.remove('timer-running');
      // Simple notification
      if (Notification.permission === 'granted') {
        new Notification('Pomodoro selesai!', { body: 'Waktunya istirahat.' });
      }
    }
  }, 1000);
});

timerStop.addEventListener('click', () => {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  timerLabel.textContent = 'Dijeda';
  timerDisplay.parentElement.classList.remove('timer-running');
});

timerReset.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = 25 * 60;
  renderTimer();
  timerLabel.textContent = 'Siap untuk fokus';
  timerDisplay.parentElement.classList.remove('timer-running');
});

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// ── To-Do List ───────────────────────────────────────────────────
function saveTodos() { store.set('todos', todos); }

function getFilteredSorted() {
  let list = [...todos];

  // Filter
  if (filter === 'active') list = list.filter(t => !t.done);
  if (filter === 'done')   list = list.filter(t => t.done);

  // Sort
  if (sort === 'newest')    list.sort((a, b) => b.id - a.id);
  if (sort === 'oldest')    list.sort((a, b) => a.id - b.id);
  if (sort === 'az')        list.sort((a, b) => a.text.localeCompare(b.text));
  if (sort === 'za')        list.sort((a, b) => b.text.localeCompare(a.text));
  if (sort === 'done-last') list.sort((a, b) => Number(a.done) - Number(b.done));

  return list;
}

function renderTodos() {
  const list = getFilteredSorted();
  todoList.innerHTML = '';

  if (list.length === 0) {
    todoEmpty.classList.add('visible');
    return;
  }
  todoEmpty.classList.remove('visible');

  list.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item${todo.done ? ' done' : ''}`;
    li.dataset.id = todo.id;

    li.innerHTML = `
      <input type="checkbox" class="todo-check" ${todo.done ? 'checked' : ''} aria-label="Tandai selesai" />
      <span class="todo-text" contenteditable="true" role="textbox" aria-label="Teks tugas">${escapeHtml(todo.text)}</span>
      <div class="todo-actions">
        <button class="btn-todo-action delete" title="Hapus">🗑</button>
      </div>
    `;

    const check = li.querySelector('.todo-check');
    const textEl = li.querySelector('.todo-text');
    const delBtn = li.querySelector('.delete');

    check.addEventListener('change', () => {
      const t = todos.find(t => t.id === todo.id);
      if (t) { t.done = check.checked; saveTodos(); renderTodos(); }
    });

    textEl.addEventListener('blur', () => {
      const newText = textEl.textContent.trim();
      if (!newText) { textEl.textContent = todo.text; return; }
      const t = todos.find(t => t.id === todo.id);
      if (t) { t.text = newText; saveTodos(); }
    });

    textEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); textEl.blur(); }
    });

    delBtn.addEventListener('click', () => {
      todos = todos.filter(t => t.id !== todo.id);
      saveTodos();
      renderTodos();
    });

    todoList.appendChild(li);
  });
}

function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;
  todos.push({ id: Date.now(), text, done: false });
  saveTodos();
  renderTodos();
  todoInput.value = '';
  todoInput.focus();
}

addTodoBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.filter;
    renderTodos();
  });
});

sortSelect.addEventListener('change', () => {
  sort = sortSelect.value;
  renderTodos();
});

// ── Quick Links ──────────────────────────────────────────────────
function saveLinks() { store.set('links', links); }

function getFavicon(url) {
  try {
    const domain = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch { return ''; }
}

function renderLinks() {
  linksGrid.innerHTML = '';

  if (links.length === 0) {
    linksEmpty.classList.add('visible');
    return;
  }
  linksEmpty.classList.remove('visible');

  links.forEach(link => {
    const item = document.createElement('div');
    item.className = 'link-item';

    const favicon = getFavicon(link.url);
    item.innerHTML = `
      ${favicon ? `<img class="link-favicon" src="${favicon}" alt="" onerror="this.style.display='none'" />` : '🔗'}
      <span>${escapeHtml(link.name)}</span>
      <button class="link-delete" title="Hapus tautan">✕</button>
    `;

    item.addEventListener('click', e => {
      if (e.target.classList.contains('link-delete')) return;
      window.open(link.url, '_blank', 'noopener');
    });

    item.querySelector('.link-delete').addEventListener('click', () => {
      links = links.filter(l => l.id !== link.id);
      saveLinks();
      renderLinks();
    });

    linksGrid.appendChild(item);
  });
}

function addLink() {
  const name = linkName.value.trim();
  const url  = linkUrl.value.trim();
  if (!name || !url) return;

  let fullUrl = url;
  if (!/^https?:\/\//i.test(url)) fullUrl = 'https://' + url;

  links.push({ id: Date.now(), name, url: fullUrl });
  saveLinks();
  renderLinks();
  linkName.value = '';
  linkUrl.value  = '';
  linkName.focus();
}

addLinkBtn.addEventListener('click', addLink);
linkUrl.addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });

// ── Utility ──────────────────────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ─────────────────────────────────────────────────────────
applyTheme(theme);
updateClock();
setInterval(updateClock, 1000);
renderTimer();
renderTodos();
renderLinks();
