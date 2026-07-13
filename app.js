// app.js - Main application logic with playback + decimal progress + iOS polish
import { secondsToDecimalMMSS } from '/taktwerk/takt.js';

const DB_NAME = 'TaktwerkDB';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

let db;
let currentSongId = null;

const audioPlayer = new Audio();
audioPlayer.preload = 'auto';

// DOM References for player bar
const playerBar = document.getElementById('player-bar');
const playerSongName = document.getElementById('player-song-name');
const playerTimes = document.getElementById('player-times');
const progressFill = document.getElementById('progress-fill');
const progressContainer = document.getElementById('progress-container');

// Initialize IndexedDB
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

// Update player bar UI with decimal times
function updatePlayerUI(elapsed, remaining, progress) {
  playerTimes.textContent = `${secondsToDecimalMMSS(elapsed)} / ${secondsToDecimalMMSS(elapsed + remaining)}`;
  progressFill.style.width = `${(progress * 100).toFixed(2)}%`;
}

// Seek on progress bar tap
progressContainer.addEventListener('click', (e) => {
  if (!audioPlayer.duration) return;
  const rect = progressContainer.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audioPlayer.currentTime = ratio * audioPlayer.duration;
});

// Real-time progress updates
audioPlayer.addEventListener('timeupdate', () => {
  if (!audioPlayer.duration) return;
  const elapsed = audioPlayer.currentTime;
  const remaining = audioPlayer.duration - elapsed;
  const progress = elapsed / audioPlayer.duration;
  updatePlayerUI(elapsed, remaining, progress);
});

// Show/hide player bar on play/end
audioPlayer.addEventListener('play', () => playerBar.classList.add('active'));
audioPlayer.addEventListener('ended', () => {
  playerBar.classList.remove('active');
  currentSongId = null;
  loadSongs().then(songs => renderLibrary(songs));
});

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
      document.querySelectorAll('.play-btn').forEach(btn => {
        btn.textContent = btn.dataset.id == songId ? '⏸' : '▶';
      });

      // Media Session API for lock screen controls
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.name,
          artist: 'Taktwerk',
          album: 'Local Library'
        });
        navigator.mediaSession.setActionHandler('play', () => audioPlayer.play());
        navigator.mediaSession.setActionHandler('pause', () => audioPlayer.pause());
        navigator.mediaSession.setActionHandler('stop', () => {
          audioPlayer.pause();
          audioPlayer.currentTime = 0;
          playerBar.classList.remove('active');
          currentSongId = null;
          loadSongs().then(songs => renderLibrary(songs));
        });
      }
    }
  };
}

function togglePlayback(songId) {
  if (currentSongId == songId && !audioPlayer.paused) {
    audioPlayer.pause();
    document.querySelector(`.play-btn[data-id="${songId}"]`).textContent = '▶';
  } else {
    playSong(songId);
  }
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
    const isPlaying = currentSongId == song.id && !audioPlayer.paused;
    li.innerHTML = `
      <div class="song-info">
        <span class="song-name">${song.name}</span>
        <span class="song-duration">${durationDisplay}</span>
      </div>
      <button class="play-btn" data-id="${song.id}">${isPlaying ? '⏸' : '▶'}</button>
    `;
    li.querySelector('.play-btn').addEventListener('click', (e) => {
      e.stopPropagation();
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
  const importBtn = document.getElementById('importBtn');
  const audioPicker = document.getElementById('audioPicker');
  importBtn.addEventListener('click', () => audioPicker.click());
  audioPicker.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      await handleImport(Array.from(e.target.files));
      e.target.value = '';
    }
  });

  // Resume audio when returning from background
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !audioPlayer.paused && currentSongId) {
      audioPlayer.play().catch(() => {});
    }
  });

  const songs = await loadSongs();
  renderLibrary(songs);
}

initApp();

