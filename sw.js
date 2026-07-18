const CACHE_NAME = 'pges-collector-cache-v1';

// 1. Liste de tous les fichiers essentiels de l'interface qui doivent fonctionner SANS réseau
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/public/js/app.js',
    '/manifest.json'
];

// Événement d'installation : On télécharge et on verrouille les fichiers dans l'appareil
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('PWA : Fichiers de l\'interface mis en cache pour le mode hors-ligne.');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Événement d'activation : Nettoyage des anciens caches si vous mettez à jour l'application
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('PWA : Nettoyage de l\'ancien cache.');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Événement d'interception (FETCH) : LE CŒUR DU MODE HORS-LIGNE
// Si l'appareil est déconnecté, le Service Worker bloque la requête réseau et donne le fichier local du cache
self.addEventListener('fetch', (event) => {
    // On ne gère pas les requêtes tierces ou d'API, uniquement nos fichiers d'interface
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Si le fichier est dans le cache, on le fournit instantanément (Même sans réseau !)
            if (cachedResponse) {
                return cachedResponse;
            }
            // Sinon, on tente de le récupérer sur internet
            return fetch(event.request).catch(() => {
                // Optionnel : Vous pourriez renvoyer vers une page d'erreur personnalisée ici
                console.error('PWA : Fichier introuvable hors-ligne et non présent dans le cache.');
            });
        })
    );
});
