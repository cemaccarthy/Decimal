// app.js - Sound effect + text selection fix
import { secondsToDecimalMMSS } from '/taktwerk/takt.js';

const DB_NAME = 'TaktwerkDB';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

let db;
let currentSongId = null;
let longPressTimer = null;
let activeSongId = null;

const audioPlayer = new Audio();
audioPlayer.preload = 'auto';

// Preloaded action sheet sound effect
const ACTION_SOUND_BASE64 = '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';
const ACTION_SOUND = new Audio(`data:audio/mp3;base64,${ACTION_SOUND_BASE64}`);
ACTION_SOUND.volume = 0.6;
ACTION_SOUND.preload = 'auto';

const PLAY_ICON = `<svg viewBox="0 0 24 24" fill="none"><path opacity="0.1" d="M4 5.49683V18.5032C4 20.05 5.68077 21.0113 7.01404 20.227L18.0694 13.7239C19.384 12.9506 19.384 11.0494 18.0694 10.2761L7.01404 3.77296C5.68077 2.98869 4 3.95 4 5.49683Z" fill="currentColor"/><path d="M4 5.49683V18.5032C4 20.05 5.68077 21.0113 7.01404 20.227L18.0694 13.7239C19.384 12.9506 19.384 11.0494 18.0694 10.2761L7.01404 3.77296C5.68077 2.98869 4 3.95 4 5.49683Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PAUSE_ICON = `<svg viewBox="0 0 24 24" fill="none"><path opacity="0.1" d="M14 19L14 5C14 3.89543 14.8954 3 16 3L17 3C18.1046 3 19 3.89543 19 5L19 19C19 20.1046 18.1046 21 17 21L16 21C14.8954 21 14 20.1046 14 19Z" fill="currentColor"/><path opacity="0.1" d="M10 19L10 5C10 3.89543 9.10457 3 8 3L7 3C5.89543 3 5 3.89543 5 5L5 19C5 20.1046 5.89543 21 7 21L8 21C9.10457 21 10 20.1046 10 19Z" fill="currentColor"/><path d="M14 19L14 5C14 3.89543 14.8954 3 16 3L17 3C18.1046 3 19 3.89543 19 5L19 19C19 20.1046 18.1046 21 17 21L16 21C14.8954 21 14 20.1046 14 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 19L10 5C10 3.89543 9.10457 3 8 3L7 3C5.89543 3 5 3.89543 5 5L5 19C5 20.1046 5.89543 21 7 21L8 21C9.10457 21 10 20.1046 10 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

let playerBar, playerSongName, playerTimes, progressFill, progressContainer, playPauseBtn;
let actionOverlay, actionSheetTitle, actionRename, actionDelete, actionCancel;
let renameOverlay, renameInput, renameSave, renameCancel;

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

function showActionSheet(songId, songName) {
  // Play sound effect
  ACTION_SOUND.currentTime = 0;
  ACTION_SOUND.play().catch(() => {});
  
  activeSongId = songId;
  actionSheetTitle.textContent = songName;
  actionOverlay.classList.add('active');
}

function hideActionSheet() {
  actionOverlay.classList.remove('active');
  activeSongId = null;
}

function showRenameModal(currentName) {
  renameInput.value = currentName;
  renameOverlay.classList.add('active');
  setTimeout(() => { renameInput.focus(); renameInput.select(); }, 100);
}

function hideRenameModal() {
  renameOverlay.classList.remove('active');
}

function renderLibrary(songs) {
  const libraryEl = document.getElementById('library');
  libraryEl.innerHTML = '';
  if (songs.length === 0) {
    libraryEl.innerHTML = '<li style="text-align:center; padding:20px; color:#6e6e73;">No songs imported yet.</li>';
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
        li.classList.remove('pressing');
        showActionSheet(song.id, song.name);
      }, 650);
    });

    li.addEventListener('touchend', () => {
      clearTimeout(longPressTimer);
      li.classList.remove('pressing');
    });
    li.addEventListener('touchcancel', () => {
      clearTimeout(longPressTimer);
      li.classList.remove('pressing');
    });
    li.addEventListener('touchmove', () => {
      clearTimeout(longPressTimer);
      li.classList.remove('pressing');
    });

    li.addEventListener('click', () => togglePlayback(song.id));
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
    const songs = await loadSongs();
    renderLibrary(songs);
    statusEl.textContent = 'Extracting metadata...';
    for (const { id, file } of songIds) {
      await extractAndUpdateDuration(id, file);
    }
    statusEl.textContent = 'Import complete!';
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
  actionOverlay = document.getElementById('action-overlay');
  actionSheetTitle = document.getElementById('action-sheet-title');
  actionRename = document.getElementById('action-rename');
  actionDelete = document.getElementById('action-delete');
  actionCancel = document.getElementById('action-cancel');
  renameOverlay = document.getElementById('rename-overlay');
  renameInput = document.getElementById('rename-input');
  renameSave = document.getElementById('rename-save');
  renameCancel = document.getElementById('rename-cancel');

  if (!actionOverlay || !actionRename || !actionDelete) {
    console.error('[Taktwerk] CRITICAL: Overlay elements not found in DOM!');
    return;
  }

  // Preload sound effect
  ACTION_SOUND.load();

  actionCancel.addEventListener('click', hideActionSheet);
  actionOverlay.addEventListener('click', (e) => { if (e.target === actionOverlay) hideActionSheet(); });

  actionRename.addEventListener('click', async () => {
    const songId = activeSongId;
    hideActionSheet();
    const songs = await loadSongs();
    const song = songs.find(s => s.id === songId);
    if (song) showRenameModal(song.name);
  });

  actionDelete.addEventListener('click', async () => {
    const songId = activeSongId;
    hideActionSheet();
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

  renameCancel.addEventListener('click', hideRenameModal);
  renameOverlay.addEventListener('click', (e) => { if (e.target === renameOverlay) hideRenameModal(); });

  renameSave.addEventListener('click', async () => {
    const newName = renameInput.value.trim();
    if (newName && activeSongId !== null) {
      await updateSongName(activeSongId, newName);
      if (currentSongId == activeSongId) {
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
