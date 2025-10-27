// ===============================
// 忍者ポモドーロ v3.0
// - タブUI（タイマー / 設定）
// - level.mp3を休憩モード開始時に使用
// ===============================

const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const message = document.getElementById('message');
const focusIcon = document.getElementById('focus-icon');
const breakIcon = document.getElementById('break-icon');
const sessionsLeft = document.getElementById('sessions-left');
const timerDisplay = document.getElementById('timer-display');
const ring = document.querySelector('.ring-fg');
const bgVideo = document.getElementById('bg-video');

const CIRCUM = 2 * Math.PI * 168;
ring.style.strokeDasharray = CIRCUM;

// 設定ページの要素
const focusValue = document.getElementById('focus-value');
const shortValue = document.getElementById('short-value');
const longValue = document.getElementById('long-value');

// タブ
const tabTimer = document.getElementById('tab-timer');
const tabSettings = document.getElementById('tab-settings');
const timerPage = document.getElementById('timer-page');
const settingsPage = document.getElementById('settings-page');

let timer, timeLeft, totalPhaseSeconds;
let isRunning = false;
let paused = false;
let phase = "focus";
let sessionCount = 0;
let bgMusic = null;
let keepAliveChecker = null;

// 効果音
const soundStart = new Audio("audio/start.mp3");
const soundPause = new Audio("audio/stop.mp3");
const soundReset = new Audio("audio/reset.mp3");
const soundEnd = new Audio("audio/end.mp3");
const soundLevel = new Audio("audio/level.mp3");

// メディアセット
const mediaSet = Array.from({ length: 14 }, (_, i) => ({
  video: `movie/Movie${i + 1}.mov`,
  music: `audio/Music${i + 1}.mp3`
}));
const pick = () => mediaSet[Math.floor(Math.random() * mediaSet.length)];

// 表示更新
function updateDisplay(){
  const m = String(Math.floor(timeLeft/60)).padStart(2,"0");
  const s = String(timeLeft%60).padStart(2,"0");
  timerDisplay.textContent = `${m}:${s}`;
}
function updateRing(){
  const ratio = Math.max(0, Math.min(1, timeLeft / totalPhaseSeconds));
  ring.style.strokeDashoffset = CIRCUM * (1 - ratio);
}
function updateSessionsLeft(){ sessionsLeft.textContent = 4 - (sessionCount % 4); }

// 音楽再生
function playMusic(path){
  try{
    if(bgMusic && bgMusic.src.includes(path)){ if(bgMusic.paused) bgMusic.play(); return; }
    if(bgMusic) bgMusic.pause();
    bgMusic = new Audio(path); bgMusic.loop = true; bgMusic.volume = 0.35;
    bgMusic.play().catch(()=>{});
    clearInterval(keepAliveChecker);
    keepAliveChecker = setInterval(()=>{ if(bgMusic && bgMusic.paused && isRunning) bgMusic.play().catch(()=>{}); },5000);
  }catch(e){console.warn(e);}
}
function playMedia(media){
  bgVideo.classList.add("fadeout");
  setTimeout(()=>{
    bgVideo.muted = true; bgVideo.src = media.video; bgVideo.load();
    bgVideo.oncanplay = ()=>{
      bgVideo.play().then(()=>{ playMusic(media.music); bgVideo.classList.remove("fadeout"); });
    };
  },250);
}

// 色更新
function applyModeStyle(){
  const red = getComputedStyle(document.documentElement).getPropertyValue('--apple-red').trim();
  const green = getComputedStyle(document.documentElement).getPropertyValue('--sage-green').trim();
  if(phase==="focus"){ ring.style.stroke = red; focusIcon.style.borderColor = red; breakIcon.style.borderColor="transparent"; }
  else{ ring.style.stroke = green; breakIcon.style.borderColor = green; focusIcon.style.borderColor="transparent"; }
}

// タイマー制御
function startTimer(){
  soundStart.play().catch(()=>{});
  if(isRunning && !paused) return;

  const focusTime = parseInt(focusValue.textContent)*60;
  const shortBreak = parseInt(shortValue.textContent)*60;
  const longBreak = parseInt(longValue.textContent)*60;

  if(paused){ paused=false; isRunning=true; bgVideo.play(); if(bgMusic) bgMusic.play(); runTimer(focusTime, shortBreak, longBreak); return; }

  isRunning=true; paused=false;
  if(phase==="focus") totalPhaseSeconds=focusTime;
  else if(phase==="longBreak") totalPhaseSeconds=longBreak;
  else totalPhaseSeconds=shortBreak;
  timeLeft=totalPhaseSeconds;
  updateDisplay(); updateRing(); applyModeStyle();
  playMedia(pick());
  runTimer(focusTime, shortBreak, longBreak);
}

function pauseTimer(){
  if(!isRunning) return;
  clearInterval(timer); paused=true; isRunning=false;
  bgVideo.pause(); if(bgMusic) bgMusic.pause();
  soundPause.play().catch(()=>{});
}

function resetTimer(){
  clearInterval(timer);
  if(bgMusic){ bgMusic.pause(); bgMusic=null; }
  bgVideo.pause();
  isRunning=false; paused=false; phase="focus"; sessionCount=0; updateSessionsLeft();
  const focusTime = parseInt(focusValue.textContent)*60;
  totalPhaseSeconds=focusTime; timeLeft=focusTime;
  updateDisplay(); updateRing(); applyModeStyle();
  message.textContent="修行を始めよう💨";
  soundReset.play().catch(()=>{});
}

function runTimer(focusTime, shortBreak, longBreak){
  clearInterval(timer);
  timer=setInterval(()=>{
    timeLeft--; updateDisplay(); updateRing();
    if(timeLeft<=0){
      clearInterval(timer); isRunning=false;
      if(bgMusic){ bgMusic.pause(); bgMusic=null; }
      soundEnd.play();

      if(phase==="focus"){
        sessionCount++; updateSessionsLeft();
        phase=(sessionCount%4===0)?"longBreak":"shortBreak";
        totalPhaseSeconds=(phase==="longBreak")?longBreak:shortBreak;
        timeLeft=totalPhaseSeconds;
        message.textContent="休憩だ☕️";
        soundLevel.play().catch(()=>{}); // ← level.mp3 再生
      }else{
        phase="focus";
        totalPhaseSeconds=focusTime; timeLeft=focusTime;
        message.textContent="集中🔥";
      }
      applyModeStyle(); updateRing();
      setTimeout(()=>{ playMedia(pick()); startTimer(); },600);
    }
  },1000);
}

// 設定ページの＋−操作
document.querySelectorAll(".circle-setting").forEach(group=>{
  const plus=group.querySelector(".plus");
  const minus=group.querySelector(".minus");
  const value=group.querySelector(".circle-value");
  plus.addEventListener("click",()=>{ value.textContent=parseInt(value.textContent)+1; });
  minus.addEventListener("click",()=>{ const v=parseInt(value.textContent); if(v>1)value.textContent=v-1; });
});

// タブ切替
function switchTab(tab){
  if(tab==="timer"){ timerPage.classList.add("active"); settingsPage.classList.remove("active"); tabTimer.classList.add("active"); tabSettings.classList.remove("active"); }
  else{ timerPage.classList.remove("active"); settingsPage.classList.add("active"); tabTimer.classList.remove("active"); tabSettings.classList.add("active"); }
}
tabTimer.addEventListener("click",()=>switchTab("timer"));
tabSettings.addEventListener("click",()=>switchTab("settings"));

// 初期化
function init(){
  const focusTime=parseInt(focusValue.textContent)*60;
  totalPhaseSeconds=focusTime; timeLeft=focusTime;
  updateDisplay(); updateRing(); updateSessionsLeft(); applyModeStyle();
}
startBtn.addEventListener("click",startTimer);
pauseBtn.addEventListener("click",pauseTimer);
resetBtn.addEventListener("click",resetTimer);
init();
