const CACHE_NAME = 'collector-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/public/js/app.js',
  '/manifest.json'
];

// Installation : Mise en cache locale de tous les fichiers nécessaires
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation : Nettoyage des anciens caches si nécessaire
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interception des requêtes : Réponse depuis le cache si hors-ligne
self.addEventListener('fetch', (event) => {
  // Ne pas intercepter les requêtes de l'API externe si vous en ajoutez plus tard
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
