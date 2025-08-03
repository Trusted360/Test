const CACHE_NAME = 'trusted360-v1';
const OFFLINE_URL = '/offline.html';

// Critical resources that should always be cached
const CRITICAL_CACHE_URLS = [
  '/',
  '/offline.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// API endpoints that should be cached for offline access
const API_CACHE_PATTERNS = [
  /\/api\/properties/,
  /\/api\/checklists/,
  /\/api\/templates/,
  /\/api\/users\/profile/
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching critical resources');
        return cache.addAll(CRITICAL_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different resource types with appropriate strategies
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network first, cache fallback
    event.respondWith(networkFirstStrategy(request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
    // Static assets - Cache first
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // HTML pages - Network first with offline fallback
    event.respondWith(htmlNetworkFirstStrategy(request));
  }
});

// Network first strategy for API calls
async function networkFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      // Only cache GET requests for specific API patterns
      const shouldCache = API_CACHE_PATTERNS.some(pattern => 
        pattern.test(request.url)
      );
      
      if (shouldCache) {
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    
    // Try cache as fallback
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API calls
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'This data is not available offline'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache first strategy for static assets
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch asset:', error);
    throw error;
  }
}

// HTML network first strategy with offline page fallback
async function htmlNetworkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for HTML, trying cache');
    
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page as last resort
    return cache.match(OFFLINE_URL);
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'checklist-sync') {
    event.waitUntil(syncChecklists());
  } else if (event.tag === 'photo-upload') {
    event.waitUntil(syncPhotos());
  }
});

// Sync queued checklist updates
async function syncChecklists() {
  try {
    const db = await openDB();
    const tx = db.transaction(['pendingUpdates'], 'readwrite');
    const store = tx.objectStore('pendingUpdates');
    const pendingUpdates = await store.getAll();
    
    for (const update of pendingUpdates) {
      try {
        const response = await fetch(update.url, {
          method: update.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${update.token}`
          },
          body: JSON.stringify(update.data)
        });
        
        if (response.ok) {
          await store.delete(update.id);
          console.log('[SW] Synced update:', update.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync update:', update.id, error);
      }
    }
    
    await tx.complete;
  } catch (error) {
    console.log('[SW] Sync failed:', error);
  }
}

// Sync queued photo uploads
async function syncPhotos() {
  try {
    const db = await openDB();
    const tx = db.transaction(['pendingPhotos'], 'readwrite');
    const store = tx.objectStore('pendingPhotos');
    const pendingPhotos = await store.getAll();
    
    for (const photo of pendingPhotos) {
      try {
        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('checklist_id', photo.checklistId);
        formData.append('item_id', photo.itemId);
        
        const response = await fetch('/api/checklists/attachments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${photo.token}`
          },
          body: formData
        });
        
        if (response.ok) {
          await store.delete(photo.id);
          console.log('[SW] Synced photo:', photo.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync photo:', photo.id, error);
      }
    }
    
    await tx.complete;
  } catch (error) {
    console.log('[SW] Photo sync failed:', error);
  }
}

// Simple IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('trusted360-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pendingUpdates')) {
        const updateStore = db.createObjectStore('pendingUpdates', { keyPath: 'id' });
        updateStore.createIndex('timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains('pendingPhotos')) {
        const photoStore = db.createObjectStore('pendingPhotos', { keyPath: 'id' });
        photoStore.createIndex('timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains('offlineData')) {
        const dataStore = db.createObjectStore('offlineData', { keyPath: 'key' });
      }
    };
  });
}

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: 'You have new updates available',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Updates',
        icon: '/images/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/images/xmark.png'
      }
    ]
  };
  
  if (event.data) {
    const payload = event.data.json();
    options.body = payload.body || options.body;
    options.title = payload.title || 'Trusted 360';
  }
  
  event.waitUntil(
    self.registration.showNotification('Trusted 360', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received.');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});