// Weblisk Service Worker — Offline Data Sync Engine
//
// This SW does NOT cache static files or compose pages.
// Static caching is handled by HTTP Cache-Control headers.
// Page composition is handled by export.js (pre-render) or server.js (dev).
//
// What this SW does (things ONLY a Service Worker can do):
//   1. Background Sync — replay queued mutations when connectivity returns
//   2. Push Notifications — receive server pushes even when app is closed
//   3. Offline fallback — serve a cached offline page when network is gone
//   4. Message relay — coordinate between tabs via SW as hub
//
// The app writes data to IndexedDB locally and queues mutations.
// When online, the SW syncs IDB ↔ server in the background.

const VERSION = 'weblisk-sw-v1';
const SYNC_DB = 'wl-sync-queue';
const SYNC_STORE = 'mutations';

// ─── Lifecycle ───────────────────────────────────────────────

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Fetch: Minimal — only intercept to provide offline fallback ─────

self.addEventListener('fetch', (event) => {
  // Only intercept navigation requests (HTML pages)
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request).catch(() =>
      // Network failed — serve cached offline page if available
      caches.match('/offline.html').then(cached =>
        cached || new Response(OFFLINE_HTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      )
    )
  );
});

// Inline offline fallback (no cache dependency — always available)
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline — Weblisk</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center;
           align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; color: #333; }
    .offline { text-align: center; padding: 2rem; }
    .offline h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .offline p { color: #666; margin-bottom: 1.5rem; }
    .offline button { padding: 0.75rem 1.5rem; border: none; border-radius: 8px;
                      background: #2563eb; color: white; font-size: 1rem; cursor: pointer; }
    .offline button:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="offline">
    <h1>You're offline</h1>
    <p>Your changes are saved locally and will sync when you're back online.</p>
    <button onclick="location.reload()">Try Again</button>
  </div>
</body>
</html>`;

// ─── Background Sync ─────────────────────────────────────────
// Fires when connectivity returns after a mutation was queued.
// Reads the mutation queue from IDB and replays each request.

self.addEventListener('sync', (event) => {
  if (event.tag.startsWith('wl-sync:')) {
    event.waitUntil(replayMutations(event.tag));
  }
});

// Periodic Background Sync — pull fresh data on a schedule
// (requires permission, currently Chromium-only)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'wl-periodic-refresh') {
    event.waitUntil(notifyClients({ type: 'periodic-sync' }));
  }
});

async function replayMutations(tag) {
  const db = await openIDB();
  const tx = db.transaction(SYNC_STORE, 'readonly');
  const store = tx.objectStore(SYNC_STORE);
  const index = store.index('tag');

  const items = await idbGetAll(index, tag);

  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method: item.method || 'POST',
        headers: item.headers || { 'Content-Type': 'application/json' },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      if (response.ok) {
        // Remove successfully synced mutation
        const delTx = db.transaction(SYNC_STORE, 'readwrite');
        delTx.objectStore(SYNC_STORE).delete(item.id);
        await idbTxComplete(delTx);

        // Notify app of successful sync
        await notifyClients({
          type: 'sync-success',
          tag,
          id: item.id,
          response: await response.json().catch(() => null),
        });
      } else if (response.status >= 500) {
        // Server error — keep in queue, will retry next sync
        break;
      } else {
        // Client error (4xx) — remove, won't succeed on retry
        const delTx = db.transaction(SYNC_STORE, 'readwrite');
        delTx.objectStore(SYNC_STORE).delete(item.id);
        await idbTxComplete(delTx);

        await notifyClients({
          type: 'sync-error',
          tag,
          id: item.id,
          status: response.status,
        });
      }
    } catch {
      // Network error — stop, will retry when online again
      break;
    }
  }
}

// ─── Push Notifications ──────────────────────────────────────
// Receives push events from server even when app is closed.

self.addEventListener('push', (event) => {
  let data = { title: 'Weblisk', body: 'New notification' };
  if (event.data) {
    try { data = event.data.json(); }
    catch { data.body = event.data.text(); }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    data: data.payload || {},
    actions: data.actions || [],
    tag: data.tag || 'wl-notification',
    renotify: !!data.renotify,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const action = event.action; // which action button was clicked

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if open
      for (const client of clients) {
        if (new URL(client.url).pathname === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      return self.clients.openWindow(targetUrl);
    }).then((client) => {
      // Notify the app which notification/action was clicked
      if (client) {
        client.postMessage({
          type: 'notification-click',
          action,
          data: event.notification.data,
        });
      }
    })
  );
});

// ─── Message Relay (Tab Coordination) ────────────────────────
// SW acts as a central hub for cross-tab messaging.
// Unlike BroadcastChannel, this works even when tabs are in
// different execution contexts (e.g., after a navigation).

self.addEventListener('message', (event) => {
  const msg = event.data;

  if (msg.type === 'relay') {
    // Broadcast to all other clients
    notifyClients(msg.payload, event.source?.id);
  }

  if (msg.type === 'skip-waiting') {
    self.skipWaiting();
  }
});

// ─── Helpers ─────────────────────────────────────────────────

async function notifyClients(data, excludeId) {
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    if (client.id !== excludeId) {
      client.postMessage(data);
    }
  }
}

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('wl-sync-queue', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        const store = db.createObjectStore(SYNC_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('tag', 'tag', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll(index, key) {
  return new Promise((resolve, reject) => {
    const req = index.getAll(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbTxComplete(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
