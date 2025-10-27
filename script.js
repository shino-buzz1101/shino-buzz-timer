// ===============================
// 忍者ポモドーロ script.js v2.4.4（効果音差し替え）
// - start:  start.mp3
// - pause:  stop.mp3     ← 変更
// - reset:  reset.mp3    ← 変更
// - end:    end.mp3
// - 他仕様はv2.4.3と同じ（配色・進捗リング・MOV/MP3 1..14）
// ===============================

const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');

const timerDisplay = document.getElementById('timer-display');
const message = document.getElementById('message');

const focusInput = document.getElementById('focus-time');
const shortBreakInput = document.getElementById('short-break');
const longBreakInput = document.getElementById('long-break');

const focusIcon = document.getElementById('focus-icon');
const breakIcon = document.getElementById('break-icon');
const sessionsLeft = document.getElementById('sessions-left');

const bgVideo = document.getElementById('bg-video');
const ring = document.querySelector('.ring-fg');
const CIRCUM = 2 * Math.PI * 168; // r=168
ring.style.strokeDasharray = CIRCUM;

let timer, timeLeft, totalPhaseSeconds;
let isRunning = false;
let paused = false;
let phase = "focus"; // "focus" | "shortBreak" | "longBreak"
let sessionCount = 0;
let bgMusic = null;
let keepAliveChecker = null;

// 効果音
const soundStart = new Audio("audio/start.mp3");   // ▶️開始/再開
const soundPause = new Audio("audio/stop.mp3");    // ⏸一時停止 ←変更
const soundReset = new Audio("audio/reset.mp3");   // 🔁リセット ←変更
const soundEnd   = new Audio("audio/end.mp3");     // ⏱フェーズ完了

// メディアセット（Movie1.mov〜Movie14.mov / Music1.mp3〜Music14.mp3）
const mediaSet = Array.from({ length: 14 }, (_, i) => ({
  video: `movie/Movie${i + 1}.mov`,
  music: `audio/Music${i + 1}.mp3`
}));
const pick = () => mediaSet[Math.floor(Math.random() * mediaSet.length)];

// ====== 表示更新 ======
function updateDisplay() {
  const m = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const s = String(timeLeft % 60).padStart(2, "0");
  timerDisplay.textContent = `${m}:${s}`;
}
function updateIcons() {
  if (phase === "focus") { focusIcon.classList.add("active"); breakIcon.classList.remove("active"); }
  else { breakIcon.classList.add("active"); focusIcon.classList.remove("active"); }
}
function updateSessionsLeft() { sessionsLeft.textContent = 4 - (sessionCount % 4); }
function updateRing() {
  const ratio = Math.max(0, Math.min(1, timeLeft / totalPhaseSeconds));
  ring.style.strokeDashoffset = CIRCUM * (1 - ratio);
}

// ====== モードに応じた色適用 ======
function applyModeStyle() {
  const APPLE_RED = getComputedStyle(document.documentElement).getPropertyValue('--apple-red').trim() || '#ff3b30';
  const SAGE_GREEN = getComputedStyle(document.documentElement).getPropertyValue('--sage-green').trim() || '#7ba67b';
  if (phase === 'focus') {
    ring.style.stroke = APPLE_RED;
    focusIcon.style.borderColor = APPLE_RED;
    breakIcon.style.borderColor = 'transparent';
  } else {
    ring.style.stroke = SAGE_GREEN;
    breakIcon.style.borderColor = SAGE_GREEN;
    focusIcon.style.borderColor = 'transparent';
  }
}

// ====== メディア制御 ======
function playMusic(path) {
  try {
    if (bgMusic && bgMusic.src.includes(path)) {
      if (bgMusic.paused) bgMusic.play().catch(()=>{});
      return;
    }
    if (bgMusic) bgMusic.pause();
    bgMusic = new Audio(path);
    bgMusic.loop = true;
    bgMusic.volume = 0.35;
    const p = bgMusic.play();
    if (p && p.catch) p.catch(()=>{});
    clearInterval(keepAliveChecker);
    keepAliveChecker = setInterval(() => {
      if (bgMusic && bgMusic.paused && isRunning) bgMusic.play().catch(()=>{});
    }, 5000);
  } catch(e) { console.warn("music error:", e); }
}

function playMedia(media) {
  // 映像フェード＆音フェード
  bgVideo.classList.add("fadeout");
  if (bgMusic) { let v = bgMusic.volume; const id = setInterval(() => {
    v -= 0.03; if (v <= 0.05) { clearInterval(id); bgMusic.pause(); } else bgMusic.volume = v;
  }, 80); }

  setTimeout(() => {
    try {
      bgVideo.setAttribute('playsinline','');
      bgVideo.setAttribute('webkit-playsinline','');
      bgVideo.muted = true;                 // MOVの内蔵音声は使わない
      bgVideo.preload = "metadata";
      bgVideo.src = media.video;
      bgVideo.load();

      bgVideo.oncanplay = () => {
        bgVideo.play().then(()=>{
          playMusic(media.music);           // 映像再生開始後にBGM開始
          bgVideo.classList.remove("fadeout");
        }).catch(()=>{
          setTimeout(()=>bgVideo.play().catch(()=>{}), 300);
        });
      };
      bgVideo.onerror = () => {
        console.warn("video error, retry another");
        const alt = pick();
        if (alt.video !== media.video) playMedia(alt);
      };
    } catch(e) {
      console.warn("video set error:", e);
    }
  }, 250);
}

// ====== タイマー ======
function startTimer() {
  soundStart.play().catch(()=>{});
  if (isRunning && !paused) return;

  const focusTime = parseInt(focusInput.value) * 60;
  const shortBreak = parseInt(shortBreakInput.value) * 60;
  const longBreak = parseInt(longBreakInput.value) * 60;

  if (paused) {
    paused = false; isRunning = true;
    bgVideo.play().catch(()=>{});
    if (bgMusic) bgMusic.play().catch(()=>{});
    runTimer(focusTime, shortBreak, longBreak);
    return;
  }

  isRunning = true; paused = false;

  if (phase === "focus")          totalPhaseSeconds = focusTime;
  else if (phase === "longBreak") totalPhaseSeconds = longBreak;
  else                            totalPhaseSeconds = shortBreak;

  timeLeft = totalPhaseSeconds;
  updateDisplay(); updateRing(); applyModeStyle();

  // ユーザー操作直後にメディア開始
  playMedia(pick());

  runTimer(focusTime, shortBreak, longBreak);
}

function pauseTimer() {
  if (!isRunning) return;
  clearInterval(timer);
  paused = true; isRunning = false;
  bgVideo.pause();
  if (bgMusic) bgMusic.pause();
  soundPause.play().catch(()=>{});     // ← stop.mp3 を再生
}

function resetTimer() {
  clearInterval(timer);
  if (bgMusic) { bgMusic.pause(); bgMusic = null; }
  bgVideo.pause();

  isRunning = false; paused = false; phase = "focus";
  sessionCount = 0; updateSessionsLeft();

  const focusTime = parseInt(focusInput.value) * 60;
  totalPhaseSeconds = focusTime; timeLeft = focusTime;
  updateDisplay(); updateRing(); updateIcons(); applyModeStyle();

  message.textContent = "修行を始めよう💨";
  soundReset.play().catch(()=>{});     // ← reset.mp3 を再生
}

function runTimer(focusTime, shortBreak, longBreak) {
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--; updateDisplay(); updateRing();

    if (timeLeft <= 0) {
      clearInterval(timer);
      isRunning = false;
      if (bgMusic) { bgMusic.pause(); bgMusic = null; }
      soundEnd.play();

      if (phase === "focus") {
        sessionCount++; updateSessionsLeft();
        phase = (sessionCount % 4 === 0) ? "longBreak" : "shortBreak";
        totalPhaseSeconds = (phase === "longBreak") ? longBreak : shortBreak;
        timeLeft = totalPhaseSeconds;
        message.textContent = "休憩だ☕️";
      } else {
        phase = "focus";
        totalPhaseSeconds = focusTime;
        timeLeft = totalPhaseSeconds;
        message.textContent = "集中🔥";
      }
      updateIcons(); applyModeStyle(); updateRing();

      setTimeout(() => {
        playMedia(pick());
        startTimer();
      }, 600);
    }
  }, 1000);
}

// ====== 初期化 ======
function init() {
  const focusTime = parseInt(focusInput.value) * 60;
  totalPhaseSeconds = focusTime;
  timeLeft = focusTime;
  updateDisplay(); updateRing(); updateIcons(); updateSessionsLeft(); applyModeStyle();

  bgVideo.setAttribute('playsinline','');
  bgVideo.setAttribute('webkit-playsinline','');
  bgVideo.muted = true;                      // 自動再生はユーザー操作後に
}
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);
init();
