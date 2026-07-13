// app.js - Tap-to-dismiss on active song
import { secondsToDecimalMMSS } from '/taktwerk/takt.js';

const DB_NAME = 'TaktwerkDB';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

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

async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (event) => { db = event.target.result; resolve(db); };
    request.onerror = (event) => reject(event.target.error);
  });
}

async function saveSongBlob(file) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const songData = { name: file.name, blob: file, duration: null, addedAt: Date.now() };
    const addRequest = store.add(songData);
    addRequest.onsuccess = () => resolve(addRequest.result);
    addRequest.onerror = () => reject(addRequest.error);
  });
}

async function updateSongName(songId, newName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(songId);
    getRequest.onsuccess = () => {
      const song = getRequest.result;
      if (song) {
        song.name = newName;
        const putRequest = store.put(song);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

async function deleteSong(songId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(songId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function extractAndUpdateDuration(songId, file) {
  try {
    const tempAudio = new Audio();
    tempAudio.src = URL.createObjectURL(file);
    const duration = await new Promise((resolve, reject) => {
      tempAudio.onloadedmetadata = () => { URL.revokeObjectURL(tempAudio.src); resolve(tempAudio.duration); };
      tempAudio.onerror = () => { URL.revokeObjectURL(tempAudio.src); reject(new Error('Metadata load failed')); };
    });
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(songId);
    getRequest.onsuccess = () => {
      const song = getRequest.result;
      if (song) { song.duration = duration; store.put(song); }
    };
    const songs = await loadSongs();
    renderLibrary(songs);
  } catch (e) { console.warn(`Could not extract duration for ${file.name}:`, e); }
}

async function loadSongs() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function switchTab(tab) {
  if (tab === 'library') {
    tabLibrary.classList.add('active');
    tabAdd.classList.remove('active');
    viewLibrary.classList.add('active');
    viewAdd.classList.remove('active');
    loadSongs().then(songs => renderLibrary(songs));
  } else {
    tabAdd.classList.add('active');
    tabLibrary.classList.remove('active');
    viewAdd.classList.add('active');
    viewLibrary.classList.remove('active');
  }
}

function updatePlayerUI(elapsed, remaining, progress) {
  playerTimes.textContent = `${secondsToDecimalMMSS(elapsed)} / ${secondsToDecimalMMSS(elapsed + remaining)}`;
  progressFill.style.width = `${(progress * 100).toFixed(2)}%`;
}

function updatePlayPauseIcon(isPlaying) {
  playPauseBtn.innerHTML = isPlaying ? PAUSE_ICON : PLAY_ICON;
  playPauseBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
}

async function playSong(songId) {
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.get(songId);
  request.onsuccess = () => {
    const song = request.result;
    if (song && song.blob) {
      if (audioPlayer.src) URL.revokeObjectURL(audioPlayer.src);
      audioPlayer.src = URL.createObjectURL(song.blob);
      audioPlayer.play().catch(e => console.error('Playback failed:', e));
      currentSongId = songId;
      playerSongName.textContent = song.name;
      playerBar.classList.add('active');
      updatePlayPauseIcon(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: song.name, artist: 'Taktwerk', album: 'Local Library' });
        navigator.mediaSession.setActionHandler('play', () => audioPlayer.play());
        navigator.mediaSession.setActionHandler('pause', () => audioPlayer.pause());
        navigator.mediaSession.setActionHandler('stop', () => {
          audioPlayer.pause(); audioPlayer.currentTime = 0;
          playerBar.classList.remove('active'); currentSongId = null;
          updatePlayPauseIcon(false);
          loadSongs().then(songs => renderLibrary(songs));
        });
      }
    }
  };
}

function togglePlayback(songId) {
  if (currentSongId == songId && !audioPlayer.paused) {
    audioPlayer.pause();
  } else {
    playSong(songId);
  }
}

// --- Inline Context Menu ---
function dismissContextMenu() {
  if (activeContextMenu) {
    activeContextMenu.remove();
    activeContextMenu = null;
  }
  document.querySelectorAll('.song-item.menu-open').forEach(el => el.classList.remove('menu-open'));
}

function showContextMenu(songId, songName, songElement) {
  dismissContextMenu();
  songElement.classList.add('menu-open');

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <button data-action="rename">Rename</button>
    <button data-action="delete" class="btn-danger">Delete</button>
  `;

  songElement.parentNode.insertBefore(menu, songElement.nextSibling);
  activeContextMenu = menu;

  menu.querySelector('[data-action="rename"]').addEventListener('click', async () => {
    dismissContextMenu();
    showRenameModal(songId, songName);
  });

  menu.querySelector('[data-action="delete"]').addEventListener('click', async () => {
    dismissContextMenu();
    if (currentSongId == songId) {
      audioPlayer.pause();
      playerBar.classList.remove('active');
      currentSongId = null;
      updatePlayPauseIcon(false);
    }
    await deleteSong(songId);
    const songs = await loadSongs();
    renderLibrary(songs);
  });
}

// Dismiss menu when tapping outside songs
document.addEventListener('click', (e) => {
  if (activeContextMenu && !activeContextMenu.contains(e.target) && !e.target.closest('.song-item')) {
    dismissContextMenu();
  }
});

// --- Rename Modal ---
let renameTargetId = null;

function showRenameModal(songId, currentName) {
  renameTargetId = songId;
  renameInput.value = currentName;
  renameOverlay.classList.add('active');
  setTimeout(() => { renameInput.focus(); renameInput.select(); }, 100);
}

function hideRenameModal() {
  renameOverlay.classList.remove('active');
  renameTargetId = null;
}

// --- Library Rendering ---
function renderLibrary(songs) {
  const libraryEl = document.getElementById('library-list');
  libraryEl.innerHTML = '';
  if (songs.length === 0) {
    libraryEl.innerHTML = '<li style="text-align:center; padding:20px; color:#6e6e73;">No songs imported yet.<br><br>Tap "Add Music" to get started.</li>';
    return;
  }
  songs.forEach(song => {
    const li = document.createElement('li');
    li.className = 'song-item';
    const durationDisplay = song.duration !== null ? secondsToDecimalMMSS(song.duration) : 'Loading...';
    li.innerHTML = `
      <div class="song-info">
        <span class="song-name">${song.name}</span>
        <span class="song-duration">${durationDisplay}</span>
      </div>
    `;

    li.addEventListener('touchstart', () => {
      li.classList.add('pressing');
      longPressTimer = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(15);
        li.classList.remove('pressing');
        showContextMenu(song.id, song.name, li);
      }, 400);
    });

    li.addEventListener('touchend', () => { clearTimeout(longPressTimer); li.classList.remove('pressing'); });
    li.addEventListener('touchcancel', () => { clearTimeout(longPressTimer); li.classList.remove('pressing'); });
    li.addEventListener('touchmove', () => { clearTimeout(longPressTimer); li.classList.remove('pressing'); });

    // FIXED: Tap on song with open menu only dismisses, no playback change
    li.addEventListener('click', () => {
      if (activeContextMenu && li.classList.contains('menu-open')) {
        dismissContextMenu();
        return;
      }
      togglePlayback(song.id);
    });

    libraryEl.appendChild(li);
  });
}

async function handleImport(files) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = `Importing ${files.length} songs...`;
  try {
    const songIds = [];
    for (let i = 0; i < files.length; i++) {
      const id = await saveSongBlob(files[i]);
      songIds.push({ id, file: files[i] });
      statusEl.textContent = `Saved ${i + 1}/${files.length}`;
    }
    statusEl.textContent = 'Extracting metadata...';
    for (const { id, file } of songIds) {
      await extractAndUpdateDuration(id, file);
    }
    statusEl.textContent = `Import complete! ${files.length} song${files.length > 1 ? 's' : ''} added.`;
    setTimeout(() => switchTab('library'), 800);
  } catch (error) {
    console.error(error);
    statusEl.textContent = 'Error importing songs.';
  }
}

async function initApp() {
  await initDB();

  playerBar = document.getElementById('player-bar');
  playerSongName = document.getElementById('player-song-name');
  playerTimes = document.getElementById('player-times');
  progressFill = document.getElementById('progress-fill');
  progressContainer = document.getElementById('progress-container');
  playPauseBtn = document.getElementById('play-pause-btn');
  renameOverlay = document.getElementById('rename-overlay');
  renameInput = document.getElementById('rename-input');
  renameSave = document.getElementById('rename-save');
  renameCancel = document.getElementById('rename-cancel');
  tabLibrary = document.getElementById('tab-library');
  tabAdd = document.getElementById('tab-add');
  viewLibrary = document.getElementById('view-library');
  viewAdd = document.getElementById('view-add');

  tabLibrary.addEventListener('click', (e) => { e.stopPropagation(); switchTab('library'); });
  tabAdd.addEventListener('click', (e) => { e.stopPropagation(); switchTab('add'); });

  renameCancel.addEventListener('click', hideRenameModal);
  renameOverlay.addEventListener('click', (e) => { if (e.target === renameOverlay) hideRenameModal(); });

  renameSave.addEventListener('click', async () => {
    const newName = renameInput.value.trim();
    if (newName && renameTargetId !== null) {
      await updateSongName(renameTargetId, newName);
      if (currentSongId == renameTargetId) {
        playerSongName.textContent = newName;
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({ title: newName, artist: 'Taktwerk', album: 'Local Library' });
        }
      }
      const songs = await loadSongs();
      renderLibrary(songs);
    }
    hideRenameModal();
  });

  renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); renameSave.click(); }
    if (e.key === 'Escape') hideRenameModal();
  });

  progressContainer.addEventListener('click', (e) => {
    if (!audioPlayer.duration) return;
    const rect = progressContainer.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioPlayer.currentTime = ratio * audioPlayer.duration;
  });

  playPauseBtn.addEventListener('click', () => {
    if (currentSongId === null) return;
    if (audioPlayer.paused) {
      audioPlayer.play().catch(e => console.error('Playback failed:', e));
    } else {
      audioPlayer.pause();
    }
  });

  audioPlayer.addEventListener('timeupdate', () => {
    if (!audioPlayer.duration) return;
    const elapsed = audioPlayer.currentTime;
    const remaining = audioPlayer.duration - elapsed;
    const progress = elapsed / audioPlayer.duration;
    updatePlayerUI(elapsed, remaining, progress);
  });

  audioPlayer.addEventListener('play', () => { playerBar.classList.add('active'); updatePlayPauseIcon(true); });
  audioPlayer.addEventListener('pause', () => { updatePlayPauseIcon(false); });
  audioPlayer.addEventListener('ended', () => {
    playerBar.classList.remove('active');
    currentSongId = null;
    updatePlayPauseIcon(false);
    loadSongs().then(songs => renderLibrary(songs));
  });

  const importBtn = document.getElementById('importBtn');
  const audioPicker = document.getElementById('audioPicker');
  importBtn.addEventListener('click', () => audioPicker.click());
  audioPicker.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      await handleImport(Array.from(e.target.files));
      e.target.value = '';
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !audioPlayer.paused && currentSongId) {
      audioPlayer.play().catch(() => {});
    }
  });

  updatePlayPauseIcon(false);
  const songs = await loadSongs();
  renderLibrary(songs);
}

initApp();
