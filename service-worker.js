// ===============================
// 忍者ポモドーロ Service Worker v1.5
// ===============================

const CACHE_NAME = "ninja-pomodoro-v1.5";

const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",

  // Icons
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/勉強.png",
  "./icons/休憩.png",
  "./icons/ninja-run.gif",
  "./icons/ctrl1.png",
  "./icons/ctrl2.png",
  "./icons/ctrl3.png",

  // Movies
  "./movie/Movie1.mp4",
  "./movie/Movie2.mp4",
  "./movie/Movie3.mp4",
  "./movie/Movie4.mp4",
  "./movie/Movie5.mp4",

  // Audios
  "./audio/Music1.mp3",
  "./audio/Music2.mp3",
  "./audio/Music3.mp3",
  "./audio/Music4.mp3",
  "./audio/Music5.mp3",

  // Sound Effects (optional)
  "./audio/start.mp3",
  "./audio/end.mp3"
];

// ===== Install =====
self.addEventListener("install", (event) => {
  console.log("🟢 [SW] Install event");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 [SW] Pre-caching assets...");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// ===== Activate =====
self.addEventListener("activate", (event) => {
  console.log("🟢 [SW] Activate event");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log(`🧹 [SW] Removing old cache: ${name}`);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ===== Fetch =====
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // キャッシュがあればそれを返す、なければネットワークから取得
      return (
        response ||
        fetch(event.request)
          .then((res) => {
            // 動画・音声はキャッシュしすぎると重いのでスキップ
            if (
              !event.request.url.endsWith(".mp4") &&
              !event.request.url.endsWith(".mp3")
            ) {
              const resClone = res.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, resClone);
              });
            }
            return res;
          })
          .catch(() => {
            // オフライン時のフォールバック（必要ならindex返す）
            if (event.request.mode === "navigate") {
              return caches.match("./index.html");
            }
          })
      );
    })
  );
});
