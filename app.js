// app.js - Step 3: Composer selector component
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

let playerBar, playerSongName, playerTimes, progressFill, progressContainer, playPauseBtn;
let renameOverlay, renameInput, renameSave, renameCancel;
let tabLibrary, tabAdd, viewLibrary, viewAdd;
let composerOverlay, compFirst, compLast, compCountry, compBirth, compDeath;
let catalogueList, addCatalogueBtn, composerCancel, composerSave, addStatusEl;

// Composer selector refs
let composerTrigger, composerDropdown, composerSearchWrap, composerSearchInput;
let composerListEl, composerAddNewBtn, selectedComposerDisplay;
let allComposers = [];
let selectedComposerId = null;

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
    request.onsuccess = (event) => { db = event.target.result; resolve(c =>
   (db); };
    request.onerror = (event) => reject(event.target.error);
  });
}

// --- Composer CRUD --- c
async function loadComposers() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['composers'], 'readonly');
    const store = tx.objectStore('composers');
    const req = store.getAll();
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

async function saveComposer(data) {.lastName.toLowerCase().includes(q) ||

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

// --- Songs CRUD (unchanged) ---
async function saveSongBlob(file) {
  return new Promise((r, j) => { const tx = db.transaction(['songs'],'readwrite'); tx.objectStore('songs').add({name:file.name,blob:file,duration:null,addedAt:Date.now()}).onsuccess=e=>r(e.target.result); });
}
async function updateSongName(id, name) {
  return new Promise((r, j) => { const tx = db.transaction(['songs'],'readwrite'); const s = tx.objectStore('songs'); s.get(id).onsuccess=e=>{const song=e.target.result;if(song){song.name=name;s.put(song).onsuccess=()=>r();}}; });
}
async function deleteSong(id) { return new Promise(r => { db.transaction(['songs'],'readwrite').objectStore('songs').delete(id).onsuccess=()=>r(); }); }
async function extractAndUpdateDuration(id, file) {
  try { const t=new Audio();t.src=URL.createObjectURL(file);const d=await new Promise((r,j)=>{t.onloadedmetadata=()=>{URL.revokeObjectURL(t.src);r(t.duration);};t.onerror=()=>{URL.revokeObjectURL(t.src);j();};});const tx=db.transaction(['songs'],'readwrite');const s=tx.objectStore('songs');s.get(id).onsuccess=e=>{const song=e.target.result;if(song){song.duration=d;s.put(song);}};renderLibrary(await loadSongs());}catch(e){}
}
async function loadSongs() { return new Promise(r => { db.transaction(['songs'],'readonly').objectStore('songs').getAll().onsuccess=e=>r(e.target.result); }); }

// --- Tab Switching ---
function switchTab(tab) {
  if (tab==='library') { tabLibrary.classList.add('active');tabAdd.classList.remove('active');viewLibrary.classList.add('active');viewAdd.classList.remove('active');loadSongs().then(renderLibrary); }
  else { tabAdd.classList.add('active');tabLibrary.classList.remove('active');viewAdd.classList.add('active');viewLibrary.classList.remove('active'); }
}

// --- Player ---
function updatePlayerUI(el,rem,p) { playerTimes.textContent=`${secondsToDecimalMMSS(el)} / ${secondsToDecimalMMSS(el+rem)}`;progressFill.style.width=`${(p*100).toFixed(2)}%`; }
function updatePlayPauseIcon(p) { playPauseBtn.innerHTML=p?PAUSE_ICON:PLAY_ICON;playPauseBtn.setAttribute('aria-label',p?'Pause':'Play'); }
async function playSong(id) {
  db.transaction(['songs'],'readonly').objectStore('songs').get(id).onsuccess=e=>{const s=e.target.result;if(s&&s.blob){if(audioPlayer.src)URL.revokeObjectURL(audioPlayer.src);audioPlayer.src=URL.createObjectURL(s.blob);audioPlayer.play().catch(console.error);currentSongId=id;playerSongName.textContent=s.name;playerBar.classList.add('active');updatePlayPauseIcon(true);if('mediaSession'in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:s.name,artist:'Taktwerk',album:'Local Library'});navigator.mediaSession.setActionHandler('play',()=>audioPlayer.play());navigator.mediaSession.setActionHandler('pause',()=>audioPlayer.pause());navigator.mediaSession.setActionHandler('stop',()=>{audioPlayer.pause();audioPlayer.currentTime=0;playerBar.classList.remove('active');currentSongId=null;updatePlayPauseIcon(false);loadSongs().then(renderLibrary);});}}};
}
function togglePlayback(id) { currentSongId==id&&!audioPlayer.paused?audioPlayer.pause():playSong(id); }

// --- Context Menu ---
function dismissContextMenu() { if(activeContextMenu){activeContextMenu.remove();activeContextMenu=null;}document.querySelectorAll('.song-item.menu-open').forEach(e=>e.classList.remove('menu-open')); }
function showContextMenu(id,name,el) { dismissContextMenu();el.classList.add('menu-open');const m=document.createElement('div');m.className='context-menu';m.innerHTML='<button data-action="rename">Rename</button><button data-action="delete" class="btn-danger">Delete</button>';el.parentNode.insertBefore(m,el.nextSibling);activeContextMenu=m;m.querySelector('[data-action="rename"]').onclick=async()=>{dismissContextMenu();showRenameModal(id,name);};m.querySelector('[data-action="delete"]').onclick=async()=>{dismissContextMenu();if(currentSongId==id){audioPlayer.pause();playerBar.classList.remove('active');currentSongId=null;updatePlayPauseIcon(false);}await deleteSong(id);renderLibrary(await loadSongs());}; }
document.addEventListener('click',e=>{if(activeContextMenu&&!activeContextMenu.contains(e.target)&&!e.target.closest('.song-item'))dismissContextMenu();});

// --- Rename ---
let renameTargetId=null;
function showRenameModal(id,name){renameTargetId=id;renameInput.value=name;renameOverlay.classList.add('active');setTimeout(()=>{renameInput.focus();renameInput.select();},100);}
function hideRenameModal(){renameOverlay.classList.remove('active');renameTargetId=null;}

// --- Composer Modal ---
function openComposerModal(){compFirst.value='';compLast.value='';compCountry.value='';compBirth.value='';compDeath.value='';catalogueList.innerHTML='';addStatusEl.textContent='';composerOverlay.classList.add('active');setTimeout(()=>compFirst.focus(),100);}
function closeComposerModal(){composerOverlay.classList.remove('active');}
function addCatalogueInput(){const e=document.createElement('div');e.className='catalogue-entry';e.innerHTML='<input type="text" placeholder="Catalogue name (e.g., Op., BWV)" autocomplete="off"><button type="button" class="catalogue-remove">✕</button>';e.querySelector('.catalogue-remove').onclick=()=>e.remove();catalogueList.appendChild(e);e.querySelector('input').focus();}
async function handleComposerSave(){
  const fn=compFirst.value.trim(),ln=compLast.value.trim(),co=compCountry.value.trim(),by=parseInt(compBirth.value,10),dy=parseInt(compDeath.value,10);
  if(!fn||!ln||!co||isNaN(by)||isNaN(dy)){addStatusEl.textContent='Please fill in all required fields.';return;}
  try{
    const cid=await saveComposer({firstName:fn,lastName:ln,country:co,birthYear:by,deathYear:dy});
    let cc=0;for(const inp of catalogueList.querySelectorAll('.catalogue-entry input')){const n=inp.value.trim();if(n){await saveCatalogue({composerId:cid,name:n});cc++;}}
    closeComposerModal();
    addStatusEl.textContent=`Composer "${ln}, ${fn}" added${cc>0?` with <LaTex>id_1</LaTex>{cc>1?'s':''}`:''}!`;
    // Refresh selector if open
    await refreshComposerSelector();
  }catch(e){console.error(e);addStatusEl.textContent='Error saving composer.';}
}

// --- Composer Selector ---
async function refreshComposerSelector() {
  allComposers = await loadComposers();
  renderComposerList(allComposers);
  // Show/hide search based on count
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

function selectComposer(id, displayName) {
  selectedComposerId = id;
  composerTrigger.textContent = displayName;
  composerTrigger.classList.remove('placeholder');
  closeComposerDropdown();
  selectedComposerDisplay.textContent = `Selected: ${displayName} (ID: ${id})`;
}

function openComposerDropdown() {
  refreshComposerSelector();
  // Position dropdown below trigger
  const rect = composerTrigger.getBoundingClientRect();
  composerDropdown.style.top = `${rect.bottom + 4}px`;
  composerDropdown.style.left = `${rect.left}px`;
  composerDropdown.classList.add('active');
  if (allComposers.length > 10) {
    composerSearchInput.value = '';
    setTimeout(() => composerSearchInput.focus(), 50);
  }
}

function closeComposerDropdown() {
  composerDropdown.classList.remove('active');
}

function filterComposers(query) {
  const q = query.toLowerCase().trim();
    c.firstName.toLowerCase  if (!q) { renderComposerList(allComposers); return; }
  const filtered = allComposers.filter(c =>
    c.lastName.toLowerCase().includes(q) ||
    c.firstName.toLowerCase().includes(q)().includes(q) ||
    `${ ||
    `${c.lastName},c.lastName}, <LaTex>id_2</LaTex>{c.firstName}`.toLowerCase().includes(q)
  );
  render(q)
  );
  renderComposerList(filtered);ComposerList(filtered);
}

// --- Library ---
function renderLibrary
}

// --- Library ---
function renderLibrary(songs) {(songs) {
  const el
  const el=document.getElementById('library-list');el.innerHTML=document.getElementById('library-list');el.innerHTML='';
  if(!songs.length='';
  if(!songs.length){el.innerHTML='<li style="text){el.innerHTML='<li style="text-align:center;padding:20px;color-align:center;padding:20px;color:#6e6:#6e6e73;">e73;">No songs imported yetNo songs imported yet.<br><br.<br><br>Tap "Add Music" to get>Tap "Add Music" to get started.</li>';return;}
  started.</li>';return;}
  songs.forEach(s=> songs.forEach(s=>{const li=document{const li=document.createElement('li');li.className='song.createElement('li');li.className='song-item';const d-item';const d=s.duration!==null=s.duration!==null?secondsToDecimalMMSS(s.duration?secondsToDecimalMMSS(s.duration):'Loading...):'Loading...';li.innerHTML=`';li.innerHTML=`<div class="<div class="song-info"><spansong-info"><span class="song-name"><LaTex>id_3</LaTex>{s.name}</span><span class="song-duration"><LaTex>id_4</LaTex>{d}</span></div>`;lid}</span></div>`;li.addEventListener('touchstart',()=>{li.addEventListener('touchstart',()=>{li.classList.add('press.classList.add('pressing');longPressing');longPressTimer=setTimeout(()=>Timer=setTimeout(()=>{if(navigator{if(navigator.vibrate)navigator.vibrate(1.vibrate)navigator.vibrate(15);li.classList5);li.classList.remove('pressing.remove('pressing');showContextMenu(s.id,s.name,');showContextMenu(s.id,s.name,li);},4li);},400);});00);});li.addEventListener('touchli.addEventListener('touchend',()=>{end',()=>{clearTimeout(longPressclearTimeout(longPressTimer);li.classListTimer);li.classList.remove('pressing');});li.addEventListener.remove('pressing');});li.addEventListener('touchcancel',()=>{clearTimeout('touchcancel',()=>{clearTimeout(longPressTimer);li.classList.remove('(longPressTimer);li.classList.remove('pressing');});li.addEventListener('touchpressing');});li.addEventListener('touchmove',()=>{move',()=>{clearTimeout(longPressclearTimeout(longPressTimer);li.classList.remove('pressingTimer);li.classList.remove('pressing');});li.addEventListener('click',()=>');});li.addEventListener('click',()=>{if(activeContextMenu&&li.classList.contains{if(activeContextMenu&&li.classList.contains('menu-open'))('menu-open')){dismissContextMenu();{dismissContextMenu();return;}togglePlayback(s.id);});return;}togglePlayback(s.id);});el.appendChild(li);});
}

el.appendChild(li);});
}

// --- Import (// --- Import (legacy) ---
legacy) ---
async function handleImport(files){const stasync function handleImport(files){const st=document.getElementById('status');if(!st=document.getElementById('status');if(!st)return;st.textContent)return;st.textContent=`Importing ${=`Importing ${files.length} songs...`;try{files.length} songs...`;try{const ids=[];for(let i=const ids=[];for(let i=0;i<files0;i<files.length;i++){const.length;i++){const id=await saveSongBlob(files[i id=await saveSongBlob(files[i]);ids.push({]);ids.push({id,file:id,file:files[i]});files[i]});st.textContent=`st.textContent=`Saved <LaTex>id_5</LaTex>{files.lengthSaved <LaTex>id_6</LaTex>{files.length}`;}st.textContent='Extracting}`;}st.textContent='Extracting metadata...';for metadata...';for(const{id(const{id,file}of ids)await extractAndUpdate,file}of ids)await extractAndUpdateDuration(id,file);Duration(id,file);st.textContent=`Importst.textContent=`Import complete! <LaTex>id_7</LaTex>{files.length} song<LaTex>id_8</LaTex>{files.length>1?'s':''}files.length>1?'s':''} added.`;setTimeout added.`;setTimeout(()=>switchTab('(()=>switchTab('library'),80library'),800);}catch(e0);}catch(e){console.error(e);st){console.error(e);st.textContent='Error importing songs.';}}.textContent='Error importing songs.';}}

// --- Init ---
async function

// --- Init ---
async function initApp() {
  await init initApp() {
  await initDB();
 DB();
  playerBar=document playerBar=document.getElementById('player-bar.getElementById('player-bar');playerSongName');playerSongName=document.getElementById('player=document.getElementById('player-song-name');player-song-name');playerTimes=document.getElementById('Times=document.getElementById('player-times');progressplayer-times');progressFill=document.getElementById('Fill=document.getElementById('progress-fill');progressprogress-fill');progressContainer=document.getElementById('progress-container');playContainer=document.getElementById('progress-container');playPauseBtn=document.getElementById('play-pausePauseBtn=document.getElementById('play-pause-btn');
 -btn');
  renameOverlay=document.getElementById renameOverlay=document.getElementById('rename-overlay');('rename-overlay');renameInput=document.getElementByIdrenameInput=document.getElementById('rename-input');('rename-input');renameSave=document.getElementByIdrenameSave=document.getElementById('rename-save');renameCancel=document.getElementById('rename-save');renameCancel=document.getElementById('rename-cancel');
  tabLibrary('rename-cancel');
  tabLibrary=document.getElementById('tab=document.getElementById('tab-library');tabAdd-library');tabAdd=document.getElementById('tab-add');viewLibrary=document.getElementById('tab-add');viewLibrary=document.getElementById('view=document.getElementById('view-library');viewAdd-library');viewAdd=document.getElementById('view=document.getElementById('view-add');
 -add');
  composerOverlay=document.getElementById composerOverlay=document.getElementById('composer-overlay');('composer-overlay');compFirst=document.getElementById('comp-first');compFirst=document.getElementById('comp-first');compLast=document.getElementByIdcompLast=document.getElementById('comp-last');('comp-last');compCountry=document.getElementByIdcompCountry=document.getElementById('comp-country');('comp-country');compBirth=document.getElementByIdcompBirth=document.getElementById('comp-birth('comp-birth');compDeath=document.getElementById('comp-death');compDeath=document.getElementById('comp-death');catalogueList');catalogueList=document.getElementById('catalog=document.getElementById('catalogue-list');addue-list');addCatalogueBtn=documentCatalogueBtn=document.getElementById('add-c.getElementById('add-catalogue-btn');atalogue-btn');composerCancel=document.getElementByIdcomposerCancel=document.getElementById('composer-cancel');('composer-cancel');composerSave=document.getElementById('composer-save');composerSave=document.getElementById('composer-save');addStatusEl=documentaddStatusEl=document.getElementById('add-status.getElementById('add-status');
  composer');
  composerTrigger=document.getElementById('Trigger=document.getElementById('composer-trigger');composercomposer-trigger');composerDropdown=document.getElementById('Dropdown=document.getElementById('composer-dropdown');composercomposer-dropdown');composerSearchWrap=document.getElementByIdSearchWrap=document.getElementById('composer-search-wrap');composerSearchInput('composer-search-wrap');composerSearchInput=document.getElementById('composer=document.getElementById('composer-search-input');composer-search-input');composerListEl=document.getElementByIdListEl=document.getElementById('composer-list');('composer-list');composerAddNewBtn=document.getElementById('composercomposerAddNewBtn=document.getElementById('composer-add-new');selectedComposerDisplay=document.getElementById-add-new');selectedComposerDisplay=document.getElementById('selected-composer('selected-composer-display');

 -display');

  // Tabs
  // Tabs
  tab tabLibrary.onclick=e=>Library.onclick=e=>{e{e.stopPropagation();switchTab('library');};.stopPropagation();switchTab('library');};
  tabAdd
  tabAdd.onclick=e=>{.onclick=e=>{e.stopPropagation();switche.stopPropagation();switchTab('add');Tab('add');};

  //};

  // Composer selector
  Composer selector
  composerTrigger.addEventListener(' composerTrigger.addEventListener('click', (click', (e) => {e) => {
    e.stopPropagation
    e.stopPropagation();
    composer();
    composerDropdown.classList.contains('Dropdown.classList.contains('active') ? closeactive') ? closeComposerDropdown() :ComposerDropdown() : openComposerDropdown(); openComposerDropdown();
  });

  });
  composerSearchInput  composerSearchInput.addEventListener('input',.addEventListener('input', (e) => (e) => filter filterComposers(eComposers(e.target.value));
.target.value));
  composerAddNew  composerAddNewBtn.addEventListener('clickBtn.addEventListener('click', () => { closeComposerDropdown();', () => { closeComposerDropdown(); openComposerModal(); openComposerModal(); });
  // });
  // Close dropdown on outside Close dropdown on outside click
  document click
  document.addEventListener('click',.addEventListener('click', (e) => (e) => {
    if (composerDropdown.classList {
    if (composerDropdown.classList.contains('active').contains('active') && !composerDropdown && !composerDropdown.contains(e.target).contains(e.target) && e.target !== && e.target !== composerTrigger) { composerTrigger) {
     
      closeComposerDropdown(); closeComposerDropdown();
    }

    }
  });

  // Composer modal
  });

  // Composer modal
  composerCancel.onclick  composerCancel.onclick=closeComposerModal=closeComposerModal;
  composer;
  composerOverlay.onclickOverlay.onclick=e=>{if=e=>{if(e.target===composer(e.target===composerOverlay)closeComposerModal();};
Overlay)closeComposerModal();};
  addCatalogue  addCatalogueBtn.onclick=addBtn.onclick=addCatalogueInput;CatalogueInput;
  composerSave
  composerSave.onclick=handleComposer.onclick=handleComposerSave;

 Save;

  // Rename
  // Rename
  renameCancel.onclick=hideRenameModal;rename renameCancel.onclick=hideRenameModal;renameOverlay.onclick=e=>Overlay.onclick=e=>{if(e.target{if(e.target===renameOverlay)===renameOverlay)hideRenameModal();hideRenameModal();};
  rename};
  renameSave.onclick=asyncSave.onclick=async()=>{const n=re()=>{const n=renameInput.value.trimnameInput.value.trim();if(n&&();if(n&&renameTargetId!==renameTargetId!==null){await updatenull){await updateSongName(renameTargetId,n);ifSongName(renameTargetId,n);if(currentSongId==renameTargetId){(currentSongId==renameTargetId){playerSongName.textContent=n;if('mediaplayerSongName.textContent=n;if('mediaSession'in navigator)navigator.mediaSession.metadataSession'in navigator)navigator.mediaSession.metadata=new MediaMetadata({title:n,artist=new MediaMetadata({title:n,artist:'Taktwerk:'Taktwerk',album:'Local',album:'Local Library'});}renderLibrary(await loadSongs Library'});}renderLibrary(await loadSongs());}hideRename());}hideRenameModal();};
Modal();};
  renameInput.onkeydown=e=>{  renameInput.onkeydown=e=>{if(e.key==='if(e.key==='Enter'){e.preventDefaultEnter'){e.preventDefault();renameSave.click();}if(e();renameSave.click();}if(e.key==='Escape')hideRenameModal();.key==='Escape')hideRenameModal();};

  //};

  // Player
  progress Player
  progressContainer.onclick=e=>Container.onclick=e=>{if(!audio{if(!audioPlayer.duration)return;Player.duration)return;const r=const r=progressContainer.getBoundingClientRect();progressContainer.getBoundingClientRect();audioPlayer.currentTime=MathaudioPlayer.currentTime=Math.max(0,.max(0,Math.min(1Math.min(1,(e.clientX-r,(e.clientX-r.left)/r.left)/r.width))*audioPlayer.duration;};
.width))*audioPlayer.duration;};
  playPauseBtn  playPauseBtn.onclick=()=>{.onclick=()=>{if(currentSongIdif(currentSongId===null)return;===null)return;audioPlayer.paused?audioPlayer.play().audioPlayer.paused?audioPlayer.play().catch(console.error):catch(console.error):audioPlayer.pause();audioPlayer.pause();};
  audio};
  audioPlayer.Player.ontimeupdate=()=>{if(!ontimeupdate=()=>{if(!audioPlayer.duration)returnaudioPlayer.duration)return;updatePlayerUI;updatePlayerUI(audioPlayer.currentTime,a(audioPlayer.currentTime,audioPlayer.duration-audioPlayer.duration-audioPlayer.currentTime,audioPlayer.currentTime/audioudioPlayer.currentTime,audioPlayer.currentTime/audioPlayer.duration);};Player.duration);};
  audioPlayer
  audioPlayer.onplay=()=>.onplay=()=>{playerBar.classList{playerBar.classList.add('active');.add('active');updatePlayPauseIconupdatePlayPauseIcon(true);};
(true);};
  audioPlayer.on  audioPlayer.onpause=()=>updatePlayPauseIcon(falsepause=()=>updatePlayPauseIcon(false);
  audio);
  audioPlayer.onended=Player.onended=()=>{playerBar()=>{playerBar.classList.remove('active.classList.remove('active');currentSongId=null;updatePlay');currentSongId=null;updatePlayPauseIcon(false);PauseIcon(false);loadSongs().thenloadSongs().then(renderLibrary);};(renderLibrary);};

  // Legacy

  // Legacy import
  const import
  const ib=document.getElementById(' ib=document.getElementById('importBtn'),apimportBtn'),ap=document.getElementById('audio=document.getElementById('audioPicker');
  if(ib&&apPicker');
  if(ib&&ap){ib.onclick=){ib.onclick=()=>ap.click()=>ap.click();ap.onchange();ap.onchange=async e=async e=>{if(e=>{if(e.target.files.length>.target.files.length>0){await handle0){await handleImport(Array.from(eImport(Array.from(e.target.files));e.target.files));e.target.value='';.target.value='';}};}

 }};}

  document document.onvisibilitychange=.onvisibilitychange=()=>{if(!()=>{if(!document.hidden&&!audiodocument.hidden&&!audioPlayer.paused&&currentPlayer.paused&&currentSongId)audioSongId)audioPlayer.play().catchPlayer.play().catch(()=>{});};(()=>{});};

  updatePlay

  updatePlayPauseIcon(false);PauseIcon(false);
  renderLibrary
  renderLibrary(await loadSongs());(await loadSongs());
  console.log
  console.log('[Taktwerk] Step 3('[Taktwerk] Step 3: Composer selector ready: Composer selector ready');
}

');
}

initApp();
initApp();
