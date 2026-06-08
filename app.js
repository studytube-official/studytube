// ===== State =====
let currentSubject = null;
let currentUnit = null;
let currentTopic = null;
let currentOrder = 'relevance';
let currentView = 'search'; // search | history | lists
let pendingAddVideo = null;
let pendingMemoVideoId = null;

// ===== Storage =====
const DEFAULT_API_KEY = 'AIzaSyDTKRzs6y3r9eRFuRRgKvv5UypD4AitNv8';
function getApiKey() { return localStorage.getItem('studytube_apikey') || DEFAULT_API_KEY; }

function loadHistory()   { return JSON.parse(localStorage.getItem('st_history') || '[]'); }
function saveHistory(d)  { localStorage.setItem('st_history', JSON.stringify(d)); }
function loadLists()     { return JSON.parse(localStorage.getItem('st_lists') || '[]'); }
function saveLists(d)    { localStorage.setItem('st_lists', JSON.stringify(d)); }
function loadNotes()     { return JSON.parse(localStorage.getItem('st_notes') || '{}'); }
function saveNotes(d)    { localStorage.setItem('st_notes', JSON.stringify(d)); }

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

// ===== Bubble Canvas (Apple Watch style) =====
let bubbleDrag = { active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, lastX: 0, lastY: 0 };
const BUBBLE_SIZE = 60;
const BUBBLE_POSITIONS = [];

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
  hide('unitView'); hide('videoView'); show('welcomeView');
}

function renderSubjectList() {
  const inner = document.getElementById('bubbleInner');
  if (!inner) return;

  // 1列縦並び（スクロールで全部見える）
  const padX = 18, padY = 18;
  const spacingY = BUBBLE_SIZE + 12;

  SUBJECTS.forEach((s, i) => {
    const x = padX + (i % 2) * (BUBBLE_SIZE + 10);
    const y = padY + Math.floor(i / 2) * spacingY;
    BUBBLE_POSITIONS[i] = { x, y };
  });

  inner.innerHTML = SUBJECTS.map((s, i) => {
    const { x, y } = BUBBLE_POSITIONS[i];
    const active = currentSubject?.id === s.id;
    return `<div class="subject-bubble${active ? ' active' : ''}"
      id="bubble-${s.id}"
      style="left:${x}px;top:${y}px;width:${BUBBLE_SIZE}px;height:${BUBBLE_SIZE}px;"
      data-subject="${s.id}">
      <span class="bubble-icon">${s.icon}</span>
      <span class="bubble-label">${s.name}</span>
    </div>`;
  }).join('');

  // クリックイベント
  inner.querySelectorAll('.subject-bubble').forEach(el => {
    el.addEventListener('click', () => {
      if (!bubbleDrag.moved) selectSubject(el.dataset.subject);
    });
  });

  setupBubbleCanvas();
}

function setupBubbleCanvas() {
  const canvas = document.getElementById('bubbleCanvas');
  const inner = document.getElementById('bubbleInner');
  if (!canvas || bubbleDrag.initialized) return;
  bubbleDrag.initialized = true;

  // ドラッグ
  canvas.addEventListener('mousedown', e => {
    bubbleDrag.active = true;
    bubbleDrag.moved = false;
    bubbleDrag.startX = e.clientX - bubbleDrag.offsetX;
    bubbleDrag.startY = e.clientY - bubbleDrag.offsetY;
  });

  window.addEventListener('mousemove', e => {
    if (bubbleDrag.active) {
      const dx = e.clientX - bubbleDrag.startX;
      const dy = e.clientY - bubbleDrag.startY;
      if (Math.abs(dx - bubbleDrag.offsetX) > 3 || Math.abs(dy - bubbleDrag.offsetY) > 3) bubbleDrag.moved = true;
      bubbleDrag.offsetX = dx;
      bubbleDrag.offsetY = dy;
      inner.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    // fisheye scale
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - bubbleDrag.offsetX;
    const my = e.clientY - rect.top - bubbleDrag.offsetY;
    inner.querySelectorAll('.subject-bubble').forEach((el, i) => {
      const bx = BUBBLE_POSITIONS[i].x + BUBBLE_SIZE / 2;
      const by = BUBBLE_POSITIONS[i].y + BUBBLE_SIZE / 2;
      const dist = Math.sqrt((mx - bx) ** 2 + (my - by) ** 2);
      const maxDist = 120;
      const scale = dist < maxDist ? 1 + (1 - dist / maxDist) * 0.45 : 1;
      el.style.transform = `scale(${scale})`;
      el.style.zIndex = dist < maxDist ? Math.round((1 - dist / maxDist) * 10) : 1;
    });
  });

  window.addEventListener('mouseup', () => { bubbleDrag.active = false; });

  // タッチ対応
  canvas.addEventListener('touchstart', e => {
    const t = e.touches[0];
    bubbleDrag.active = true;
    bubbleDrag.moved = false;
    bubbleDrag.startX = t.clientX - bubbleDrag.offsetX;
    bubbleDrag.startY = t.clientY - bubbleDrag.offsetY;
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    const t = e.touches[0];
    if (bubbleDrag.active) {
      const dx = t.clientX - bubbleDrag.startX;
      const dy = t.clientY - bubbleDrag.startY;
      if (Math.abs(dx - bubbleDrag.offsetX) > 3) bubbleDrag.moved = true;
      bubbleDrag.offsetX = dx;
      bubbleDrag.offsetY = dy;
      inner.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => { bubbleDrag.active = false; });
}

function selectSubject(subjectId) {
  currentSubject = SUBJECTS.find(s => s.id === subjectId);
  currentUnit = null; currentTopic = null;
  // バブルのアクティブ状態だけ更新（再描画しない）
  document.querySelectorAll('.subject-bubble').forEach(el => {
    el.classList.toggle('active', el.dataset.subject === subjectId);
  });
  showUnitView();
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
}

// ===== Video Card =====
function videoCard(v, context) {
  const notes = loadNotes();
  const hasNote = notes[v.id]?.text;
  return `
    <div class="video-card" id="card-${v.id}">
      <div class="video-thumb" onclick="playVideo('${v.id}', '${escAttr(v.title)}', '${escAttr(v.channel)}', '${v.thumb}', '${v.subjectId||''}', '${v.unitId||''}', this)">
        <img src="${v.thumb}" alt="${escHtml(v.title)}" loading="lazy">
        <div class="play-overlay">▶</div>
      </div>
      <div class="video-info">
        <div class="video-title">${escHtml(v.title)}</div>
        <div class="video-channel">${escHtml(v.channel)}</div>
        ${hasNote ? `<div class="video-note-preview">📝 ${escHtml(notes[v.id].text.slice(0,60))}${notes[v.id].text.length>60?'…':''}</div>` : ''}
        <div class="video-actions">
          <button class="btn-action btn-memo" onclick="openMemo('${v.id}','${escAttr(v.title)}','${v.thumb}')">📝 メモ</button>
          <button class="btn-action btn-list" onclick="openAddToList(${JSON.stringify(v).replace(/"/g,'&quot;')})">⭐ リスト</button>
        </div>
      </div>
    </div>`;
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
      <div class="video-grid">
        ${list.videos.length
          ? list.videos.map(v => videoCard(v, 'list')).join('')
          : '<p class="empty-msg" style="grid-column:1/-1">動画がありません</p>'}
      </div>
    </div>
  `).join('');
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
  const card = document.getElementById(`card-${pendingMemoVideoId}`);
  if (card) {
    const existing = card.querySelector('.video-note-preview');
    if (text) {
      const preview = `<div class="video-note-preview">📝 ${escHtml(text.slice(0,60))}${text.length>60?'…':''}</div>`;
      if (existing) existing.outerHTML = preview;
      else card.querySelector('.video-channel').insertAdjacentHTML('afterend', preview);
    } else if (existing) {
      existing.remove();
    }
  }
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

// ===== Utils =====
function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(s) { return String(s||'').replace(/`/g,'\\`').replace(/\$/g,'\\$').replace(/'/g,"\\'"); }

init();
