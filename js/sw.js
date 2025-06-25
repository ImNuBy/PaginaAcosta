// sw.js básico
self.addEventListener('install', function(event) {
    console.log('Service Worker instalado');
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activado');
});

self.addEventListener('fetch', function(event) {
    // Estrategia de cache básica
    event.respondWith(fetch(event.request));
});