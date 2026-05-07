// Placeholder service worker to prevent 404s for /firebase-messaging-sw.js
// Este projeto não usa Firebase; o arquivo evita requisições repetidas
// de service worker registradas anteriormente no navegador.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});

// Não manipula fetch, apenas existe para evitar 404s.
self.addEventListener('fetch', () => {});
