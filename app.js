// ===== State =====
let currentSubject = null;
let currentUnit = null;
let currentTopic = null;
let currentOrder = 'relevance';
let currentView = 'search'; // search | history | lists
let pendingAddVideo = null;
let pendingMemoVideoId = null;
let authUser = null;
let authReady = false;
let authApi = null;
let syncTimer = null;
let applyingCloudState = false;
let authBusy = false;

// ===== Storage =====
const DEFAULT_API_KEY = 'AIzaSyDTKRzs6y3r9eRFuRRgKvv5UypD4AitNv8';
function getApiKey() { return localStorage.getItem('studytube_apikey') || DEFAULT_API_KEY; }

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function writeJson(key, value, shouldSync = true) {
  localStorage.setItem(key, JSON.stringify(value));
  if (shouldSync) scheduleCloudSync();
}

function loadHistory()   { return readJson('st_history', []); }
function saveHistory(d)  { writeJson('st_history', d); }
function loadLists()     { return readJson('st_lists', []); }
function saveLists(d)    { writeJson('st_lists', d); }
function loadNotes()     { return readJson('st_notes', {}); }
function saveNotes(d)    { writeJson('st_notes', d); }

// ===== Init =====
function init() {
  renderSubjectList();
  renderMobileSubjectGrid();
  bindNav();
  document.getElementById('searchBtn').addEventListener('click', doSearch);
  document.getElementById('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  document.getElementById('orderSelect').addEventListener('change', e => { currentOrder = e.target.value; doSearch(); });
  document.getElementById('openApiModal').addEventListener('click', e => { e.preventDefault(); openApiModal(); });
  document.getElementById('saveApiKey').addEventListener('click', saveApiKeyFn);
  document.getElementById('closeModal').addEventListener('click', () => hide('apiModal'));
  document.getElementById('saveMemo').addEventListener('click', saveMemoFn);
  document.getElementById('closeMemo').addEventListener('click', () => hide('memoModal'));
  document.getElementById('saveNewList').addEventListener('click', saveNewList);
  document.getElementById('closeNewList').addEventListener('click', () => hide('newListModal'));
  document.getElementById('newListBtn').addEventListener('click', () => openNewListModal(null));
  document.getElementById('closeAddToList').addEventListener('click', () => hide('addToListModal'));
  document.getElementById('createNewListFromAdd').addEventListener('click', createNewListAndAdd);
  document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
  document.getElementById('historySubjectFilter').addEventListener('change', renderHistoryView);
  document.getElementById('authBtn').addEventListener('click', openAuthModal);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('closeAuthModal').addEventListener('click', () => hide('authModal'));
  document.getElementById('googleLoginBtn').addEventListener('click', loginWithGoogle);
  document.getElementById('emailLoginBtn').addEventListener('click', () => loginWithEmail(false));
  document.getElementById('emailSignupBtn').addEventListener('click', () => loginWithEmail(true));
  document.getElementById('passwordResetBtn').addEventListener('click', sendPasswordReset);
  initAuth();
}

// ===== Navigation =====
function bindNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      switchView(btn.dataset.view);
    });
  });
}

function switchView(view) {
  currentView = view;
  hide('searchView'); hide('historyView'); hide('listsView');
  const sidebar = document.getElementById('sidebar');
  if (view === 'search') {
    show('searchView');
    sidebar.style.display = '';
  } else if (view === 'history') {
    show('historyView');
    sidebar.style.display = 'none';
    renderHistoryView();
  } else if (view === 'lists') {
    show('listsView');
    sidebar.style.display = 'none';
    renderListsView();
  }
}

// ===== Apple Watch-style subject bubbles =====
const BUBBLE_SIZE = 76;
const MOBILE_SUBJECT_LAYOUT = [
  [-118, -250], [18, -282], [138, -224], [-34, -172],
  [104, -120], [-142, -92], [-8, -36], [132, 8],
  [-110, 62], [32, 112], [-146, 194], [112, 216], [-4, 274]
];

const bp = {
  t: 0,
  transitioning: false,
  dragging: false,
  draggedEl: null,
  startX: 0, startY: 0, startNodeX: 0, startNodeY: 0,
  moved: false,
  raf: null,
  loop: null,
  initialized: false
};

function subjectPositionKey() {
  return window.matchMedia('(max-width: 768px)').matches
    ? 'st_subject_positions_mobile'
    : 'st_subject_positions';
}

function loadSubjectPositions() {
  try { return JSON.parse(localStorage.getItem(subjectPositionKey()) || '{}'); }
  catch { return {}; }
}

function saveSubjectPositions() {
  const positions = {};
  document.querySelectorAll('.subject-bubble').forEach(el => {
    positions[el.dataset.subject] = {
      x: Number(el.dataset.x) || 0,
      y: Number(el.dataset.y) || 0
    };
  });
  localStorage.setItem(subjectPositionKey(), JSON.stringify(positions));
  scheduleCloudSync();
}

function applyCarousel() {
  if (bp.transitioning) return;
  const canvas = document.getElementById('bubbleCanvas');
  const inner = document.getElementById('bubbleInner');
  if (!canvas || !inner) return;

  const rect = canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const maxDist = Math.max(180, Math.hypot(centerX, centerY));

  inner.querySelectorAll('.subject-bubble').forEach((el, i) => {
    const isDragged = el === bp.draggedEl;
    const idle = (bp.dragging || isDragged) ? 0 : 1;
    const driftX = Math.sin(bp.t * 0.0013 + i * 1.7) * 4 * idle;
    const driftY = Math.cos(bp.t * 0.0011 + i * 1.3) * 4 * idle;
    const x = Number(el.dataset.x) + driftX;
    const y = Number(el.dataset.y) + driftY;
    const dist = Math.hypot(x, y);
    const focus = Math.max(0, 1 - dist / maxDist);
    const scale = 0.76 + focus * 0.42;
    const opacity = 0.58 + focus * 0.42;
    const rotate = Math.sin(bp.t * 0.0009 + i) * 2.5 * idle;
    const glow = 0.25 + focus * 0.75;

    el.style.opacity = opacity.toFixed(3);
    el.style.zIndex = String(Math.round(scale * 100));
    el.style.setProperty('--node-glow', glow.toFixed(3));
    el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`;
  });
}

function runBubbleLoop(ts = 0) {
  bp.t = ts;
  applyCarousel();
  bp.loop = requestAnimationFrame(runBubbleLoop);
}

function startBubbleLoop() {
  if (!bp.loop) bp.loop = requestAnimationFrame(runBubbleLoop);
}

function renderMobileSubjectGrid() {
  const grid = document.getElementById('mobileSubjectGrid');
  if (!grid) return;
  grid.innerHTML = SUBJECTS.map(s => `
    <div class="mobile-subject-card" onclick="selectSubject('${s.id}')">
      <div class="sub-icon">${s.icon}</div>
      <div class="sub-name">${s.name}</div>
    </div>
  `).join('');
}

function showMobileSubjects() {
  currentSubject = null; currentUnit = null; currentTopic = null;
  document.querySelectorAll('.subject-bubble').forEach(el => el.classList.remove('active'));
  document.body.classList.remove('subject-selected');
  hide('unitView'); hide('videoView'); show('welcomeView');
}

// ===== Depth scroll entrance =====
function applyDepthIn(selector) {
  const els = document.querySelectorAll(selector);
  els.forEach(el => {
    el.classList.remove('depth-in');
    void el.offsetWidth; // reflow
    el.classList.add('depth-in');
  });
  // IntersectionObserver for below-fold cards
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('depth-in');
        void entry.target.offsetWidth;
        entry.target.classList.add('depth-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
  els.forEach(el => observer.observe(el));
}

function renderSubjectList() {
  const inner = document.getElementById('bubbleInner');
  if (!inner) return;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const cols = 4;
  const gapX = 78;
  const gapY = 72;
  const rows = Math.ceil(SUBJECTS.length / cols);
  const startX = -(cols - 1) * gapX / 2;
  const startY = -(rows - 1) * gapY / 2;
  const savedPositions = loadSubjectPositions();

  inner.innerHTML = SUBJECTS.map((s, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const mobilePoint = MOBILE_SUBJECT_LAYOUT[i % MOBILE_SUBJECT_LAYOUT.length];
    const defaultX = isMobile ? mobilePoint[0] : startX + col * gapX + (row % 2 ? gapX / 2 : 0);
    const defaultY = isMobile ? mobilePoint[1] : startY + row * gapY;
    const saved = savedPositions[s.id];
    const x = Number.isFinite(saved?.x) ? saved.x : defaultX;
    const y = Number.isFinite(saved?.y) ? saved.y : defaultY;
    const active = currentSubject?.id === s.id;
    return `<div class="subject-bubble${active ? ' active' : ''}"
      id="bubble-${s.id}"
      style="width:${BUBBLE_SIZE}px;height:${BUBBLE_SIZE}px;"
      data-x="${x}"
      data-y="${y}"
      data-subject="${s.id}">
      <span class="bubble-icon">${s.icon}</span>
      <span class="bubble-label">${s.name}</span>
    </div>`;
  }).join('');

  inner.querySelectorAll('.subject-bubble').forEach(el => {
    el.addEventListener('mousedown', e => startNodeDrag(el, e.clientX, e.clientY));
    el.addEventListener('touchstart', e => {
      const t = e.touches[0];
      startNodeDrag(el, t.clientX, t.clientY);
    }, { passive: true });
    el.addEventListener('click', () => {
      if (!bp.moved) selectSubject(el.dataset.subject);
    });
  });

  applyCarousel();
  setupBubbleCanvas();
  startBubbleLoop();
}

function setupBubbleCanvas() {
  const canvas = document.getElementById('bubbleCanvas');
  if (!canvas || bp.initialized) return;
  bp.initialized = true;

  window.addEventListener('mousemove', e => dragNodeTo(e.clientX, e.clientY));
  window.addEventListener('mouseup', endNodeDrag);

  window.addEventListener('touchmove', e => {
    if (!bp.dragging) return;
    const t = e.touches[0];
    dragNodeTo(t.clientX, t.clientY);
  }, { passive: true });

  window.addEventListener('touchend', endNodeDrag);
  window.addEventListener('resize', applyCarousel);
}

function startNodeDrag(el, x, y) {
  if (bp.transitioning) return;
  bp.draggedEl = el;
  bp.dragging = true;
  bp.moved = false;
  bp.startX = x;
  bp.startY = y;
  bp.startNodeX = Number(el.dataset.x) || 0;
  bp.startNodeY = Number(el.dataset.y) || 0;
  el.classList.add('dragging');
}

function dragNodeTo(x, y) {
  if (!bp.dragging || !bp.draggedEl) return;
  const dx = x - bp.startX;
  const dy = y - bp.startY;
  if (Math.hypot(dx, dy) > 4) bp.moved = true;
  bp.draggedEl.dataset.x = String(bp.startNodeX + dx);
  bp.draggedEl.dataset.y = String(bp.startNodeY + dy);
  applyCarousel();
}

function endNodeDrag() {
  if (!bp.dragging) return;
  bp.draggedEl?.classList.remove('dragging');
  if (bp.moved) saveSubjectPositions();
  bp.dragging = false;
  window.setTimeout(() => { bp.moved = false; }, 0);
  bp.draggedEl = null;
}

function selectSubject(subjectId) {
  currentSubject = SUBJECTS.find(s => s.id === subjectId);
  currentUnit = null; currentTopic = null;
  bp.dragging = false;
  document.querySelectorAll('.subject-bubble').forEach(el => {
    el.classList.toggle('active', el.dataset.subject === subjectId);
  });
  collapseSubjectNodes(subjectId, () => {
    document.body.classList.add('subject-selected');
    showUnitView();
  });
}

function collapseSubjectNodes(subjectId, done) {
  const bubbles = document.querySelectorAll('.subject-bubble');
  bp.transitioning = true;

  bubbles.forEach((el, i) => {
    const active = el.dataset.subject === subjectId;
    const x = Number(el.dataset.x);
    const y = Number(el.dataset.y);
    el.style.transitionDelay = `${Math.min(i * 14, 150)}ms`;
    el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${active ? 1.16 : 0.82})`;
    el.style.opacity = active ? '1' : '0.72';
  });

  requestAnimationFrame(() => {
    bubbles.forEach(el => {
      const active = el.dataset.subject === subjectId;
      el.classList.add('node-converging');
      el.style.transform = `translate(-50%, -50%) translate(0px, 0px) scale(${active ? 1.32 : 0.18}) rotate(${active ? 0 : 24}deg)`;
      el.style.opacity = active ? '1' : '0';
    });
  });

  window.setTimeout(() => {
    bubbles.forEach(el => {
      el.classList.remove('node-converging');
      el.style.transitionDelay = '';
    });
    bp.transitioning = false;
    applyCarousel();
    done();
  }, 620);
}

// ===== Unit view =====
function showUnitView() {
  hide('welcomeView'); hide('videoView'); show('unitView');
  document.getElementById('breadcrumb').innerHTML = `
    <span onclick="selectSubject('${currentSubject.id}')">${currentSubject.icon} ${currentSubject.name}</span>
  `;
  document.getElementById('unitGrid').innerHTML = currentSubject.units.map(u => `
    <div class="unit-card" onclick="selectUnit('${u.id}')">
      <h3>${u.name}</h3>
      <p>${u.topics.length}単元</p>
    </div>
  `).join('');
  applyDepthIn('#unitGrid .unit-card');
}

function selectUnit(unitId) {
  currentUnit = currentSubject.units.find(u => u.id === unitId);
  currentTopic = null;
  showVideoView();
}

// ===== Video view =====
function showVideoView() {
  hide('welcomeView'); hide('unitView'); show('videoView');
  document.getElementById('videoBreadcrumb').innerHTML = `
    <span onclick="selectSubject('${currentSubject.id}')">${currentSubject.icon} ${currentSubject.name}</span>
    <span class="sep">›</span>
    <span class="current">${currentUnit.name}</span>
  `;
  const query = currentTopic
    ? `${currentSubject.name} ${currentUnit.name} ${currentTopic} 授業`
    : `${currentSubject.name} ${currentUnit.name} 授業 解説`;
  document.getElementById('searchInput').value = query;
  fetchVideos(query);
}

function selectTopic(topic) {
  currentTopic = topic;
  showVideoView();
}

function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (q) fetchVideos(q);
}

// ===== YouTube API =====
async function fetchVideos(query) {
  const apiKey = getApiKey();
  if (!apiKey) { show('apiKeyAlert'); document.getElementById('videoGrid').innerHTML = renderTopicChips(); return; }
  hide('apiKeyAlert');
  show('loadingSpinner');
  document.getElementById('videoGrid').innerHTML = renderTopicChips();
  currentOrder = document.getElementById('orderSelect')?.value || currentOrder;
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=12&relevanceLanguage=ja&order=${currentOrder}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      document.getElementById('videoGrid').innerHTML = renderTopicChips() + `<p class="error-msg">APIエラー: ${data.error.message}</p>`;
      return;
    }
    renderVideos(data.items || []);
  } catch(e) {
    document.getElementById('videoGrid').innerHTML = renderTopicChips() + `<p class="error-msg">通信エラーが発生しました</p>`;
  } finally {
    hide('loadingSpinner');
  }
}

function renderTopicChips() {
  if (!currentUnit) return '';
  return `<div class="topic-chips" style="grid-column:1/-1">
    <div class="topic-chip${!currentTopic ? ' active' : ''}" onclick="selectTopic(null)">すべて</div>
    ${currentUnit.topics.map(t => `<div class="topic-chip${currentTopic === t ? ' active' : ''}" onclick="selectTopic('${t}')">${t}</div>`).join('')}
  </div>`;
}

function renderVideos(items) {
  const grid = document.getElementById('videoGrid');
  if (!items.length) { grid.innerHTML = renderTopicChips() + '<p class="empty-msg">動画が見つかりませんでした</p>'; return; }
  grid.innerHTML = renderTopicChips() + items.map(item => {
    const v = {
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumb: item.snippet.thumbnails.medium.url,
      subjectId: currentSubject?.id,
      unitId: currentUnit?.id,
    };
    return videoCard(v, 'search');
  }).join('');
  applyDepthIn('#videoGrid .video-card');
}

// ===== Video Card =====
function videoCard(v, context) {
  const notes = loadNotes();
  const noteText = notes[v.id]?.text || '';
  const hasNote = Boolean(noteText);
  const isList = context === 'list';
  const listAttrs = isList ? ` data-list-id="${escHtml(v._listId || '')}" data-video-id="${escHtml(v.id)}"` : '';
  return `
    <div class="video-card${isList ? ' list-video-card' : ''}" id="card-${v.id}"${listAttrs}>
      ${isList ? '<button class="list-drag-handle" type="button" aria-label="順番を変える">DRAG</button>' : ''}
      <div class="video-thumb" onclick="playVideo('${v.id}', '${escAttr(v.title)}', '${escAttr(v.channel)}', '${v.thumb}', '${v.subjectId||''}', '${v.unitId||''}', this)">
        <img src="${v.thumb}" alt="${escHtml(v.title)}" loading="lazy">
        ${hasNote ? `<div class="thumb-note-preview">MEMO ${escHtml(trimNote(noteText, 34))}</div>` : ''}
        <div class="play-overlay">▶</div>
      </div>
      <div class="video-info">
        <div class="video-title">${escHtml(v.title)}</div>
        <div class="video-channel">${escHtml(v.channel)}</div>
        ${hasNote ? `<div class="video-note-preview">MEMO ${escHtml(trimNote(noteText, 60))}</div>` : ''}
        <div class="video-actions">
          <button class="btn-action btn-memo" onclick="openMemo('${v.id}','${escAttr(v.title)}','${v.thumb}')">📝 メモ</button>
          <button class="btn-action btn-list" onclick="openAddToList(${JSON.stringify(v).replace(/"/g,'&quot;')})">⭐ リスト</button>
        </div>
      </div>
    </div>`;
}

function trimNote(text, max) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function playVideo(id, title, channel, thumb, subjectId, unitId, thumbEl) {
  // 履歴に追加
  addToHistory({ id, title, channel, thumb, subjectId, unitId });
  // 再生
  const wrap = document.createElement('div');
  wrap.className = 'video-iframe-wrap';
  wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" allowfullscreen allow="autoplay"></iframe>`;
  thumbEl.replaceWith(wrap);
}

// ===== Watch History =====
function addToHistory(v) {
  let h = loadHistory();
  h = h.filter(x => x.id !== v.id); // 重複削除
  h.unshift({ ...v, watchedAt: Date.now() });
  if (h.length > 200) h = h.slice(0, 200);
  saveHistory(h);
}

function clearHistory() {
  if (!confirm('視聴履歴をすべて削除しますか？')) return;
  saveHistory([]);
  renderHistoryView();
}

function renderHistoryView() {
  const filter = document.getElementById('historySubjectFilter').value;
  let h = loadHistory();

  // フィルタ用教科リスト更新
  const sel = document.getElementById('historySubjectFilter');
  const cur = sel.value;
  const subjects = [...new Set(h.map(v => v.subjectId).filter(Boolean))];
  sel.innerHTML = `<option value="">すべての教科</option>` +
    subjects.map(sid => {
      const s = SUBJECTS.find(x => x.id === sid);
      return s ? `<option value="${sid}"${cur===sid?' selected':''}>${s.icon} ${s.name}</option>` : '';
    }).join('');

  if (filter) h = h.filter(v => v.subjectId === filter);

  const grid = document.getElementById('historyGrid');
  const empty = document.getElementById('emptyHistory');
  if (!h.length) { grid.innerHTML = ''; show('emptyHistory'); return; }
  hide('emptyHistory');

  // 日付でグルーピング
  const groups = {};
  h.forEach(v => {
    const d = new Date(v.watchedAt);
    const key = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  });

  grid.innerHTML = Object.entries(groups).map(([date, videos]) => `
    <div class="history-group" style="grid-column:1/-1">
      <div class="history-date">${date}</div>
    </div>
    ${videos.map(v => videoCard(v, 'history')).join('')}
  `).join('');
}

// ===== My Lists =====
function renderListsView() {
  const lists = loadLists();
  const container = document.getElementById('listsContainer');
  const empty = document.getElementById('emptyLists');
  if (!lists.length) { container.innerHTML = ''; show('emptyLists'); return; }
  hide('emptyLists');
  container.innerHTML = lists.map(list => `
    <div class="list-section">
      <div class="list-header">
        <h3>⭐ ${escHtml(list.name)}</h3>
        <div class="list-header-actions">
          <span class="list-count">${list.videos.length}本</span>
          <button class="btn-danger-sm" onclick="deleteList('${list.id}')">削除</button>
        </div>
      </div>
      <div class="video-grid list-video-grid" data-list-id="${escHtml(list.id)}">
        ${list.videos.length
          ? list.videos.map(v => videoCard({ ...v, _listId: list.id }, 'list')).join('')
          : '<p class="empty-msg" style="grid-column:1/-1">動画がありません</p>'}
      </div>
    </div>
  `).join('');
  setupListDragSort();
}

let listDragState = null;

function setupListDragSort() {
  document.querySelectorAll('.list-drag-handle').forEach(handle => {
    handle.addEventListener('pointerdown', startListDrag);
  });
  if (!setupListDragSort.bound) {
    window.addEventListener('pointermove', moveListDrag);
    window.addEventListener('pointerup', endListDrag);
    window.addEventListener('pointercancel', endListDrag);
    setupListDragSort.bound = true;
  }
}

function startListDrag(e) {
  const card = e.currentTarget.closest('.list-video-card');
  if (!card) return;
  listDragState = {
    card,
    listId: card.dataset.listId,
    moved: false,
    pointerId: e.pointerId
  };
  card.classList.add('dragging');
  e.currentTarget.setPointerCapture(e.pointerId);
  e.preventDefault();
}

function moveListDrag(e) {
  if (!listDragState || listDragState.pointerId !== e.pointerId) return;
  const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.list-video-card');
  if (!target || target === listDragState.card || target.dataset.listId !== listDragState.listId) return;

  listDragState.moved = true;
  const rect = target.getBoundingClientRect();
  const useVertical = window.innerWidth < 760 || rect.width > rect.height;
  const putAfter = useVertical
    ? e.clientY > rect.top + rect.height / 2
    : e.clientX > rect.left + rect.width / 2;
  target.parentElement.insertBefore(listDragState.card, putAfter ? target.nextSibling : target);
}

function endListDrag(e) {
  if (!listDragState || listDragState.pointerId !== e.pointerId) return;
  const { card, listId, moved } = listDragState;
  card.classList.remove('dragging');
  if (moved) {
    persistListOrder(listId);
    showToast('順番を保存しました');
  }
  listDragState = null;
}

function persistListOrder(listId) {
  const lists = loadLists();
  const list = lists.find(l => l.id === listId);
  if (!list) return;
  const cards = Array.from(document.querySelectorAll('.list-video-card'))
    .filter(card => card.dataset.listId === listId);
  const byId = new Map(list.videos.map(v => [v.id, v]));
  list.videos = cards.map(card => byId.get(card.dataset.videoId)).filter(Boolean);
  saveLists(lists);
}

function openNewListModal(callback) {
  document.getElementById('newListName').value = '';
  show('newListModal');
  document.getElementById('saveNewList')._callback = callback;
}

function saveNewList() {
  const name = document.getElementById('newListName').value.trim();
  if (!name) return;
  const lists = loadLists();
  const newList = { id: Date.now().toString(), name, videos: [] };
  lists.push(newList);
  saveLists(lists);
  hide('newListModal');
  const cb = document.getElementById('saveNewList')._callback;
  if (cb) cb(newList.id);
  else renderListsView();
}

function deleteList(listId) {
  if (!confirm('このリストを削除しますか？')) return;
  const lists = loadLists().filter(l => l.id !== listId);
  saveLists(lists);
  renderListsView();
}

function openAddToList(v) {
  pendingAddVideo = v;
  const lists = loadLists();
  const opts = document.getElementById('addToListOptions');
  opts.innerHTML = lists.map(l => {
    const already = l.videos.some(x => x.id === v.id);
    return `<div class="list-option">
      <span>${escHtml(l.name)} <small>(${l.videos.length}本)</small></span>
      ${already
        ? `<button class="btn-secondary" onclick="removeFromList('${l.id}','${v.id}')">✓ 追加済 → 削除</button>`
        : `<button class="btn-primary" onclick="addToList('${l.id}')">追加</button>`}
    </div>`;
  }).join('') || '<p style="color:#718096;font-size:0.9rem">リストがありません</p>';
  show('addToListModal');
}

function addToList(listId) {
  const lists = loadLists();
  const list = lists.find(l => l.id === listId);
  if (!list || !pendingAddVideo) return;
  if (!list.videos.some(v => v.id === pendingAddVideo.id)) {
    list.videos.push(pendingAddVideo);
    saveLists(lists);
  }
  hide('addToListModal');
  showToast(`「${list.name}」に追加しました`);
}

function removeFromList(listId, videoId) {
  const lists = loadLists();
  const list = lists.find(l => l.id === listId);
  if (!list) return;
  list.videos = list.videos.filter(v => v.id !== videoId);
  saveLists(lists);
  hide('addToListModal');
  if (currentView === 'lists') renderListsView();
}

function createNewListAndAdd() {
  hide('addToListModal');
  openNewListModal((newListId) => {
    addToList(newListId);
  });
}

// ===== Memo =====
function openMemo(videoId, title, thumb) {
  pendingMemoVideoId = videoId;
  const notes = loadNotes();
  document.getElementById('memoText').value = notes[videoId]?.text || '';
  document.getElementById('memoVideoInfo').innerHTML = `
    <img src="${thumb}" style="width:80px;border-radius:6px;margin-right:10px">
    <span style="font-size:0.85rem;color:#4a5568">${escHtml(title)}</span>
  `;
  show('memoModal');
}

function saveMemoFn() {
  const text = document.getElementById('memoText').value.trim();
  const notes = loadNotes();
  if (text) {
    notes[pendingMemoVideoId] = { text, updatedAt: Date.now() };
  } else {
    delete notes[pendingMemoVideoId];
  }
  saveNotes(notes);
  hide('memoModal');
  showToast('メモを保存しました');
  // カードのメモプレビュー更新
  document.querySelectorAll(`[id="card-${pendingMemoVideoId}"]`).forEach(card => {
    const existing = card.querySelector('.video-note-preview');
    const thumbExisting = card.querySelector('.thumb-note-preview');
    if (text) {
      const preview = `<div class="video-note-preview">MEMO ${escHtml(trimNote(text, 60))}</div>`;
      const thumbPreview = `<div class="thumb-note-preview">MEMO ${escHtml(trimNote(text, 34))}</div>`;
      if (existing) existing.outerHTML = preview;
      else card.querySelector('.video-channel').insertAdjacentHTML('afterend', preview);
      if (thumbExisting) thumbExisting.outerHTML = thumbPreview;
      else card.querySelector('.video-thumb').insertAdjacentHTML('beforeend', thumbPreview);
    } else {
      if (existing) existing.remove();
      if (thumbExisting) thumbExisting.remove();
    }
  });
}

// ===== API Key =====
function openApiModal() {
  document.getElementById('apiKeyInput').value = getApiKey();
  show('apiModal');
}
function saveApiKeyFn() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (key) {
    localStorage.setItem('studytube_apikey', key);
    hide('apiModal');
    if (currentUnit) showVideoView();
  } else {
    document.getElementById('apiKeyInput').style.borderColor = '#e53e3e';
  }
}

// ===== Toast =====
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
}

// ===== Auth / Cloud Sync =====
const FIREBASE_SDK_VERSION = '10.12.5';

async function initAuth() {
  updateAuthUi();
  const config = window.STUDYTUBE_FIREBASE_CONFIG;
  if (!config || !config.apiKey || !config.projectId) {
    setAuthStatus('Firebase設定を入れるとログインと同期が使えます。今はこのブラウザに保存されています。');
    return;
  }

  try {
    const [appMod, authMod, dbMod] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`)
    ]);
    const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(config);
    const auth = authMod.getAuth(app);
    authMod.useDeviceLanguage(auth);
    await authMod.setPersistence(auth, authMod.browserLocalPersistence);
    const db = dbMod.getFirestore(app);
    authApi = { auth, db, authMod, dbMod };
    authReady = true;

    try {
      await authMod.getRedirectResult(auth);
    } catch (err) {
      console.error(err);
      setAuthStatus(getAuthErrorMessage(err));
    }

    authMod.onAuthStateChanged(auth, async user => {
      authUser = user;
      updateAuthUi();
      if (user) {
        await loadCloudState();
        setAuthStatus(`${user.email || 'ログイン中'} として同期中です。`);
      } else {
        setAuthStatus('ログインすると、マイリスト・メモ・教科の配置をスマホとPCで同期できます。');
      }
    });
  } catch (err) {
    console.error(err);
    setAuthStatus('ログイン機能の読み込みに失敗しました。通信環境かFirebase設定を確認してください。');
  }
}

function openAuthModal() {
  show('authModal');
  if (authUser) setAuthStatus(`${authUser.email || 'ログイン中'} として同期中です。`);
  else if (!authReady) setAuthStatus('Firebase設定を入れるとログインと同期が使えます。今はこのブラウザに保存されています。');
  else setAuthStatus('ログインすると、マイリスト・メモ・教科の配置をスマホとPCで同期できます。');
}

function setAuthStatus(text) {
  const el = document.getElementById('authStatusText');
  if (el) el.textContent = text;
}

function updateAuthUi() {
  const authBtn = document.getElementById('authBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  if (!authBtn || !logoutBtn) return;
  authBtn.classList.toggle('is-disabled', authBusy);
  authBtn.classList.toggle('is-syncing', Boolean(authUser));
  if (authUser) {
    authBtn.textContent = authUser.displayName || authUser.email || '同期中';
    logoutBtn.classList.remove('hidden');
    document.body.classList.add('logged-in');
  } else {
    authBtn.textContent = 'ログイン';
    logoutBtn.classList.add('hidden');
    document.body.classList.remove('logged-in');
  }
}

function setAuthBusy(isBusy) {
  authBusy = isBusy;
  ['googleLoginBtn', 'emailLoginBtn', 'emailSignupBtn', 'passwordResetBtn', 'logoutBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = isBusy;
  });
  updateAuthUi();
}

function shouldUseRedirectLogin() {
  return window.matchMedia('(max-width: 768px)').matches || navigator.maxTouchPoints > 0;
}

function getAuthErrorMessage(err) {
  const code = err?.code || '';
  const host = location.hostname || 'localhost';
  const messages = {
    'auth/operation-not-allowed': 'Firebase Consoleでこのログイン方法を有効にしてください。',
    'auth/unauthorized-domain': `Firebase Authenticationの承認済みドメインに「${host}」を追加してください。`,
    'auth/popup-blocked': 'ポップアップがブロックされました。もう一度押すと別画面でログインします。',
    'auth/popup-closed-by-user': 'ログイン画面が閉じられました。もう一度試してください。',
    'auth/cancelled-popup-request': '別のログイン操作が進行中です。少し待ってからもう一度試してください。',
    'auth/invalid-email': 'メールアドレスの形式を確認してください。',
    'auth/user-not-found': 'このメールアドレスのアカウントはまだありません。新規登録してください。',
    'auth/wrong-password': 'パスワードを確認してください。',
    'auth/invalid-credential': 'メールアドレスかパスワードを確認してください。',
    'auth/email-already-in-use': 'このメールアドレスはすでに登録されています。ログインを試してください。',
    'auth/weak-password': 'パスワードは6文字以上にしてください。',
    'auth/network-request-failed': '通信に失敗しました。ネットワークを確認してください。'
  };
  return messages[code] || 'ログイン処理に失敗しました。Firebase設定と通信環境を確認してください。';
}

async function loginWithGoogle() {
  if (!authReady || !authApi) return setAuthStatus('Firebase設定がまだ入っていません。auth-config.js に設定を入れてください。');
  setAuthBusy(true);
  setAuthStatus('Googleログインを開いています...');
  try {
    const provider = new authApi.authMod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    if (shouldUseRedirectLogin()) {
      await authApi.authMod.signInWithRedirect(authApi.auth, provider);
      return;
    }
    try {
      await authApi.authMod.signInWithPopup(authApi.auth, provider);
    } catch (err) {
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
        setAuthStatus('ポップアップが使えないため、別画面でログインします...');
        await authApi.authMod.signInWithRedirect(authApi.auth, provider);
        return;
      }
      throw err;
    }
    hide('authModal');
    showToast('ログインしました');
  } catch (err) {
    console.error(err);
    setAuthStatus(getAuthErrorMessage(err));
  } finally {
    setAuthBusy(false);
  }
}

async function loginWithEmail(isSignup) {
  if (!authReady || !authApi) return setAuthStatus('Firebase設定がまだ入っていません。auth-config.js に設定を入れてください。');
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  if (!email || password.length < 6) return setAuthStatus('メールアドレスと6文字以上のパスワードを入力してください。');
  setAuthBusy(true);
  setAuthStatus(isSignup ? '新規登録しています...' : 'ログインしています...');
  try {
    if (isSignup) await authApi.authMod.createUserWithEmailAndPassword(authApi.auth, email, password);
    else await authApi.authMod.signInWithEmailAndPassword(authApi.auth, email, password);
    hide('authModal');
    showToast(isSignup ? '登録して同期を開始しました' : 'ログインしました');
  } catch (err) {
    console.error(err);
    setAuthStatus(getAuthErrorMessage(err));
  } finally {
    setAuthBusy(false);
  }
}

async function sendPasswordReset() {
  if (!authReady || !authApi) return setAuthStatus('Firebase設定がまだ入っていません。auth-config.js に設定を入れてください。');
  const email = document.getElementById('authEmail').value.trim();
  if (!email) return setAuthStatus('パスワード再設定用のメールアドレスを入力してください。');
  setAuthBusy(true);
  try {
    await authApi.authMod.sendPasswordResetEmail(authApi.auth, email);
    setAuthStatus('パスワード再設定メールを送信しました。メールを確認してください。');
  } catch (err) {
    console.error(err);
    setAuthStatus(getAuthErrorMessage(err));
  } finally {
    setAuthBusy(false);
  }
}

async function logout() {
  if (!authReady || !authApi) return;
  setAuthBusy(true);
  try {
    await authApi.authMod.signOut(authApi.auth);
    authUser = null;
    updateAuthUi();
    setAuthStatus('ログアウトしました。この端末にはデータが残っています。');
    showToast('ログアウトしました');
  } finally {
    setAuthBusy(false);
  }
}

function getLocalState() {
  return {
    history: loadHistory(),
    lists: loadLists(),
    notes: loadNotes(),
    subjectPositions: readJson('st_subject_positions', {}),
    mobileSubjectPositions: readJson('st_subject_positions_mobile', {}),
    updatedAt: Date.now()
  };
}

function applyCloudState(state) {
  if (!state) return;
  applyingCloudState = true;
  if (Array.isArray(state.history)) writeJson('st_history', state.history, false);
  if (Array.isArray(state.lists)) writeJson('st_lists', state.lists, false);
  if (state.notes && typeof state.notes === 'object') writeJson('st_notes', state.notes, false);
  if (state.subjectPositions) writeJson('st_subject_positions', state.subjectPositions, false);
  if (state.mobileSubjectPositions) writeJson('st_subject_positions_mobile', state.mobileSubjectPositions, false);
  applyingCloudState = false;
  renderSubjectList();
  if (currentView === 'history') renderHistoryView();
  if (currentView === 'lists') renderListsView();
}

function mergeUniqueVideos(cloudVideos = [], localVideos = []) {
  const seen = new Set();
  return [...cloudVideos, ...localVideos].filter(video => {
    if (!video || !video.id || seen.has(video.id)) return false;
    seen.add(video.id);
    return true;
  });
}

function mergeLists(cloudLists = [], localLists = []) {
  const byId = new Map();
  [...cloudLists, ...localLists].forEach(list => {
    if (!list || !list.id) return;
    const existing = byId.get(list.id);
    if (!existing) {
      byId.set(list.id, {
        ...list,
        videos: Array.isArray(list.videos) ? mergeUniqueVideos(list.videos, []) : []
      });
      return;
    }
    existing.name = list.name || existing.name;
    existing.videos = mergeUniqueVideos(existing.videos, Array.isArray(list.videos) ? list.videos : []);
  });
  return Array.from(byId.values());
}

function mergeHistory(cloudHistory = [], localHistory = []) {
  const byKey = new Map();
  [...cloudHistory, ...localHistory].forEach(item => {
    if (!item || !item.id) return;
    const key = `${item.id}:${item.watchedAt || ''}`;
    byKey.set(key, item);
  });
  return Array.from(byKey.values())
    .sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0))
    .slice(0, 200);
}

function mergeNotes(cloudNotes = {}, localNotes = {}) {
  const merged = { ...cloudNotes };
  Object.entries(localNotes || {}).forEach(([videoId, note]) => {
    const cloudNote = merged[videoId];
    if (!cloudNote || (note?.updatedAt || 0) >= (cloudNote?.updatedAt || 0)) merged[videoId] = note;
  });
  return merged;
}

function mergeStudyState(cloudState = {}, localState = {}) {
  return {
    history: mergeHistory(cloudState.history, localState.history),
    lists: mergeLists(cloudState.lists, localState.lists),
    notes: mergeNotes(cloudState.notes, localState.notes),
    subjectPositions: { ...(cloudState.subjectPositions || {}), ...(localState.subjectPositions || {}) },
    mobileSubjectPositions: { ...(cloudState.mobileSubjectPositions || {}), ...(localState.mobileSubjectPositions || {}) },
    updatedAt: Date.now()
  };
}

function userStateDoc() {
  if (!authApi || !authUser) return null;
  return authApi.dbMod.doc(authApi.db, 'users', authUser.uid, 'studyTube', 'state');
}

async function loadCloudState() {
  const docRef = userStateDoc();
  if (!docRef) return;
  try {
    const snap = await authApi.dbMod.getDoc(docRef);
    if (snap.exists()) {
      const merged = mergeStudyState(snap.data(), getLocalState());
      applyCloudState(merged);
      await saveCloudState(merged);
      showToast('クラウドとこの端末を同期しました');
    } else {
      await saveCloudState();
      showToast('この端末のデータをクラウドに保存しました');
    }
  } catch (err) {
    console.error(err);
    setAuthStatus('クラウド同期に失敗しました。Firestoreの設定を確認してください。');
  }
}

function scheduleCloudSync() {
  if (applyingCloudState || !authUser || !authApi) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(saveCloudState, 450);
}

async function saveCloudState(state = getLocalState()) {
  const docRef = userStateDoc();
  if (!docRef) return;
  updateAuthUi();
  try {
    await authApi.dbMod.setDoc(docRef, state, { merge: true });
    setAuthStatus(`${authUser.email || 'ログイン中'} として同期中です。`);
  } catch (err) {
    console.error(err);
    setAuthStatus('クラウド保存に失敗しました。Firestoreの権限設定を確認してください。');
  }
}

// ===== Utils =====
function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(s) { return String(s||'').replace(/`/g,'\\`').replace(/\$/g,'\\$').replace(/'/g,"\\'"); }

init();
