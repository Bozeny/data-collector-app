const CACHE_NAME = 'pges-collector-cache-v2';

// 1. Liste de tous les fichiers essentiels de l'interface qui doivent fonctionner SANS réseau
 const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/public/app.js', // Doit être strictement identique au src de votre index.html
    '/manifest.json'
];

];

// Événement d'installation : On télécharge et on verrouille les fichiers dans l'appareil
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('PWA : Fichiers de l\'interface mis en cache pour le mode hors-ligne.');
            // Sécurité : .addAll peut échouer complètement si un seul fichier renvoie une erreur 404
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.error('PWA Erreur : Impossible de mettre en cache les assets. Vérifiez les chemins.', err);
            });
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

// Événement d'interception (FETCH) : Mode Hors-ligne + Mise à jour en tâche de fond
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // Optionnel : Ne pas intercepter les requêtes vers vos API de données ou extensions Chrome
    if (event.request.url.includes('/api/') || !event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // On lance la requête réseau en tâche de fond
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Si la réponse est valide, on met à jour le cache
                if (networkResponse && networkResponse.status === 200) {
                    const cacheCopy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, cacheCopy);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Erreur réseau silencieuse (on est hors-ligne)
            });

            // On renvoie le fichier du cache s'il existe, sinon on attend le réseau
            return cachedResponse || fetchPromise;
        })
    );
});