// app.js - Step 5: Dynamic movement sections (complete)
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

let playerBar, playerSongName, playerTimes, progressFill, progressContainer, playPauseBtn;
let renameOverlay, renameInput, renameSave, renameCancel;
let tabLibrary, tabAdd, viewLibrary, viewAdd;
let composerOverlay, compFirst, compLast, compCountry, compBirth, compDeath;
let catalogueList, addCatalogueBtn, composerCancel, composerSave;
let composerTrigger, composerDropdown, composerSearchWrap, composerSearchInput;
let composerListEl, composerAddNewBtn;
let pieceTitleInput, pieceSubtitleInput;
let keySigTrigger, keySigDropdown, keySigStandardList, keySigToggle, keySigObscureList;
let opusNumberInput, pieceNumberInput;
let catalogueField, catalogueSelect, catalogueNumberInput;
let catalogueAutoField, catalogueAutoName, catalogueAutoNumber;
let pieceSaveBtn, pieceStatusEl;
let movementsContainer;

let allComposers = [];
let selectedComposerId = null;
let selectedKeySignature = null;
let obscureKeysExpanded = false;
let movementCounter = 0;

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

async function loadComposers() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['composers'], 'readonly');
    const req = tx.objectStore('composers').getAll();
    req.onsuccess = () => {
      resolve(req.result.sort((a, b) => {
        const cmp = a.lastName.localeCompare(b.lastName);
        return cmp !== 0 ? cmp : a.firstName.localeCompare(b.firstName);
      }));
    };
    req.onerror = () => reject(req.error);
  });
}

async function saveComposer(data) {
  return new Promise((resolve) => {
    db.transaction(['composers'], 'readwrite').objectStore('composers').add(data).onsuccess = (e) => resolve(e.target.result);
  });
}

async function saveCatalogue(data) {
  return new Promise((resolve) => {
    db.transaction(['catalogues'], 'readwrite').objectStore('catalogues').add(data).onsuccess = (e) => resolve(e.target.result);
  });
}

async function loadCataloguesForComposer(composerId) {
  return new Promise((resolve) => {
    const tx = db.transaction(['catalogues'], 'readonly');
    tx.objectStore('catalogues').index('composerId').getAll(composerId).onsuccess = (e) => resolve(e.target.result);
  });
}

async function savePiece(data) {
  return new Promise((resolve) => {
    db.transaction(['pieces'], 'readwrite').objectStore('pieces').add(data).onsuccess = (e) => resolve(e.target.result);
  });
}

async function saveMovement(data) {
  return new Promise((resolve) => {
    db.transaction(['movements'], 'readwrite').objectStore('movements').add(data).onsuccess = (e) => resolve(e.target.result);
  });
}

async function saveSongBlob(file) {
  return new Promise((r) => {
    db.transaction(['songs'], 'readwrite').objectStore('songs')
      .add({ name: file.name, blob: file, duration: null, addedAt: Date.now() })
      .onsuccess = e => r(e.target.result);
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

let renameTargetId = null;
function showRenameModal(id, name) {
  renameTargetId = id; renameInput.value = name;
  renameOverlay.classList.add('active');
  setTimeout(() => { renameInput.focus(); renameInput.select(); }, 100);
}
function hideRenameModal() { renameOverlay.classList.remove('active'); renameTargetId = null; }

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
  e.innerHTML = '<inputThe `app.js` I just provided was **truncated** — it cut off mid-function during the composer modal section. This means critical initialization code (including tab switching event listeners) never type="text" placeholder="Catalogue name (e.g., Op., BWV)" autocomplete="off"><button type="button" class="catalogue-remove">✕</button>';
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
    pieceStatusEl.textContent = `Composer "${ln}, ${fn}" added${cc > 0 ? ` with ${cc} catalogue${cc > 1 ? 's' executed, breaking the Add Music button.

Here is the **complete, verified `app.js`** with every function intact through Step 5. Copy this entire file and replace your existing one:

```javascript
// app.js - Step 5: Dynamic movement sections (complete)
import { secondsToDecimalMMSS } from '/taktwerk/takt : ''}` : ''}!`;
    await refresh.js';

const DB_NAME = 'TaktwerkDB';
const DB_VERSION = 2;

let db;
let currentSongId = null;
let longPressTimer = null;
let activeContextMenu = null;

const audioPlayer = new Audio();
audioPlayer.preload = 'auto';

const PLAY_ICON = `<svg viewBox="0 0 24 24"ComposerSelector();
    selectComposer(cid, `<LaTex>id_1</LaTex>{fn}`);
  } catch fill="none"> (e) {<path opacity="0.1" d="M4 5.49683V18.5032C4 20.05  console.error(e); pieceStatusEl.textContent = 'Error saving composer.'; }
}

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
    opt.textContent = `<LaTex>id_2</LaTex>{c.firstName}`;
    opt.addEventListener('click', () => selectComposer(c.id, `<LaTex>id_3</LaTex>{c.firstName}`));
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
  composerDropdown.style.top = `<LaTex>id_4</LaTex>{rect.left}px`;
  composerDropdown.style.width = `<LaTex>id_5</LaTex>{c.lastName}, <LaTex>id_6</LaTex>{rect.bottom + 4}px`;
  keySigDropdown.style.left = `<LaTex>id_7</LaTex>{Math.max(rect.width, 280)}px`;
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

async function updateCatalogueFieldForComposer(composerId) {
  catalogueField.style.display = 'none';
  catalogueAutoField.style.display = 'none';
  catalogueSelect.innerHTML = '<option value="">Select catalogue...</option>';
  catalogueNumberInput.value = '';
  catalogueAutoNumber.value = '';
  if (!composerId) return;
  const catalogues = await loadCataloguesForComposer(composerId);
  if (5.68077 21.0113 7.01404 20.227L18.0694 13.7239C19.384 12.9506 19.384 11.0494 18.0694 10.2761L7.01404 3.77296C5.68077 2.98869 4 3.95 4 5.49683Z" fill="currentColor"/><path d="M4 5.49683V18.5032C4 20.05 5.68077 21.0113 7.01404 20.227L18.0694 13.7239C19.384 12.9506 19.384 11.0494 18.0694 10.2761L7.01404 3.77296C5.68077 2.98869 4 3.95 4 5.49683Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PAUSE_ICON = `<svg viewBox="0 0 24 24" fill="none"><path opacity="0.1" d="M14 19Lcatalogues.length ===14 5C14 3.89543 14.8954 3 16 3L17 3C18.1046 3 19 3.89543 19 5L19 19C19 20.1046 18.1046 21 17 21L16 21C14.8954 21 14 20.1046 14 19Z" fill="currentColor"/><path opacity="0.1" d="M10 19L10 5C10 3.895 0) return;
  if (catalogues.length === 1) {
    catalogueAutoField.style.display = 'block';43 9.10457 3 8 3L7 3C5.89543 3 5 3.89543 5 5L5 19C5 20.1046 5.89543 21 7 21L8 21C9.10457 21 10 20.1046 10 19Z" fill="currentColor"/><path d="M14 19L14 5C14 3.89543 14.8954 3 16 3L17 3C18.1046 3 19 3.89543 19 5L19 19C19 20.1046 18.1046 21 17 21L16 21C14.8954 21 14 20.1046 14 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 19L10 5C10 3.89543 9.10457 3 8 3L7 3C5.89543 3 5 3.89543 5 5L5 19C5 20.1046 5.89543 21 7 21L8 21C9.10457 21 10 20.1046 10 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const STANDARD_KEYS = [
  'C major', 'C minor', 'D♭ major', 'C♯ minor', 'D major', 'D minor',
  'E♭ major', 'E♭ minor', 'E major', 'E minor', 'F major', 'F minor',
  'G♭ major', 'F♯ minor', 'G major', 'G minor', 'A♭ major', 'G♯ minor',
  'A major', '
    catalogueAutoA minor', 'Name.value = catalogB♭ majorues[0].', 'Bname;
   ♭ minor', ' catalogueAutoName.datasetB major', '.catalogueId =B minor'
 catalogues[0];

const OB].id;
  } else {
    catalogueFieldSCURE_KEYS = [
  'C♯ major.style.display = '', 'Dblock';
    catalogues.forEach(cat♭ minor', 'F♯ major => {
     ', 'G const opt = document♭ minor',
.createElement('option');
      opt.value  'C♭ major', ' = cat.id; opt.textContent = catB minor (enharmonic)', 'E♯ minor.name;
      catalogueSelect.appendChild(opt', 'F minor (enharmonic);
    });
  }
}

function getMovementCount() {
  return movementsContainer.querySelectorAll('.movement-outline').length;
}

function renumberMovements() {
  const outlines = movementsContainer.querySelectorAll('.movement-outline');
  outlines.forEach((outline, i) => {
    outline.dataset.movementIndex = i;
    outline.querySelector('.movement-title-label').textContent = `Movement No. ${i + 1}`;
  });
  updateDeleteButtonStates();
}

function updateDeleteButtonStates() {
  const count = getMovementCount();
  movementsContainer.querySelectorAll('.movement-delete-btn').forEach(btn => {
    count <= 4 ? btn.classList.add('locked') : btn.classList.remove('locked');
  });
}

function attachExpansionListener(outline) {
  const inputs = outline.querySelectorAll('input, select, button.movement-file-picker');
  const handler = () => {
    const outlines = movementsContainer.querySelectorAll('.movement-outline');
    const)',
  ' lastOutline = outlinesB♯ major', 'C minor (enharmonic)', 'A♯ minor', 'B♭ minor (enharmonic)',
  'D♯ major', 'E♭ minor (enharmonic)', 'G♯ major', 'A♭ minor (enharmonic)',
  'D♯ minor', 'E♭ minor (enharmonic)', 'A♯ major', 'B♭ major[outlines.length - (enharmonic)'
];

let playerBar, playerSongName, playerTimes, progressFill, progressContainer 1];
, playPauseBtn;
let renameOverlay, renameInput, renameSave,    if (outline === lastOutline) renameCancel;
let tabLibrary, tabAdd, viewLibrary, viewAdd;
let composerOverlay, compFirst, compLast, compCountry, compBirth, compDeath;
let catalogueList, addCatalogueBtn, composer addMovementOutline();Cancel, composerSave;
let composerTrigger, composerDropdown, composerSearchWrap, composerSearchInput;
let composerListEl, composer
    inputs.forEach(inp => inp.removeEventListener('input', handler));
    inputs.forEach(inp => inp.removeEventListener('change', handler));
    inputs.forEach(inp => inp.removeEventListener('click', handler));
  };
  inputs.forEach(inp => {
    inp.addEventListener('input', handler);
    inp.addEventListener('change', handler);
    if (inp.classList.contains('movement-file-picker')) inp.addEventListener('click', handler);
  });
}

function createMovementKeySigDropdown() {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'movement-key-sig-trigger placeholder';
  trigger.textContent = 'Select Key Signature';

  const dropdown = document.createElement('div');
  dropdown.className = 'key-sig-dropdown';

  const standardList = document.createElement('div');
  STANDARD_KEYS.forEach(key => {
    const opt = document.createElement('div');
    opt.className = 'key-sig-option';
    opt.textContent = key;
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      trigger.textContent = key;
      trigger.classList.remove('placeholder');
      trigger.dataset.value = key;
      dropdown.classList.remove('active');
    });
    standardList.appendChild(opt);
  });

  const toggle = document.createElement('div');
  toggle.className = 'key-sig-toggle';
  toggle.innerHTML = '<span class="arrow">▸</span> Obscure or Theoretical Keys';

  const obscureList = document.createElement('div');
  obscureList.className = 'key-sig-obscure';
  OBSCURE_KEYS.forEach(key => {
    const opt = document.createElement('div');
    opt.className = 'key-sig-option';
    opt.textContent = key;
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      trigger.textContent = key;
      trigger.classList.remove('placeholder');
      trigger.dataset.value = key;
      dropdown.classList.remove('active');
    });
    obscureList.appendChild(opt);
  });

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle.classList.toggle('expanded');
    obscureList.classList.toggle('visible');
  });

  dropdown.appendChild(standardList);
  dropdown.appendChild(toggle);
  dropdown.appendChild(obscureList);

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.movement-outline .key-sig-dropdown.active').forEach(d => {
      if (d !== dropdown) d.classList.removeAddNewBtn;
let pieceTitleInput, pieceSubtitleInput;
let keySigTrigger, keySigDropdown, keySigStandardList, keySigToggle, keySigObscureList;
let opusNumberInput, pieceNumberInput;
let catalogueField, catalogueSelect, catalogueNumberInput;
let catalogueAutoField, catalogueAutoName, catalogueAutoNumber('active');
    });
    const rect = trigger;
let pieceSaveBtn, pieceStatusEl;
let movementsContainer;

let allComposers = [];
let selectedComposerId = null;
let selectedKeySignature = null;
let obscureKeysExpanded = false;
let movementCounter = 0;

async function initDB() {
  return new Promise((resolve, reject) => {
    const.getBoundingClientRect();
    request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames dropdown.style.top =.contains('composers')) {
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

async function loadComposers() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['composers'], 'readonly');
    const req = tx.objectStore('composers').getAll();
    req.onsuccess = () => {
      resolve `${rect.bottom + 4}px`;(req.result.sort((a, b)
    dropdown.style => {
       .left = `${rect const cmp = a.left}px`;
.lastName.localeCompare(b    dropdown.style.width.lastName);
        = `${Math.max return cmp !== 0 ? cmp : a.firstName.localeCompare(rect.width, 260)}(b.firstName);
      }));
px`;
    dropdown.classList.toggle('    };
   active');
  });

  wrapper req.onerror = ().appendChild(trigger);
 => reject(req.error  wrapper.appendChild(d);
  });
}

asyncropdown);
  function saveComposer(data return wrapper;
}

function add) {
 MovementOutline() { return new Promise((
  movementCounter++;
  constresolve) => {
    db.transaction(['compos count = getMovementCount() + ers'], 'read1;
 write').objectStore const outline = document('composers.createElement('div');
  outline.className = 'movement-outline';
  outline.dataset.movementIndex = count - 1;

  const header = document').add(data).onsuccess = (e) => resolve(e.target.result);
  });
}

async function saveCatalogue(data) {
 .createElement('div'); return new Promise((resolve) => {
    db.transaction(['catalogues'], 'readwrite').objectStore('catalogues').add(data
  header.className = 'movement-header';

  const titleLabel = document.createElement('span');
  titleLabel.className = 'movement-title-label';
  titleLabel.textContent = `Movement No. ${count}`;

  const actions = document.createElement('div');
  actions.className = 'movement-actions';

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'movement-reset-btn';
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', () => {).onsuccess =
    outline.querySelectorAll('input[type=" (e) => resolve(e.target.result);
  });
}

async function loadCataloguesForComposer(composerId) {
  return new Promise((resolve) => {
    const tx = db.transaction(['catalogues'], 'readonly');
    tx.objectStore('catalogues').index('composerId').getAll(composerId).onsuccess = (e) => resolve(e.target.result);
  });
}

async functiontext"], input[type savePiece(data)="number"]').forEach {
  return(inp => inp.value new Promise((resolve) => {
 = '');
    const ksTrigger =    db.transaction([' outline.querySelector('.movement-key-sig-triggerpieces'], 'read');
    if (ksTrigger) { ksTrigger.textContent = 'Select Keywrite').objectStore('pieces').add(data).onsuccess = (e) => resolve(e.target.result);
  Signature'; ksTrigger });
}

async function saveMovement.classList.add('placeholder'); delete ksTrigger(data) {
.dataset.value; }
    const file  return new PromiseInput = outline.querySelector((resolve) =>('input[type=" {
    dbfile"]');
    if (file.transaction(['movements'], 'readwrite').objectStore('Input) fileInputmovements').add.value = '';
    const fileName =(data).onsuccess outline.querySelector('.movement = (e) => resolve(e.target-file-name');
    if (fileName.result);
 ) fileName.textContent = });
}

 '';
  });async function saveSong

  const deleteBlob(file) {Btn = document.createElement
  return new Promise((r)('button');
 => {
     deleteBtn.type = 'button'; db.transaction(['songs
  deleteBtn'], 'readwrite.className = 'movement').objectStore('-delete-btn locked';
  deleteBtnsongs')
     .textContent = ' .add({ name: file.name, blob: file,✕';
  deleteBtn.addEventListener(' duration: null,click', () => addedAt: Date.now() })
      .onsuccess = e => r(e.target.result);
  }); {
    if (getMovementCount() <= 4) return;
    outline.remove();
    renumber
}

asyncMovements();
  });

  function updateSongName actions.appendChild(resetBtn);
  actions.appendChild(deleteBtn(id, name) {
  return);
  header new Promise((r) => {
    const tx =.appendChild(titleLabel); db.transaction(['songs
  header.appendChild'], 'readwrite(actions);
 ');
    const outline.appendChild(header); s = tx.object

  const titleLabelStore('songs');El = document.createElement
    s.get(id).onsuccess('label');
 = e => {  titleLabelEl.className = 'movement-field const song = e-label';
 .target.result; if titleLabelEl.textContent = (song) { 'Movement Title'; song.name = name; s.put(song
  const titleInput = document.createElement('input');
).onsuccess = () => r();  titleInput.type } };
  = 'text';
  titleInput.className = 'movement-input';
  });
}

async function deleteSong(id) {
  return new Promise titleInput.placeholder =(r => { db 'Optional';
  titleInput.aut.transaction(['songs'], 'readwrite').ocomplete = 'offobjectStore('songs').delete(id).onsuccess = ()';
  title => r(); });Input.dataset.field = 'title';

}

async  outline.appendChild(titleLabelEl);
  outline.appendChild(title function extractAndUpdateDurationInput);

 (id, file) {
  try const descLabel = {
    const document.createElement('label t = new Audio');
  descLabel.className = 'movement-field-label';(); t.src = URL.createObjectURL(file);
    const
  descLabel.textContent = 'Program d = await newmatic Description';
 Promise((r, j) => {  const descInput t.onloadedmetadata = document.createElement(' = () => {input');
  descInput.type = URL.revokeObjectURL(t.src); 'text';
 r(t.duration);  descInput.className }; t.onerror = = 'movement-input';
  desc () => { URL.revokeObjectURLInput.placeholder = '(t.src); jOptional';
 (); }; });
 descInput.autocomplete    const tx = = 'off'; db.transaction(['songs
  descInput'], 'readwrite.dataset.field = 'description';
 '); const s = tx.objectStore(' outline.appendChild(descLabelsongs');
    s.get(id).onsuccess = e => { const song = e.target.result; if (song);
  outline.appendChild(descInput);

  const ksLabel = document.createElement('label');
  ksLabel.className) { song.duration = 'movement-field = d; s-label';
 .put(song); } ksLabel.textContent = };
    render 'Key Signature';Library(await loadSongs
  outline.appendChild());
  }(ksLabel);
  outline.appendChild catch (e) {}
}

(createMovementKeySigasync function loadSongsDropdown());

 () {
  const fileLabel = return new Promise(r document.createElement('label => { db.transaction');
  file(['songs'], 'Label.className = 'readonly').objectStoremovement-field-label';('songs').getAll
  fileLabel().onsuccess =.textContent = 'Audio e => r(e File *';
.target.result); });  const filePicker
}

function switchTab(tab) = document.createElement(' {
  ifinput');
  filePicker.type = 'file';
 (tab === 'library') {
    tabLibrary.classList  filePicker.accept.add('active'); = '.mp3,.aac,.wav tabAdd.classList.remove,.aiff,.('active');
    viewLibrary.classListflac,.alac,audio/m.add('active'); viewAdd.classList.removepeg,audio/mp3,audio/aac,audio/w('active');
    loadSongs().av,audio/flthen(renderLibrary);ac,audio/a
  } elseiff,audio/al {
    tabac';
 Add.classList.add(' filePicker.className =active'); tabLibrary 'movement-file-picker.classList.remove('active');
    view';
  filePicker.dataset.field =Add.classList.add(' 'audioFile';
  const fileNameDisplay = document.createElement('div');
  fileNameDisplay.className = 'movement-file-name';
  filePicker.addEventListener('change', () => {
    fileNameactive'); viewLibrary.classList.remove('active');
  }
}

function updatePlayerUI(el, rem, p) {
  playerTimes.textContent = `${secondsToDecimalMMSS(el)}Display.textContent = file / ${secondsToPicker.files.length >DecimalMMSS(el + rem)}` 0 ? file;
  progressPicker.files[0].name : '';Fill.style.width =
  });
 `${(p *  outline.appendChild(file 100).toFixed(2Label);
 )}%`;
 outline.appendChild(filePicker}

function update);
  outline.appendChild(fileNameDisplay);PlayPauseIcon(p

  movementsContainer.appendChild(outline);
  attachExpansion) {
  playPauseBtn.innerHTML = p ? PAUSE_ICON : PLAYListener(outline);
  updateDelete_ICON;
 ButtonStates();
 playPauseBtn.setAttribute}

function initialize('aria-label', p ? 'Pause' : 'Play');
}

async function playSong(id) {
  db.transaction(['songs'], 'readonly').objectStore('songs').get(id).onsuccess =Movements() {
  movementsContainer.innerHTML = '';
  movementCounter = 0;
  for (let i = 0; i < 4; i++) addMovementOutline(); e => {

}

async function handlePieceSave    const s =() {
  const title = pieceTitleInput.value.trim();
  const subtitle = pieceSubtitle e.target.result;
    if (s && s.blob) {
      if (audioPlayer.src) URL.reInput.value.trim();
  const opvokeObjectURL(audiousNum = opPlayer.src);
usNumberInput.value      audioPlayer.src.trim() ? parseInt = URL.createObjectURL(opusNumberInput(s.blob);
.value, 1      audioPlayer.play().catch(console.error0) : null;
  const);
      current pieceNum = pieceSongId = idNumberInput.value.trim;
      player() ? parseInt(pieceSongName.textContent =NumberInput.value, s.name;
      playerBar.classList 10) : null;

.add('active');  if (!title
      updatePlay) { pieceStatusPauseIcon(true);El.textContent = 'Piece title is required
      if ('.'; return;mediaSession' in }
  if navigator) {
        navigator.mediaSession (!selectedComposerId.metadata = new MediaMetadata({ title:) { pieceStatus s.name, artistEl.textContent = ': 'TaktComposer is required.'; return; }werk', album:

  const outlines 'Local Library' = movementsContainer.querySelectorAll });
        navigator('.movement-outline');
  const movementsWithAudio = [];
  outlines.forEach.mediaSession.setActionHandler('play', () => audioPlayer.play((outline, i());
        navigator.mediaSession.setActionHandler) => {
('pause', () => audioPlayer.pause    const fileInput = outline.querySelector('());
        navigator.mediaSession.setActionHandlerinput[type="file"]');
   ('stop', () if (fileInput && fileInput.files.length > 0) {
      movementsWithAudio.push({ outline, index: i, file: fileInput.files[0 => {
          audioPlayer.pause(); audioPlayer.currentTime = 0;
          playerBar.classList.remove('active'); currentSongId = null;
          updatePlayPauseIcon] });
   (false); loadSongs().then(renderLibrary);
        }); }
  });

  if (movementsWithAudio
      }
.length === 0    }
  };
}

) {
    pieceStatusEl.textContentfunction togglePlayback(id = 'At least) {
  one movement must have currentSongId == an audio file.';
    return;
  } id && !audioPlayer.paused ? audioPlayer.pause() :

  let catalogue playSong(id);
}

functionId = null; dismissContextMenu() {
  let catalogueNumber = null;
  if (
  if (activeContextMenu) { activeContextMenu.remove();catalogueAutoField activeContextMenu = null.style.display === 'block') {
; }
     catalogueId = document.querySelectorAll('.song parseInt(catalogue-item.menu-open').AutoName.dataset.catalogforEach(e => eueId, .classList.remove('menu10);
-open'));
}    const numVal

function showContextMenu = catalogueAutoNumber(id, name,.value.trim();
 el) {
  dismissContextMenu();    catalogueNumber = numVal ? parseInt
  el.classList(numVal, .add('menu-open10) :');
  const null;
  m = document.createElement } else if (('div');
catalogueField.style  m.className =.display === 'block 'context-menu';') {
   
  m.innerHTML const selVal = = '<button data catalogueSelect.value;-action="rename">
    if (selVal) {Rename</button>
      catalogueId = parseInt(selVal<button data-action="delete" class="btn-danger">Delete</button>';
, 10);
      const  el.parentNode.insertBefore numVal = catalogueNumberInput.value.trim(m, el.nextSibling);
  activeContextMenu = m;();
      catalogue
  m.querySelectorNumber = numVal('[data-action=" ? parseInt(numVal, 10) : null;rename"]').onclick = async () => {
    }
 dismissContextMenu(); show  }

 RenameModal(id, try {
    const pieceId = name); };
 await savePiece({
      title, subtitle: subtitle || null, composerId: selectedComposerId,
      keySignature: selectedKeySignature || null,  m.querySelector('[data-action="delete"]').onclick = async () => {
    dismissContextMenu();
    if (currentSongId == id) { audioPlayer.pause(); playerBar.classList.remove(' opusNumber: opusNum,active'); currentSongId = null; updatePlayPauseIcon
      pieceNumber: pieceNum,(false); }
 catalogueId, catalogue    await deleteSongNumber
    });(id); renderLibrary

    let savedCount = 0(await loadSongs());;
    for
  };
 (const mov of}

document.addEventListener movementsWithAudio)('click', e {
      const outline = mov.out => {
  if (activeContextMenuline;
      && !activeContextMenu.contains(e.target) const movTitle = outline.querySelector('[data && !e.target-field="title"]')..closest('.song-itemvalue.trim();
')) dismissContextMenu();      const movDesc
});

let = outline.querySelector('[ renameTargetId =data-field="description null;
function"]').value.trim(); showRenameModal(id, name) {
      const ksTrigger = outline.querySelector
  renameTarget('.movement-key-sId = id; renameInput.value =ig-trigger');
      const movKeySig = ksTrigger name;
  renameOverlay.classList.add && ksTrigger.dataset('active');
.value ? ksTrigger  setTimeout(() =>.dataset.value : null { renameInput.focus;

      await(); renameInput.select saveMovement({
(); }, 1        pieceId,00);
 movementNumber: savedCount + 1,
        title: movTitle || null, description: movDesc || null,
        keySignature: movKeySig, audioBlob: mov.file,}
function hideRenameModal() { renameOverlay.classList.remove('active'); renameTargetId = null; }

function openComposerModal() {
  compFirst.value = ''; compLast.value = duration: null
      });
      ''; compCountry.value = '';
  savedCount++;
    }

    compBirth.value = pieceTitleInput.value ''; compDeath.value = '';
  = '';
    catalogueList.innerHTML = '';
  composerOverlay.classList.add(' pieceSubtitleInput.value = '';
    opusNumberInputactive');
 .value = '';
    pieceNumberInput.value = '';
 setTimeout(() => compFirst.focus(), 100);    catalogueNumberInput
}

function.value = '';
 closeComposerModal()    catalogueAutoNumber { composerOverlay.classList.remove('active');.value = '';
    selectedKeySignature }

function addCatalogueInput() = null;
    keySigTrigger {
  const.textContent = 'Select Key Signature';
 e = document.createElement('div');
    keySigTrigger  e.className =.classList.add('placeholder 'catalogue-entry');
    catalogueField.style.display = 'none';
    catalogueAutoField';
  e.innerHTML = '<input type="text" placeholder="Catalogue.style.display = ' name (e.gnone';
   ., Op., BW initializeMovements();V)" autocomplete="

    pieceStatusoff"><button typeEl.textContent = `${="button" classsavedCount} Piece="catalogue-remove${savedCount >">✕</ 1 ? 'button>';
 s' : '' e.querySelector('.catalog} Added!`;ue-remove').onclick = () => e
  } catch (e) {.remove();
 
    console.error catalogueList.appendChild(e);
  e(e);
    pieceStatusEl.textContent.querySelector('input').focus();
} = 'Error saving piece.';


async function handle  }
}ComposerSave() {
  const fn

function renderLibrary(songs) {
  const el = compFirst.value.trim(), ln = = document.getElementById(' compLast.value.trim(), co = compCountry.value.trim();library-list');

  const by  el.innerHTML = '';
  if = parseInt(compBirth (!songs.length) {
    el.value, 1.innerHTML = '<li0), dy = style="text-align:center;padding:20px;color:# parseInt(compDeath.value, 10);
  if (!fn || !6e6e73;">Noln || !co songs imported yet. || isNaN(by)<br><br> || isNaN(dy))Tap "Add Music {
    piece" to get started.</li>';
StatusEl.textContent = 'Please fill in all required composer fields.';
    return;
  }
  try    return;
  }
  songs.forEach(s => {
    const {
    const li = document.createElement cid = await save('li');
Composer({ firstName:    li.className = 'song-item'; fn, lastName:
    const d ln, country: = s.duration !== co, birthYear null ? secondsTo: by, deathDecimalMMSS(sYear: dy });.duration) : '
    let ccLoading...';
 = 0;    li.innerHTML =
    for ( `<div class="const inp of cataloguesong-info"><span class="song-nameList.querySelectorAll('.catalogue-entry input'))">${s.name}</ {
      constspan><span class n = inp.value="song-duration">${.trim();
      if (n)d}</span></div>`;
 { await saveCatalog    li.addEventListener('touchstart', ()ue({ composerId: cid, name => {
     : n }); cc li.classList.add('++; }
    }
    closeComposerModal();
    pieceStatusEl.textContent = `Composer "${ln}, ${fn}" added${cc > 0 ? ` with ${cc} catalogue<LaTex>id_8</LaTex>{ln}, ${fn}`);
  } catch (e) { console.error(e); pieceStatusEl.textContent = 'Error saving composer.'; }
}

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
  renderComposerList(allComposers.filter(c =>
    c.lastName.toLowerCase().includes(q) ||
    c.firstName.toLowerCase().includes(q) ||
    `${c.lastName}, ${c.firstName}`.toLowerCase().includes(q)
  ));
}

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

async function updateCatalogueFieldForComposer(composerId) {
  catalogueField.style.display = 'none';
  catalogueAutoField.style.display = 'none';
  catalogueSelect.innerHTML = '<option value="">Select catalogue...</option>';
  catalogueNumberInput.value = '';
  catalogueAutoNumber.value = '';
  if (!composerId) return;
  const catalogues = await loadCataloguesForComposer(composerId);
  if (catalogues.length === 0) return;
  if (catalogues.length === 1) {
    catalogueAutoField.style.display = 'block';
    catalogueAutoName.value = catalogues[0].name;
    catalogueAutoName.dataset.catalogueId = catalogues[0].id;
  } else {
    catalogueField.style.display = 'block';
    catalogues.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id; opt.textContent = cat.name;
      catalogueSelect.appendChild(opt);
    });
  }
}

function getMovementCount() {
  return movementsContainer.querySelectorAll('.movement-outline').length;
}

function renumberMovementspressing');
() {
  const outlines = movementsContainer.querySelectorAll('.movement-outline');
  outlines.forEach((outline, i) => {
    outline.dataset.movementIndex      longPressTimer = i;
    outline.querySelector('.movement-title-label').textContent = `Movement No. ${i + 1}`;
  });
  updateDeleteButtonStates();
}

function updateDeleteButtonStates() {
  const count = getMovementCount();
  movementsContainer.querySelectorAll('.movement-delete-btn').forEach(btn => {
    count <= 4 ? btn.classList.add('locked') : btn.classList.remove('locked');
  });
}

function attachExpansionListener(outline) {
  const inputs = outline.querySelectorAll('input, select, button.movement-file-picker');
  const handler = () => {
    const outlines = movementsContainer.querySelectorAll('.movement-outline');
    const lastOutline = outlines[outlines.length - 1];
    if (outline === lastOutline) addMovementOutline();
    inputs.forEach(inp => inp.removeEventListener('input', handler));
    inputs.forEach(inp => inp.removeEventListener('change', handler));
    inputs.forEach(inp => inp.removeEventListener('click', handler));
  };
  inputs.forEach(inp => {
    inp.addEventListener('input', handler);
    inp.addEventListener('change', handler);
    if (inp.classList.contains('movement-file-picker')) inp.addEventListener('click', handler);
  });
}

function createMovementKeySigDropdown() {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'movement-key-sig-trigger placeholder';
  trigger.textContent = 'Select Key Signature';

  const dropdown = document.createElement('div');
  dropdown.className = 'key-sig-dropdown';

  const standardList = document.createElement('div');
  STANDARD_KEYS.forEach(key => {
    const opt = document.createElement('div');
    opt.className = 'key-sig-option';
    opt.textContent = key;
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      trigger.textContent = key;
      trigger.classList.remove('placeholder');
      trigger.dataset.value = key;
      dropdown.classList.remove('active');
    });
    standardList.appendChild(opt);
  });

  const toggle = document.createElement('div');
  toggle.className = 'key-sig-toggle';
  toggle.innerHTML = '<span class="arrow">▸</span> Obscure or Theoretical Keys';

  const obscureList = document.createElement('div');
  obscureList.className = 'key-sig-obscure';
  OBSCURE_KEYS.forEach(key => {
    const opt = document.createElement('div');
    opt.className = 'key-sig-option';
    opt.textContent = key;
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      trigger.textContent = key;
      trigger.classList.remove('placeholder');
      trigger.dataset.value = key;
      dropdown.classList.remove('active');
    });
    obscureList.appendChild(opt);
  });

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle.classList.toggle('expanded');
    obscureList.classList.toggle('visible');
  });

  dropdown.appendChild(standardList);
  dropdown.appendChild(toggle);
  dropdown.appendChild(obscureList);

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.movement-outline .key-sig-dropdown.active').forEach(d => {
      if (d !== dropdown) d.classList.remove('active');
    });
    const rect = trigger.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${Math.max(rect.width, 260)}px`;
    dropdown.classList.toggle('active');
  });

  wrapper.appendChild(trigger);
  wrapper.appendChild(dropdown);
  return wrapper;
}

function addMovementOutline() {
  movementCounter++;
  const count = getMovementCount() + 1;
  const outline = document.createElement('div');
  outline.className = 'movement-outline';
  outline.dataset.movementIndex = count - 1;

  const header = document.createElement('div');
  header.className = 'movement-header';

  const titleLabel = document.createElement('span');
  titleLabel.className = 'movement-title-label';
  titleLabel.textContent = `Movement No. ${count}`;

  const actions = document.createElement('div');
  actions.className = 'movement-actions';

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'movement-reset-btn';
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', () => {
    outline.querySelectorAll('input[type="text"], input[type="number"]').forEach(inp => inp.value = '');
    const ksTrigger = outline.querySelector('.movement-key-sig-trigger');
    if (ksTrigger) { ksTrigger.textContent = 'Select Key Signature'; ksTrigger.classList.add('placeholder'); delete ksTrigger.dataset.value; }
    const fileInput = outline.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
    const fileName = outline.querySelector('.movement-file-name');
    if (fileName) fileName.textContent = '';
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'movement-delete-btn locked';
  deleteBtn.textContent = '✕';
  deleteBtn.addEventListener('click', () => {
    if (getMovementCount() <= 4 = setTimeout(() =>) return;
 {
        if    outline.remove();
    renumberMovements();
  });

  actions.appendChild(resetBtn);
  actions.appendChild(deleteBtn);
  header.appendChild(titleLabel);
  header.appendChild(actions);
  outline.appendChild(header);

  const titleLabelEl = document.createElement('label');
  titleLabelEl.className = 'movement-field-label';
  titleLabelEl.textContent = 'Movement Title';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'movement-input';
  titleInput.placeholder = 'Optional';
  titleInput.autocomplete = 'off';
  titleInput.dataset.field = 'title';
  outline.appendChild(titleLabelEl);
  outline.appendChild(titleInput);

  const descLabel = document.createElement('label');
  descLabel.className = 'movement-field-label';
  descLabel.textContent = 'Programmatic Description';
  const descInput = document.createElement('input');
  descInput.type = 'text';
  descInput.className = 'movement-input';
  descInput.placeholder = 'Optional';
  descInput.autocomplete = 'off';
  descInput.dataset.field = 'description';
  outline.appendChild(descLabel);
  outline.appendChild(descInput);

  const ksLabel = document.createElement('label');
  ksLabel.className = 'movement-field-label';
  ksLabel.textContent = 'Key Signature';
  outline.appendChild(ksLabel);
  outline.appendChild(createMovementKeySigDropdown());

  const fileLabel = document.createElement('label');
  fileLabel.className = 'movement-field-label';
  fileLabel.textContent = 'Audio File *';
  const filePicker = document.createElement('input');
  filePicker.type = 'file';
  filePicker.accept = '.mp3,.aac,.wav,.aiff,.flac,.alac,audio/mpeg,audio/mp3,audio/aac,audio/wav,audio/flac,audio/aiff,audio/alac';
  filePicker.className = 'movement-file-picker';
  filePicker.dataset.field = 'audioFile';
  const fileNameDisplay = document.createElement('div');
  fileNameDisplay.className = 'movement-file-name';
  filePicker.addEventListener('change', () => {
    fileNameDisplay.textContent = filePicker.files.length > 0 ? filePicker.files[0].name : '';
  });
  outline.appendChild(fileLabel);
  outline.appendChild(filePicker);
  outline.appendChild(fileNameDisplay);

  movementsContainer.appendChild(outline);
  attachExpansionListener(outline);
  updateDeleteButtonStates();
}

function initializeMovements() {
  movementsContainer.innerHTML = '';
  movementCounter = 0;
  for (let i = 0; i < 4; i++) addMovementOutline();
}

async function handlePieceSave() {
  const title = pieceTitleInput.value.trim();
  const subtitle = pieceSubtitleInput.value.trim();
  const opusNum = opusNumberInput.value.trim() ? parseInt(opusNumberInput.value, 10) : null;
  const pieceNum = pieceNumberInput.value.trim() ? parseInt(pieceNumberInput.value, 10) : null;

  if (!title) { pieceStatusEl.textContent = 'Piece title is required.'; return; }
  if (!selectedComposerId) { pieceStatusEl.textContent = 'Composer is required.'; return; }

  const outlines = movementsContainer.querySelectorAll('.movement-outline');
  const movementsWithAudio = [];
  outlines.forEach((outline, i) => {
    const fileInput = outline.querySelector('input[type="file"]');
    if (fileInput && fileInput.files.length > 0) {
      movementsWithAudio.push({ outline, index: i, file: fileInput.files[0] });
    }
  });

  if (movementsWithAudio.length === 0) {
    pieceStatusEl.textContent = 'At least one movement must have an audio file.';
    return;
  }

  let catalogueId = null;
  let catalogueNumber = null;
  if (catalogueAutoField.style.display === 'block') {
    catalogueId = parseInt(catalogueAutoName.dataset.catalogueId, 10);
    const numVal = catalogueAutoNumber.value.trim();
    catalogueNumber = numVal ? parseInt(numVal, 10) : null;
  } else if (catalogueField.style.display === 'block') {
    const selVal = catalogueSelect.value;
    if (selVal) {
      catalogueId = parseInt(selVal, 10);
      const numVal = catalogueNumberInput.value.trim();
      catalogueNumber = numVal ? parseInt(numVal, 10) : null;
    }
  }

  try {
    const pieceId = await savePiece({
      title, subtitle: subtitle || null, composerId: selectedComposerId,
      keySignature: selectedKeySignature || null, opusNumber: opusNum,
      pieceNumber: pieceNum, catalogueId, catalogueNumber
    });

    let savedCount = 0;
    for (const mov of movementsWithAudio) {
      const outline = mov.outline;
      const movTitle = outline.querySelector('[data-field="title"]').value.trim();
      const movDesc = outline.querySelector('[data-field="description"]').value.trim();
      const ksTrigger = outline.querySelector('.movement-key-sig-trigger');
      const movKeySig = ksTrigger && ksTrigger.dataset.value ? ksTrigger.dataset.value : null;

      await saveMovement({
        pieceId, movementNumber: savedCount + 1,
        title: movTitle || null, description: movDesc || null,
        keySignature: movKeySig, audioBlob: mov.file, duration: null
      });
      savedCount++;
    }

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
    initializeMovements();

    pieceStatusEl.textContent = `${savedCount} Piece${savedCount > 1 ? 's' : ''} Added!`;
  } catch (e) {
    console.error(e);
    pieceStatusEl.textContent = 'Error saving piece.';
  }
}

function renderLibrary(songs) {
  const el = document.getElementById('library-list');
  el.innerHTML = '';
  if (!songs.length) {
    el.innerHTML = '<li style="text-align:center;padding:20px;color:#6e6e73;">No songs imported yet.<br><br>Tap "Add Music" to get started.</li>';
    return;
  }
  songs.forEach(s => (navigator.vibrate {
    const li = document.createElement) navigator.vibrate('li');
    li.className = 'song-item';
    const d = s.duration !== null ? secondsToDecimalMMSS(s.duration) : 'Loading...';
    li.innerHTML = `<div class="song-info"><span class="song-name">${s.name}</span><span class="song-duration">${d}</span></div>`;
    li.addEventListener('touchstart', () => {
      li.classList.add('pressing');
      longPressTimer = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(15);(15);
        li.classList
        li.classList.remove('pressing.remove('pressing');
        show');
        showContextMenu(s.id,ContextMenu(s.id, s.name, li s.name, li);
      },);
      }, 400 400);
    }););
    });
    li.addEventListener
    li.addEventListener('touchend',('touchend', () => { clearTimeout () => { clearTimeout(longPressTimer);(longPressTimer); li.classList.remove(' li.classList.remove('pressing'); });pressing'); });
    li.addEventListener
    li.addEventListener('touchcancel',('touchcancel', () => { clearTimeout () => { clearTimeout(longPressTimer);(longPressTimer); li.classList.remove(' li.classList.remove('pressing'); });pressing'); });
    li.addEventListener
    li.addEventListener('touchmove',('touchmove', () => { clearTimeout () => { clearTimeout(longPressTimer);(longPressTimer); li.classList.remove(' li.classList.remove('pressing'); });pressing'); });
    li.addEventListener
    li.addEventListener('click', ()('click', () => {
      => {
      if (activeContextMenu if (activeContextMenu && li.classList.contains && li.classList.contains('menu-open'))('menu-open')) { dismissContextMenu(); { dismissContextMenu(); return; }
 return; }
      togglePlayback(s      togglePlayback(s.id);
   .id);
    });
    el });
    el.appendChild(li);
.appendChild(li);
  });
}  });
}

async function handle

async function handleImport(files) {Import(files) {
  const st
  const st = document.getElementById(' = document.getElementById('status');
 status');
  if (!st) if (!st) return;
  return;
  st.textContent = ` st.textContent = `Importing <LaTex>id_9</LaTex>{files.length} songs....length} songs...`;
  try`;
  try {
    const {
    const ids = [];
 ids = [];
    for (let    for (let i = 0 i = 0; i < files; i < files.length; i++) {
      const.length; i++) {
      const id = await save id = await saveSongBlob(files[iSongBlob(files[i]);
      ids]);
      ids.push({ id,.push({ id, file: files[i file: files[i] });
     ] });
      st.textContent = ` st.textContent = `Saved <LaTex>id_10</LaTex>{i + 1}/<LaTex>id_11</LaTex>{files.length}`;
.length}`;
    }
       }
    st.textContent = ' st.textContent = 'Extracting metadata...Extracting metadata...';
    for';
    for (const { id (const { id, file } of, file } of ids) await extract ids) await extractAndUpdateDuration(id,AndUpdateDuration(id, file);
    file);
    st.textContent = ` st.textContent = `Import complete! <LaTex>id_12</LaTex>{files.length} songfiles.length} song<LaTex>id_13</LaTex>{files.length > 1 ? ' 1 ? 's' : ''s' : ''} added.`;} added.`;
    setTimeout(()
    setTimeout(() => switchTab(' => switchTab('library'), 8library'), 800);
00);
  } catch (  } catch (e) { consolee) { console.error(e); st.error(e); st.textContent = 'Error.textContent = 'Error importing songs.'; importing songs.'; }
}

 }
}

async function initAppasync function initApp() {
 () {
  await initDB(); await initDB();

  playerBar

  playerBar = document.getElementById(' = document.getElementById('player-bar');
player-bar');
  playerSongName = document.getElementById('  playerSongName = document.getElementById('player-song-name');player-song-name');
  playerTimes
  playerTimes = document.getElementById(' = document.getElementById('player-times');
player-times');
  progressFill =  progressFill = document.getElementById('progress document.getElementById('progress-fill');
 -fill');
  progressContainer = document progressContainer = document.getElementById('progress-container.getElementById('progress-container');
  play');
  playPauseBtn = documentPauseBtn = document.getElementById('play-p.getElementById('play-pause-btn');
ause-btn');
  renameOverlay =  renameOverlay = document.getElementById('rename document.getElementById('rename-overlay');
 -overlay');
  renameInput = document renameInput = document.getElementById('rename-input.getElementById('rename-input');
  rename');
  renameSave = document.getElementByIdSave = document.getElementById('rename-save');('rename-save');
  renameCancel
  renameCancel = document.getElementById(' = document.getElementById('rename-cancel');
rename-cancel');
  tabLibrary =  tabLibrary = document.getElementById('tab document.getElementById('tab-library');
 -library');
  tabAdd = document tabAdd = document.getElementById('tab-add.getElementById('tab-add');
  view');
  viewLibrary = document.getElementByIdLibrary = document.getElementById('view-library');('view-library');
  viewAdd
  viewAdd = document.getElementById(' = document.getElementById('view-add');
view-add');
  composerOverlay =  composerOverlay = document.getElementById('composer document.getElementById('composer-overlay');
 -overlay');
  compFirst = document compFirst = document.getElementById('comp-first.getElementById('comp-first');
  comp');
  compLast = document.getElementByIdLast = document.getElementById('comp-last');('comp-last');
  compCountry
  compCountry = document.getElementById(' = document.getElementById('comp-country');
comp-country');
  compBirth =  compBirth = document.getElementById('comp document.getElementById('comp-birth');
-birth');
  compDeath =  compDeath = document.getElementById('comp document.getElementById('comp-death');
 -death');
  catalogueList = document catalogueList = document.getElementById('catalogue.getElementById('catalogue-list');
 -list');
  addCatalogueBtn addCatalogueBtn = document.getElementById(' = document.getElementById('add-catalogueadd-catalogue-btn');
 -btn');
  composerCancel = document composerCancel = document.getElementById('composer-cancel.getElementById('composer-cancel');
  composer');
  composerSave = document.getElementByIdSave = document.getElementById('composer-save');('composer-save');
  composerTrigger
  composerTrigger = document.getElementById(' = document.getElementById('composer-trigger');
composer-trigger');
  composerDropdown =  composerDropdown = document.getElementById('composer document.getElementById('composer-dropdown');
 -dropdown');
  composerSearchWrap = composerSearchWrap = document.getElementById('composer document.getElementById('composer-search-wrap');
-search-wrap');
  composerSearchInput  composerSearchInput = document.getElementById(' = document.getElementById('composer-search-input');composer-search-input');
  composerList
  composerListEl = document.getElementByIdEl = document.getElementById('composer-list');('composer-list');
  composerAdd
  composerAddNewBtn = documentNewBtn = document.getElementById('composer-add.getElementById('composer-add-new');
 -new');
  pieceTitleInput = pieceTitleInput = document.getElementById('piece document.getElementById('piece-title');
 -title');
  pieceSubtitleInput = pieceSubtitleInput = document.getElementById('piece document.getElementById('piece-subtitle');
-subtitle');
  keySigTrigger  keySigTrigger = document.getElementById(' = document.getElementById('key-sig-triggerkey-sig-trigger');
  key');
  keySigDropdown = documentSigDropdown = document.getElementById('key-s.getElementById('key-sig-dropdown');
ig-dropdown');
  keySigStandard  keySigStandardList = document.getElementByIdList = document.getElementById('key-sig('key-sig-standard-list');
-standard-list');
  keySigToggle  keySigToggle = document.getElementById(' = document.getElementById('key-sig-togglekey-sig-toggle');
  key');
  keySigObscureSigObscureList = document.getElementByIdList = document.getElementById('key-sig('key-sig-obscure-list-obscure-list');
  op');
  opusNumberInput =usNumberInput = document.getElementById('opus document.getElementById('opus-number');
 -number');
  pieceNumberInput = pieceNumberInput = document.getElementById('piece document.getElementById('piece-number');
 -number');
  catalogueField = document catalogueField = document.getElementById('catalogue.getElementById('catalogue-field');
 -field');
  catalogueSelect = document catalogueSelect = document.getElementById('catalogue.getElementById('catalogue-select');
 -select');
  catalogueNumberInput = catalogueNumberInput = document.getElementById('catalog document.getElementById('catalogue-number');
ue-number');
  catalogueAutoField  catalogueAutoField = document.getElementById(' = document.getElementById('catalogue-auto-fieldcatalogue-auto-field');
  catalogue');
  catalogueAutoName = documentAutoName = document.getElementById('catalogue.getElementById('catalogue-auto-name');
-auto-name');
  catalogueAutoNumber  catalogueAutoNumber = document.getElementById(' = document.getElementById('catalogue-auto-numbercatalogue-auto-number');
  piece');
  pieceSaveBtn = documentSaveBtn = document.getElementById('piece-save.getElementById('piece-save-btn');
 -btn');
  pieceStatusEl = pieceStatusEl = document.getElementById('piece document.getElementById('piece-status');
 -status');
  movementsContainer = document movementsContainer = document.getElementById('movements.getElementById('movements-container');

  buildKeySignatureLists();
  initializeMovements();

  tabLibrary.onclick = e => { e.stopPropagation(); switch-container');

  buildKeySignatureLists();
  initializeMovements();

  tabLibrary.onclick = e => { e.stopPropagation(); switchTab('library');Tab('library'); };
  tab };
  tabAdd.onclick = e => { e.stopPropagationAdd.onclick = e => { e.stopPropagation(); switchTab('(); switchTab('add'); };

add'); };

  composerTrigger.addEventListener  composerTrigger.addEventListener('click', (('click', (e) => {e) => {
    e.stopPropagation
    e.stopPropagation();
    composer();
    composerDropdown.classList.contains('Dropdown.classList.contains('active') ? closeactive') ? closeComposerDropdown() :ComposerDropdown() : openComposerDropdown(); openComposerDropdown();
  });

  });
  composerSearchInput  composerSearchInput.addEventListener('input',.addEventListener('input', (e) => (e) => filterComposers filterComposers(e.target.value));(e.target.value));
  composerAdd
  composerAddNewBtn.addEventListener('NewBtn.addEventListener('click', () =>click', () => { closeComposerDropdown { closeComposerDropdown(); openComposerModal(); openComposerModal(); });

 (); });

  keySigTrigger.addEventListener keySigTrigger.addEventListener('click', (('click', (e) => {e) => {
    e.stopPropagation
    e.stopPropagation();
    key();
    keySigDropdown.classList.containsSigDropdown.classList.contains('active') ?('active') ? closeKeySigDropdown closeKeySigDropdown() : openKey() : openKeySigDropdown();
SigDropdown();
  });
   });
  keySigToggle.addEventListener keySigToggle.addEventListener('click', (('click', (e) => {e) => { e.stopPropagation(); toggle e.stopPropagation(); toggleObscureKeysObscureKeys(); });

 (); });

  document.addEventListener('click document.addEventListener('click', (e)', (e) => {
    => {
    if (composerDropdown if (composerDropdown.classList.contains('active.classList.contains('active') && !composer') && !composerDropdown.contains(e.targetDropdown.contains(e.target) && e.target) && e.target !== composerTrigger) !== composerTrigger) closeComposerDropdown(); closeComposerDropdown();
    if (
    if (keySigDropdown.classListkeySigDropdown.classList.contains('active').contains('active') && !keySig && !keySigDropdown.contains(e.targetDropdown.contains(e.target) && e.target) && e.target !== keySigTrigger !== keySigTrigger) closeKeySig) closeKeySigDropdown();
   Dropdown();
    document.querySelectorAll('.movement document.querySelectorAll('.movement-outline .key-s-outline .key-sig-dropdown.active').ig-dropdown.active').forEach(d => {forEach(d => {
      if (!
      if (!d.contains(e.targetd.contains(e.target) && !d) && !d.previousElementSibling.contains.previousElementSibling.contains(e.target)) d(e.target)) d.classList.remove('active.classList.remove('active');
    });');
    });
  });


  });

  composerCancel.onclick  composerCancel.onclick = closeComposerModal = closeComposerModal;
  composer;
  composerOverlay.onclick = eOverlay.onclick = e => { if ( => { if (e.target === composere.target === composerOverlay) closeComposerOverlay) closeComposerModal(); };
Modal(); };
  addCatalogue  addCatalogueBtn.onclick = addBtn.onclick = addCatalogueInput;CatalogueInput;
  composerSave
  composerSave.onclick = handleComposer.onclick = handleComposerSave;
 Save;
  pieceSaveBtn.addEventListener pieceSaveBtn.addEventListener('click', handle('click', handlePieceSave);

PieceSave);

  renameCancel.onclick  renameCancel.onclick = hideRenameModal = hideRenameModal;
  rename;
  renameOverlay.onclick = eOverlay.onclick = e => { if ( => { if (e.target === renamee.target === renameOverlay) hideRenameOverlay) hideRenameModal(); };
Modal(); };
  renameSave.onclick  renameSave.onclick = async () => = async () => {
    const {
    const n = renameInput n = renameInput.value.trim();
.value.trim();
    if (n    if (n && renameTargetId && renameTargetId !== null) { !== null) {
      await update
      await updateSongName(renameTargetSongName(renameTargetId, n);Id, n);
      if (
      if (currentSongId ==currentSongId == renameTargetId) renameTargetId) {
        player {
        playerSongName.textContent =SongName.textContent = n;
        if ('mediaSession n;
        if ('mediaSession' in navigator)' in navigator) navigator.mediaSession.metadata navigator.mediaSession.metadata = new MediaMetadata = new MediaMetadata({ title: n({ title: n, artist: ', artist: 'Taktwerk',Taktwerk', album: 'Local album: 'Local Library' });
 Library' });
      }
           }
      renderLibrary(await load renderLibrary(await loadSongs());
   Songs());
    }
    hide }
    hideRenameModal();
RenameModal();
  };
   };
  renameInput.onkeydown renameInput.onkeydown = e => { = e => { if (e.key if (e.key === 'Enter') === 'Enter') { e.preventDefault(); { e.preventDefault(); renameSave.click(); renameSave.click(); } if (e } if (e.key === 'Escape.key === 'Escape') hideRenameModal') hideRenameModal(); };

 (); };

  progressContainer.onclick = progressContainer.onclick = e => {
 e => {
    if (!audio    if (!audioPlayer.duration) returnPlayer.duration) return;
    const r = progressContainer;
    const r = progressContainer.getBoundingClientRect();
   .getBoundingClientRect();
    audioPlayer.currentTime = audioPlayer.currentTime = Math.max(0 Math.max(0, Math.min(, Math.min(1, (e1, (e.clientX - r.left.clientX - r.left) / r.width) / r.width)) * audioPlayer)) * audioPlayer.duration;
 .duration;
  };
  play };
  playPauseBtn.onclick =PauseBtn.onclick = () => { if () => { if (currentSongId (currentSongId === null) return === null) return; audioPlayer.paused; audioPlayer.paused ? audioPlayer.play ? audioPlayer.play().catch(console.error().catch(console.error) : audioPlayer) : audioPlayer.pause(); };
.pause(); };
  audioPlayer.  audioPlayer.ontimeupdate =ontimeupdate = () => { if () => { if (!audioPlayer.duration (!audioPlayer.duration) return; update) return; updatePlayerUI(audioPlayerPlayerUI(audioPlayer.currentTime, audioPlayer.currentTime, audioPlayer.duration - audioPlayer.duration - audioPlayer.currentTime, audioPlayer.currentTime, audioPlayer.currentTime / audioPlayer.currentTime / audioPlayer.duration); };
.duration); };
  audioPlayer.on  audioPlayer.onplay = () =>play = () => { playerBar.classList { playerBar.classList.add('active');.add('active'); updatePlayPauseIcon updatePlayPauseIcon(true); };
(true); };
  audioPlayer.on  audioPlayer.onpause = () =>pause = () => updatePlayPauseIcon updatePlayPauseIcon(false);
 (false);
  audioPlayer.onended audioPlayer.onended = () => { = () => { playerBar.classList.remove playerBar.classList.remove('active'); current('active'); currentSongId = nullSongId = null; updatePlayPause; updatePlayPauseIcon(false); loadIcon(false); loadSongs().then(renderSongs().then(renderLibrary); };

Library); };

  const ib =  const ib = document.getElementById('import document.getElementById('importBtn'), ap =Btn'), ap = document.getElementById('audio document.getElementById('audioPicker');
 Picker');
  if (ib && if (ib && ap) { ib ap) { ib.onclick = () =>.onclick = () => ap.click(); ap ap.click(); ap.onchange = async.onchange = async e => { if e => { if (e.target.files (e.target.files.length > 0.length > 0) { await handle) { await handleImport(Array.from(eImport(Array.from(e.target.files)); e.target.files)); e.target.value = '';.target.value = ''; } }; }

 } }; }

  document.onvisibility  document.onvisibilitychange = () =>change = () => { if (!document { if (!document.hidden && !audio.hidden && !audioPlayer.paused && currentPlayer.paused && currentSongId) audioSongId) audioPlayer.play().catchPlayer.play().catch(() => {});(() => {}); };

  update };

  updatePlayPauseIcon(falsePlayPauseIcon(false);
  render);
  renderLibrary(await loadSongsLibrary(await loadSongs());
  console());
  console.log('[Takt.log('[Taktwerk] Step werk] Step 5: Dynamic movements5: Dynamic movements ready');
} ready');
}

initApp();

initApp();
