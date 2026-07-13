// app.js - Step 4: Piece form with static fields
import { secondsToDecimalMMSS } from '/taktwerk/takt.js';

const DB_NAME = 'TaktwerkDB';
const DB_VERSION = 2;

let db;
let currentSongId = null;
let longPressTimer = null;
let activeContextMenu = null;

const audioPlayer = new Audio();
audioPlayer.preload = 'auto';

const PLAY_ICON = `<svg viewBox="0 0 24 24" fill="none"><path opacity="0.1" d="M4 5.49683V18.5032C4 20.05 5.68077 21.0113 7.01404 20.227L18.0694 13.7239C19.384 12.9506 19.384 11.0494 18.0694 10.2761L7.01404 3.77296C5.68077 2.98869 4 3.95 4 5.49683Z" fill="currentColor"/><path d="M4 5.49683V18.5032C4 20.05 5.68077 21.0113 7.01404 20.227L18.0694 13.7239C19.384 12.9506 19.384 11.0494 18.0694 10.2761L7.01404 3.77296C5.68077 2.98869 4 3.95 4 5.49683Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PAUSE_ICON = `<svg viewBox="0 0 24 24" fill="none"><path opacity="0.1" d="M14 19L14 5C14 3.89543 14.8954 3 16 3L17 3C18.1046 3 19 3.89543 19 5L19 19C19 20.1046 18.1046 21 17 21L16 21C14.8954 21 14 20.1046 14 19Z" fill="currentColor"/><path opacity="0.1" d="M10 19L10 5C10 3.89543 9.10457 3 8 3L7 3C5.89543 3 5 3.89543 5 5L5 19C5 20.1046 5.89543 21 7 21L8 21C9.10457 21 10 20.1046 10 19Z" fill="currentColor"/><path d="M14 19L14 5C14 3.89543 14.8954 3 16 3L17 3C18.1046 3 19 3.89543 19 5L19 19C19 20.1046 18.1046 21 17 21L16 21C14.8954 21 14 20.1046 14 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 19L10 5C10 3.89543 9.10457 3 8 3L7 3C5.89543 3 5 3.89543 5 5L5 19C5 20.1046 5.89543 21 7 21L8 21C9.10457 21 10 20.1046 10 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Key signature data
const STANDARD_KEYS = [
  'C major', 'C minor', 'D♭ major', 'C♯ minor', 'D major', 'D minor',
  'E♭ major', 'E♭ minor', 'E major', 'E minor', 'F major', 'F minor',
  'G♭ major', 'F♯ minor', 'G major', 'G minor', 'A♭ major', 'G♯ minor',
  'A major', 'A minor', 'B♭ major', 'B♭ minor', 'B major', 'B minor'
];

const OBSCURE_KEYS = [
  'C♯ major', 'D♭ minor', 'F♯ major', 'G♭ minor',
  'C♭ major', 'B minor (enharmonic)', 'E♯ minor', 'F minor (enharmonic)',
  'B♯ major', 'C minor (enharmonic)', 'A♯ minor', 'B♭ minor (enharmonic)',
  'D♯ major', 'E♭ minor (enharmonic)', 'G♯ major', 'A♭ minor (enharmonic)',
  'D♯ minor', 'E♭ minor (enharmonic)', 'A♯ major', 'B♭ major (enharmonic)'
];

// DOM references
let playerBar, playerSongName, playerTimes, progressFill, progressContainer, playPauseBtn;
let renameOverlay, renameInput, renameSave, renameCancel;
let tabLibrary, tabAdd, viewLibrary, viewAdd;
let composerOverlay, compFirst, compLast, compCountry, compBirth, compDeath;
let catalogueList, addCatalogueBtn, composerCancel, composerSave;

// Composer selector refs
let composerTrigger, composerDropdown, composerSearchWrap, composerSearchInput;
let composerListEl, composerAddNewBtn;
let allComposers = [];
let selectedComposerId = null;

// Piece form refs
let pieceTitleInput, pieceSubtitleInput;
let keySigTrigger, keySigDropdown, keySigStandardList, keySigToggle, keySigObscureList;
let opusNumberInput, pieceNumberInput;
let catalogueField, catalogueSelect, catalogueNumberInput;
let catalogueAutoField, catalogueAutoName, catalogueAutoNumber;
let pieceSaveBtn, pieceStatusEl;
let selectedKeySignature = null;
let obscureKeysExpanded = false;

// --- IndexedDB ---
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('composers')) {
        const s = db.createObjectStore('composers', { keyPath: 'id', autoIncrement: true });
        s.createIndex('lastName', 'lastName', { unique: false });
        s.createIndex('firstName', 'firstName', { unique: false });
      }
      if (!db.objectStoreNames.contains('catalogues')) {
        const s = db.createObjectStore('catalogues', { keyPath: 'id', autoIncrement: true });
        s.createIndex('composerId', 'composerId', { unique: false });
      }
      if (!db.objectStoreNames.contains('pieces')) {
        const s = db.createObjectStore('pieces', { keyPath: 'id', autoIncrement: true });
        s.createIndex('composerId', 'composerId', { unique: false });
        s.createIndex('title', 'title', { unique: false });
      }
      if (!db.objectStoreNames.contains('movements')) {
        const s = db.createObjectStore('movements', { keyPath: 'id', autoIncrement: true });
        s.createIndex('pieceId', 'pieceId', { unique: false });
        s.createIndex('movementNumber', 'movementNumber', { unique: false });
      }
    };
    request.onsuccess = (event) => { db = event.target.result; resolve(db); };
    request.onerror = (event) => reject(event.target.error);
  });
}

// --- Composer CRUD ---
async function loadComposers() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['composers'], 'readonly');
    const req = tx.objectStore('composers').getAll();
    req.onsuccess = () => {
      const composers = req.result.sort((a, b) => {
        const lastCmp = a.lastName.localeCompare(b.lastName);
        return lastCmp !== 0 ? lastCmp : a.firstName.localeCompare(b.firstName);
      });
      resolve(composers);
    };
    req.onerror = () => reject(req.error);
  });
}

async function saveComposer(data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['composers'], 'readwrite');
    tx.objectStore('composers').add(data).onsuccess = (e) => resolve(e.target.result);
  });
}

async function saveCatalogue(data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['catalogues'], 'readwrite');
    tx.objectStore('catalogues').add(data).onsuccess = (e) => resolve(e.target.result);
  });
}

async function loadCataloguesForComposer(composerId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['catalogues'], 'readonly');
    const store = tx.objectStore('catalogues');
    const index = store.index('composerId');
    const req = index.getAll(composerId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- Piece CRUD ---
async function savePiece(data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['pieces'], 'readwrite');
    tx.objectStore('pieces').add(data).onsuccess = (e) => resolve(e.target.result);
  });
}

// --- Songs CRUD ---
async function saveSongBlob(file) {
  return new Promise((r) => {
    const tx = db.transaction(['songs'], 'readwrite');
    tx.objectStore('songs').add({ name: file.name, blob: file, duration: null, addedAt: Date.now() }).onsuccess = e => r(e.target.result);
  });
}

async function updateSongName(id, name) {
  return new Promise((r) => {
    const tx = db.transaction(['songs'], 'readwrite');
    const s = tx.objectStore('songs');
    s.get(id).onsuccess = e => { const song = e.target.result; if (song) { song.name = name; s.put(song).onsuccess = () => r(); } };
  });
}

async function deleteSong(id) {
  return new Promise(r => { db.transaction(['songs'], 'readwrite').objectStore('songs').delete(id).onsuccess = () => r(); });
}

async function extractAndUpdateDuration(id, file) {
  try {
    const t = new Audio(); t.src = URL.createObjectURL(file);
    const d = await new Promise((r, j) => { t.onloadedmetadata = () => { URL.revokeObjectURL(t.src); r(t.duration); }; t.onerror = () => { URL.revokeObjectURL(t.src); j(); }; });
    const tx = db.transaction(['songs'], 'readwrite'); const s = tx.objectStore('songs');
    s.get(id).onsuccess = e => { const song = e.target.result; if (song) { song.duration = d; s.put(song); } };
    renderLibrary(await loadSongs());
  } catch (e) {}
}

async function loadSongs() {
  return new Promise(r => { db.transaction(['songs'], 'readonly').objectStore('songs').getAll().onsuccess = e => r(e.target.result); });
}

// --- Tab Switching ---
function switchTab(tab) {
  if (tab === 'library') {
    tabLibrary.classList.add('active'); tabAdd.classList.remove('active');
    viewLibrary.classList.add('active'); viewAdd.classList.remove('active');
    loadSongs().then(renderLibrary);
  } else {
    tabAdd.classList.add('active'); tabLibrary.classList.remove('active');
    viewAdd.classList.add('active'); viewLibrary.classList.remove('active');
  }
}

// --- Player ---
function updatePlayerUI(el, rem, p) {
  playerTimes.textContent = `${secondsToDecimalMMSS(el)} / ${secondsToDecimalMMSS(el + rem)}`;
  progressFill.style.width = `${(p * 100).toFixed(2)}%`;
}

function updatePlayPauseIcon(p) {
  playPauseBtn.innerHTML = p ? PAUSE_ICON : PLAY_ICON;
  playPauseBtn.setAttribute('aria-label', p ? 'Pause' : 'Play');
}

async function playSong(id) {
  db.transaction(['songs'], 'readonly').objectStore('songs').get(id).onsuccess = e => {
    const s = e.target.result;
    if (s && s.blob) {
      if (audioPlayer.src) URL.revokeObjectURL(audioPlayer.src);
      audioPlayer.src = URL.createObjectURL(s.blob);
      audioPlayer.play().catch(console.error);
      currentSongId = id;
      playerSongName.textContent = s.name;
      playerBar.classList.add('active');
      updatePlayPauseIcon(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: s.name, artist: 'Taktwerk', album: 'Local Library' });
        navigator.mediaSession.setActionHandler('play', () => audioPlayer.play());
        navigator.mediaSession.setActionHandler('pause', () => audioPlayer.pause());
        navigator.mediaSession.setActionHandler('stop', () => {
          audioPlayer.pause(); audioPlayer.currentTime = 0;
          playerBar.classList.remove('active'); currentSongId = null;
          updatePlayPauseIcon(false); loadSongs().then(renderLibrary);
        });
      }
    }
  };
}

function togglePlayback(id) {
  currentSongId == id && !audioPlayer.paused ? audioPlayer.pause() : playSong(id);
}

// --- Context Menu ---
function dismissContextMenu() {
  if (activeContextMenu) { activeContextMenu.remove(); activeContextMenu = null; }
  document.querySelectorAll('.song-item.menu-open').forEach(e => e.classList.remove('menu-open'));
}

function showContextMenu(id, name, el) {
  dismissContextMenu();
  el.classList.add('menu-open');
  const m = document.createElement('div');
  m.className = 'context-menu';
  m.innerHTML = '<button data-action="rename">Rename</button><button data-action="delete" class="btn-danger">Delete</button>';
  el.parentNode.insertBefore(m, el.nextSibling);
  activeContextMenu = m;
  m.querySelector('[data-action="rename"]').onclick = async () => { dismissContextMenu(); showRenameModal(id, name); };
  m.querySelector('[data-action="delete"]').onclick = async () => {
    dismissContextMenu();
    if (currentSongId == id) { audioPlayer.pause(); playerBar.classList.remove('active'); currentSongId = null; updatePlayPauseIcon(false); }
    await deleteSong(id); renderLibrary(await loadSongs());
  };
}

document.addEventListener('click', e => {
  if (activeContextMenu && !activeContextMenu.contains(e.target) && !e.target.closest('.song-item')) dismissContextMenu();
});

// --- Rename ---
let renameTargetId = null;
function showRenameModal(id, name) {
  renameTargetId = id; renameInput.value = name;
  renameOverlay.classList.add('active');
  setTimeout(() => { renameInput.focus(); renameInput.select(); }, 100);
}
function hideRenameModal() { renameOverlay.classList.remove('active'); renameTargetId = null; }

// --- Composer Modal ---
function openComposerModal() {
  compFirst.value = ''; compLast.value = ''; compCountry.value = '';
  compBirth.value = ''; compDeath.value = '';
  catalogueList.innerHTML = '';
  composerOverlay.classList.add('active');
  setTimeout(() => compFirst.focus(), 100);
}

function closeComposerModal() { composerOverlay.classList.remove('active'); }

function addCatalogueInput() {
  const e = document.createElement('div');
  e.className = 'catalogue-entry';
  e.innerHTML = '<input type="text" placeholder="Catalogue name (e.g., Op., BWV)" autocomplete="off"><button type="button" class="catalogue-remove">✕</button>';
  e.querySelector('.catalogue-remove').onclick = () => e.remove();
  catalogueList.appendChild(e);
  e.querySelector('input').focus();
}

async function handleComposerSave() {
  const fn = compFirst.value.trim(), ln = compLast.value.trim(), co = compCountry.value.trim();
  const by = parseInt(compBirth.value, 10), dy = parseInt(compDeath.value, 10);
  if (!fn || !ln || !co || isNaN(by) || isNaN(dy)) {
    pieceStatusEl.textContent = 'Please fill in all required composer fields.';
    return;
  }
  try {
    const cid = await saveComposer({ firstName: fn, lastName: ln, country: co, birthYear: by, deathYear: dy });
    let cc = 0;
    for (const inp of catalogueList.querySelectorAll('.catalogue-entry input')) {
      const n = inp.value.trim();
      if (n) { await saveCatalogue({ composerId: cid, name: n }); cc++; }
    }
    closeComposerModal();
    pieceStatusEl.textContent = `Composer "${ln}, ${fn}" added${cc > 0 ? ` with ${cc} catalogue${cc > 1 ? 's' : ''}` : ''}!`;
    await refreshComposerSelector();
    // Auto-select newly created composer
    selectComposer(cid, `${ln}, ${fn}`);
  } catch (e) { console.error(e); pieceStatusEl.textContent = 'Error saving composer.'; }
}

// --- Composer Selector ---
async function refreshComposerSelector() {
  allComposers = await loadComposers();
  renderComposerList(allComposers);
  composerSearchWrap.style.display = allComposers.length > 10 ? 'block' : 'none';
}

function renderComposerList(composers) {
  composerListEl.innerHTML = '';
  if (composers.length === 0) {
    composerListEl.innerHTML = '<div class="composer-empty">No composers found</div>';
    return;
  }
  composers.forEach(c => {
    const opt = document.createElement('div');
    opt.className = 'composer-option';
    opt.textContent = `${c.lastName}, ${c.firstName}`;
    opt.addEventListener('click', () => selectComposer(c.id, `${c.lastName}, ${c.firstName}`));
    composerListEl.appendChild(opt);
  });
}

async function selectComposer(id, displayName) {
  selectedComposerId = id;
  composerTrigger.textContent = displayName;
  composerTrigger.classList.remove('placeholder');
  closeComposerDropdown();
  await updateCatalogueFieldForComposer(id);
}

function openComposerDropdown() {
  refreshComposerSelector();
  const rect = composerTrigger.getBoundingClientRect();
  composerDropdown.style.top = `${rect.bottom + 4}px`;
  composerDropdown.style.left = `${rect.left}px`;
  composerDropdown.style.width = `${rect.width}px`;
  composerDropdown.classList.add('active');
  if (allComposers.length > 10) {
    composerSearchInput.value = '';
    setTimeout(() => composerSearchInput.focus(), 50);
  }
}

function closeComposerDropdown() { composerDropdown.classList.remove('active'); }

function filterComposers(query) {
  const q = query.toLowerCase().trim();
  if (!q) { renderComposerList(allComposers); return; }
  const filtered = allComposers.filter(c =>
    c.lastName.toLowerCase().includes(q) ||
    c.firstName.toLowerCase().includes(q) ||
    `${c.lastName}, ${c.firstName}`.toLowerCase().includes(q)
  );
  renderComposerList(filtered);
}

// --- Key Signature Dropdown ---
function buildKeySignatureLists() {
  keySigStandardList.innerHTML = '';
  STANDARD_KEYS.forEach(key => {
    const opt = document.createElement('div');
    opt.className = 'key-sig-option';
    opt.textContent = key;
    opt.addEventListener('click', () => selectKeySignature(key));
    keySigStandardList.appendChild(opt);
  });

  keySigObscureList.innerHTML = '';
  OBSCURE_KEYS.forEach(key => {
    const opt = document.createElement('div');
    opt.className = 'key-sig-option';
    opt.textContent = key;
    opt.addEventListener('click', () => selectKeySignature(key));
    keySigObscureList.appendChild(opt);
  });
}

function selectKeySignature(key) {
  selectedKeySignature = key;
  keySigTrigger.textContent = key;
  keySigTrigger.classList.remove('placeholder');
  closeKeySigDropdown();
}

function openKeySigDropdown() {
  const rect = keySigTrigger.getBoundingClientRect();
  keySigDropdown.style.top = `${rect.bottom + 4}px`;
  keySigDropdown.style.left = `${rect.left}px`;
  keySigDropdown.style.width = `${Math.max(rect.width, 280)}px`;
  keySigDropdown.classList.add('active');
}

function closeKeySigDropdown() {
  keySigDropdown.classList.remove('active');
  obscureKeysExpanded = false;
  keySigObscureList.classList.remove('visible');
  keySigToggle.classList.remove('expanded');
}

function toggleObscureKeys() {
  obscureKeysExpanded = !obscureKeysExpanded;
  keySigObscureList.classList.toggle('visible', obscureKeysExpanded);
  keySigToggle.classList.toggle('expanded', obscureKeysExpanded);
}

// --- Catalogue Field Logic ---
async function updateCatalogueFieldForComposer(composerId) {
  // Hide both fields first
  catalogueField.style.display = 'none';
  catalogueAutoField.style.display = 'none';
  catalogueSelect.innerHTML = '<option value="">Select catalogue...</option>';
  catalogueNumberInput.value = '';
  catalogueAutoNumber.value = '';

  if (!composerId) return;

  const catalogues = await loadCataloguesForComposer(composerId);

  if (catalogues.length === 0) {
    // No catalogues: hide field entirely
    return;
  } else if (catalogues.length === 1) {
    // One catalogue: auto-select, show number input only
    catalogueAutoField.style.display = 'block';
    catalogueAutoName.value = catalogues[0].name;
    catalogueAutoName.dataset.catalogueId = catalogues[0].id;
  } else {
    // Multiple catalogues: show dropdown + number input
    catalogueField.style.display = 'block';
    catalogues.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      catalogueSelect.appendChild(opt);
    });
  }
}

// --- Piece Save ---
async function handlePieceSave() {
  const title = pieceTitleInput.value.trim();
  const subtitle = pieceSubtitleInput.value.trim();
  const opusNum = opusNumberInput.value.trim() ? parseInt(opusNumberInput.value, 10) : null;
  const pieceNum = pieceNumberInput.value.trim() ? parseInt(pieceNumberInput.value, 10) : null;

  // Validate required fields
  if (!title) { pieceStatusEl.textContent = 'Piece title is required.'; return; }
  if (!selectedComposerId) { pieceStatusEl.textContent = 'Composer is required.'; return; }

  // Determine catalogue reference
  let catalogueId = null;
  let catalogueNumber = null;

  if (catalogueAutoField.style.display === 'block') {
    // Single catalogue auto-selected
    catalogueId = parseInt(catalogueAutoName.dataset.catalogueId, 10);
    const numVal = catalogueAutoNumber.value.trim();
    catalogueNumber = numVal ? parseInt(numVal, 10) : null;
  } else if (catalogueField.style.display === 'block') {
    // Multiple catalogues: user selected one
    const selVal = catalogueSelect.value;
    if (selVal) {
      catalogueId = parseInt(selVal, 10);
      const numVal = catalogueNumberInput.value.trim();
      catalogueNumber = numVal ? parseInt(numVal, 10) : null;
    }
  }

  try {
    const pieceData = {
      title,
      subtitle: subtitle || null,
      composerId: selectedComposerId,
      keySignature: selectedKeySignature || null,
      opusNumber: opusNum,
      pieceNumber: pieceNum,
      catalogueId,
      catalogueNumber
    };

    await savePiece(pieceData);

    // Reset form
    pieceTitleInput.value = '';
    pieceSubtitleInput.value = '';
    opusNumberInput.value = '';
    pieceNumberInput.value = '';
    catalogueNumberInput.value = '';
    catalogueAutoNumber.value = '';
    selectedKeySignature = null;
    keySigTrigger.textContent = 'Select Key Signature';
    keySigTrigger.classList.add('placeholder');
    catalogueField.style.display = 'none';
    catalogueAutoField.style.display = 'none';

    // Keep composer selected for convenience
    pieceStatusEl.textContent = '1 Piece Added!';
  } catch (e) {
    console.error(e);
    pieceStatusEl.textContent = 'Error saving piece.';
  }
}

// --- Library ---
function renderLibrary(songs) {
  const el = document.getElementById('library-list');
  el.innerHTML = '';
  if (!songs.length) {
    el.innerHTML = '<li style="text-align:center;padding:20px;color:#6e6e73;">No songs imported yet.<br><br>Tap "Add Music" to get started.</li>';
    return;
  }
  songs.forEach(s => {
    const li = document.createElement('li');
    li.className = 'song-item';
    const d = s.duration !== null ? secondsToDecimalMMSS(s.duration) : 'Loading...';
    li.innerHTML = `<div class="song-info"><span class="song-name">${s.name}</span><span class="song-duration">${d}</span></div>`;
    li.addEventListener('touchstart', () => {
      li.classList.add('pressing');
      longPressTimer = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(15);
        li.classList.remove('pressing');
        showContextMenu(s.id, s.name, li);
      }, 400);
    });
    li.addEventListener('touchend', () => { clearTimeout(longPressTimer); li.classList.remove('pressing'); });
    li.addEventListener('touchcancel', () => { clearTimeout(longPressTimer); li.classList.remove('pressing'); });
    li.addEventListener('touchmove', () => { clearTimeout(longPressTimer); li.classList.remove('pressing'); });
    li.addEventListener('click', () => {
      if (activeContextMenu && li.classList.contains('menu-open')) { dismissContextMenu(); return; }
      togglePlayback(s.id);
    });
    el.appendChild(li);
  });
}

// --- Import (legacy) ---
async function handleImport(files) {
  const st = document.getElementById('status');
  if (!st) return;
  st.textContent = `Importing ${files.length} songs...`;
  try {
    const ids = [];
    for (let i = 0; i < files.length; i++) {
      const id = await saveSongBlob(files[i]);
      ids.push({ id, file: files[i] });
      st.textContent = `Saved ${i + 1}/${files.length}`;
    }
    st.textContent = 'Extracting metadata...';
    for (const { id, file } of ids) await extractAndUpdateDuration(id, file);
    st.textContent = `Import complete! ${files.length} song${files.length > 1 ? 's' : ''} added.`;
    setTimeout(() => switchTab('library'), 800);
  } catch (e) { console.error(e); st.textContent = 'Error importing songs.'; }
}

// --- Init ---
async function initApp() {
  await initDB();

  // Player refs
  playerBar = document.getElementById('player-bar');
  playerSongName = document.getElementById('player-song-name');
  playerTimes = document.getElementById('player-times');
  progressFill = document.getElementById('progress-fill');
  progressContainer = document.getElementById('progress-container');
  playPauseBtn = document.getElementById('play-pause-btn');

  // Rename refs
  renameOverlay = document.getElementById('rename-overlay');
  renameInput = document.getElementById('rename-input');
  renameSave = document.getElementById('rename-save');
  renameCancel = document.getElementById('rename-cancel');

  // Tab refs
  tabLibrary = document.getElementById('tab-library');
  tabAdd = document.getElementById('tab-add');
  viewLibrary = document.getElementById('view-library');
  viewAdd = document.getElementById('view-add');

  // Composer modal refs
  composerOverlay = document.getElementById('composer-overlay');
  compFirst = document.getElementById('comp-first');
  compLast = document.getElementById('comp-last');
  compCountry = document.getElementById('comp-country');
  compBirth = document.getElementById('comp-birth');
  compDeath = document.getElementById('comp-death');
  catalogueList = document.getElementById('catalogue-list');
  addCatalogueBtn = document.getElementById('add-catalogue-btn');
  composerCancel = document.getElementById('composer-cancel');
  composerSave = document.getElementById('composer-save');

  // Composer selector refs
  composerTrigger = document.getElementById('composer-trigger');
  composerDropdown = document.getElementById('composer-dropdown');
  composerSearchWrap = document.getElementById('composer-search-wrap');
  composerSearchInput = document.getElementById('composer-search-input');
  composerListEl = document.getElementById('composer-list');
  composerAddNewBtn = document.getElementById('composer-add-new');

  // Piece form refs
  pieceTitleInput = document.getElementById('piece-title');
  pieceSubtitleInput = document.getElementById('piece-subtitle');
  keySigTrigger = document.getElementById('key-sig-trigger');
  keySigDropdown = document.getElementById('key-sig-dropdown');
  keySigStandardList = document.getElementById('key-sig-standard-list');
  keySigToggle = document.getElementById('key-sig-toggle');
  keySigObscureList = document.getElementById('key-sig-obscure-list');
  opusNumberInput = document.getElementById('opus-number');
  pieceNumberInput = document.getElementById('piece-number');
  catalogueField = document.getElementById('catalogue-field');
  catalogueSelect = document.getElementById('catalogue-select');
  catalogueNumberInput = document.getElementById('catalogue-number');
  catalogueAutoField = document.getElementById('catalogue-auto-field');
  catalogueAutoName = document.getElementById('catalogue-auto-name');
  catalogueAutoNumber = document.getElementById('catalogue-auto-number');
  pieceSaveBtn = document.getElementById('piece-save-btn');
  pieceStatusEl = document.getElementById('piece-status');

  // Build key signature lists
  buildKeySignatureLists();

  // Tab switching
  tabLibrary.onclick = e => { e.stopPropagation(); switchTab('library'); };
  tabAdd.onclick = e => { e.stopPropagation(); switchTab('add'); };

  // Composer selector events
  composerTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    composerDropdown.classList.contains('active') ? closeComposerDropdown() : openComposerDropdown();
  });
  composerSearchInput.addEventListener('input', (e) => filterComposers(e.target.value));
  composerAddNewBtn.addEventListener('click', () => { closeComposerDropdown(); openComposerModal(); });

  // Key signature events
  keySigTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    keySigDropdown.classList.contains('active') ? closeKeySigDropdown() : openKeySigDropdown();
  });
  keySigToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleObscureKeys();
  });

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (composerDropdown.classList.contains('active') && !composerDropdown.contains(e.target) && e.target !== composerTrigger) {
      closeComposerDropdown();
    }
    if (keySigDropdown.classList.contains('active') && !keySigDropdown.contains(e.target) && e.target !== keySigTrigger) {
      closeKeySigDropdown();
    }
  });

  // Composer modal events
  composerCancel.onclick = closeComposerModal;
  composerOverlay.onclick = e => { if (e.target === composerOverlay) closeComposerModal(); };
  addCatalogueBtn.onclick = addCatalogueInput;
  composerSave.onclick = handleComposerSave;

  // Piece save
  pieceSaveBtn.addEventListener('click', handlePieceSave);

  // Rename modal events
  renameCancel.onclick = hideRenameModal;
  renameOverlay.onclick = e => { if (e.target === renameOverlay) hideRenameModal(); };
  renameSave.onclick = async () => {
    const n = renameInput.value.trim();
    if (n && renameTargetId !== null) {
      await updateSongName(renameTargetId, n);
      if (currentSongId == renameTargetId) {
        playerSongName.textContent = n;
        if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: n, artist: 'Taktwerk', album: 'Local Library' });
      }
      renderLibrary(await loadSongs());
    }
    hideRenameModal();
  };
  renameInput.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); renameSave.click(); } if (e.key === 'Escape') hideRenameModal(); };

  // Player controls
  progressContainer.onclick = e => {
    if (!audioPlayer.duration) return;
    const r = progressContainer.getBoundingClientRect();
    audioPlayer.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * audioPlayer.duration;
  };
  playPauseBtn.onclick = () => { if (currentSongId === null) return; audioPlayer.paused ? audioPlayer.play().catch(console.error) : audioPlayer.pause(); };
  audioPlayer.ontimeupdate = () => { if (!audioPlayer.duration) return; updatePlayerUI(audioPlayer.currentTime, audioPlayer.duration - audioPlayer.currentTime, audioPlayer.currentTime / audioPlayer.duration); };
  audioPlayer.onplay = () => { playerBar.classList.add('active'); updatePlayPauseIcon(true); };
  audioPlayer.onpause = () => updatePlayPauseIcon(false);
  audioPlayer.onended = () => { playerBar.classList.remove('active'); currentSongId = null; updatePlayPauseIcon(false); loadSongs().then(renderLibrary); };

  // Legacy import
  const ib = document.getElementById('importBtn'), ap = document.getElementById('audioPicker');
  if (ib && ap) { ib.onclick = () => ap.click(); ap.onchange = async e => { if (e.target.files.length > 0) { await handleImport(Array.from(e.target.files)); e.target.value = ''; } }; }

  document.onvisibilitychange = () => { if (!document.hidden && !audioPlayer.paused && currentSongId) audioPlayer.play().catch(() => {}); };

  updatePlayPauseIcon(false);
  renderLibrary(await loadSongs());
  console.log('[Taktwerk] Step 4: Piece form ready');
}

initApp();
