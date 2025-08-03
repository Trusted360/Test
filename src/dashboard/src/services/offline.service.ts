// Offline Service - Manages offline functionality, caching, and synchronization
interface OfflineItem {
  id: string;
  type: 'checklist_update' | 'photo_upload' | 'comment' | 'status_change';
  data: any;
  timestamp: number;
  url: string;
  method: string;
  token?: string;
  retryCount: number;
  maxRetries: number;
}

interface OfflinePhoto {
  id: string;
  file: File;
  checklistId: string;
  itemId: string;
  timestamp: number;
  token?: string;
}

interface CachedData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
}

class OfflineService {
  private dbName = 'trusted360-offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private syncInProgress = false;
  private listeners: Set<(status: 'online' | 'offline') => void> = new Set();

  constructor() {
    this.initDB();
    this.registerServiceWorker();
    this.setupEventListeners();
  }

  // Initialize IndexedDB
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Pending updates store
        if (!db.objectStoreNames.contains('pendingUpdates')) {
          const updateStore = db.createObjectStore('pendingUpdates', { keyPath: 'id' });
          updateStore.createIndex('timestamp', 'timestamp');
          updateStore.createIndex('type', 'type');
        }

        // Pending photos store
        if (!db.objectStoreNames.contains('pendingPhotos')) {
          const photoStore = db.createObjectStore('pendingPhotos', { keyPath: 'id' });
          photoStore.createIndex('timestamp', 'timestamp');
        }

        // Cached data store
        if (!db.objectStoreNames.contains('offlineData')) {
          const dataStore = db.createObjectStore('offlineData', { keyPath: 'key' });
          dataStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  // Register service worker
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[Offline] Service Worker registered:', registration);

        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, prompt user to refresh
                this.notifyUpdate();
              }
            });
          }
        });
      } catch (error) {
        console.error('[Offline] Service Worker registration failed:', error);
      }
    }
  }

  // Setup online/offline event listeners
  private setupEventListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Check initial status
    if (navigator.onLine) {
      this.handleOnline();
    } else {
      this.handleOffline();
    }
  }

  private handleOnline(): void {
    console.log('[Offline] Connection restored');
    this.notifyListeners('online');
    this.syncPendingData();
  }

  private handleOffline(): void {
    console.log('[Offline] Connection lost');
    this.notifyListeners('offline');
  }

  // Add status change listener
  public addStatusListener(callback: (status: 'online' | 'offline') => void): void {
    this.listeners.add(callback);
  }

  // Remove status change listener
  public removeStatusListener(callback: (status: 'online' | 'offline') => void): void {
    this.listeners.delete(callback);
  }

  private notifyListeners(status: 'online' | 'offline'): void {
    this.listeners.forEach(callback => callback(status));
  }

  // Queue checklist update for offline sync
  public async queueChecklistUpdate(
    checklistId: string,
    itemId: string,
    data: any,
    url: string,
    method: string = 'POST'
  ): Promise<void> {
    if (!this.db) await this.initDB();

    const item: OfflineItem = {
      id: `${checklistId}-${itemId}-${Date.now()}`,
      type: 'checklist_update',
      data,
      timestamp: Date.now(),
      url,
      method,
      token: localStorage.getItem('token') || undefined,
      retryCount: 0,
      maxRetries: 3
    };

    const tx = this.db!.transaction(['pendingUpdates'], 'readwrite');
    const store = tx.objectStore('pendingUpdates');
    await store.add(item);

    console.log('[Offline] Queued checklist update:', item.id);

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncPendingData();
    }
  }

  // Queue photo upload for offline sync
  public async queuePhotoUpload(
    file: File,
    checklistId: string,
    itemId: string
  ): Promise<void> {
    if (!this.db) await this.initDB();

    const photo: OfflinePhoto = {
      id: `photo-${checklistId}-${itemId}-${Date.now()}`,
      file,
      checklistId,
      itemId,
      timestamp: Date.now(),
      token: localStorage.getItem('token') || undefined
    };

    const tx = this.db!.transaction(['pendingPhotos'], 'readwrite');
    const store = tx.objectStore('pendingPhotos');
    await store.add(photo);

    console.log('[Offline] Queued photo upload:', photo.id);

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncPendingData();
    }
  }

  // Cache data for offline access
  public async cacheData(key: string, data: any, expiresInHours?: number): Promise<void> {
    if (!this.db) await this.initDB();

    const cachedItem: CachedData = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: expiresInHours ? Date.now() + (expiresInHours * 60 * 60 * 1000) : undefined
    };

    const tx = this.db!.transaction(['offlineData'], 'readwrite');
    const store = tx.objectStore('offlineData');
    await store.put(cachedItem);

    console.log('[Offline] Cached data:', key);
  }

  // Get cached data
  public async getCachedData(key: string): Promise<any | null> {
    if (!this.db) await this.initDB();

    const tx = this.db!.transaction(['offlineData'], 'readonly');
    const store = tx.objectStore('offlineData');
    const result = await store.get(key);

    if (!result) return null;

    // Check if data has expired
    if (result.expiresAt && Date.now() > result.expiresAt) {
      this.removeCachedData(key);
      return null;
    }

    return result.data;
  }

  // Remove cached data
  public async removeCachedData(key: string): Promise<void> {
    if (!this.db) await this.initDB();

    const tx = this.db!.transaction(['offlineData'], 'readwrite');
    const store = tx.objectStore('offlineData');
    await store.delete(key);
  }

  // Sync all pending data
  public async syncPendingData(): Promise<void> {
    if (!navigator.onLine || this.syncInProgress) return;

    this.syncInProgress = true;
    console.log('[Offline] Starting sync...');

    try {
      await this.syncPendingUpdates();
      await this.syncPendingPhotos();
      console.log('[Offline] Sync completed');
    } catch (error) {
      console.error('[Offline] Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync pending updates
  private async syncPendingUpdates(): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(['pendingUpdates'], 'readwrite');
    const store = tx.objectStore('pendingUpdates');
    const updates = await store.getAll();

    for (const update of updates) {
      try {
        const response = await fetch(update.url, {
          method: update.method,
          headers: {
            'Content-Type': 'application/json',
            ...(update.token && { 'Authorization': `Bearer ${update.token}` })
          },
          body: JSON.stringify(update.data)
        });

        if (response.ok) {
          await store.delete(update.id);
          console.log('[Offline] Synced update:', update.id);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('[Offline] Failed to sync update:', update.id, error);
        
        // Increment retry count
        update.retryCount++;
        if (update.retryCount >= update.maxRetries) {
          // Remove failed update after max retries
          await store.delete(update.id);
          console.log('[Offline] Removed failed update after max retries:', update.id);
        } else {
          // Update retry count
          await store.put(update);
        }
      }
    }
  }

  // Sync pending photos
  private async syncPendingPhotos(): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(['pendingPhotos'], 'readwrite');
    const store = tx.objectStore('pendingPhotos');
    const photos = await store.getAll();

    for (const photo of photos) {
      try {
        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('checklist_id', photo.checklistId);
        formData.append('item_id', photo.itemId);

        const response = await fetch('/api/checklists/attachments', {
          method: 'POST',
          headers: {
            ...(photo.token && { 'Authorization': `Bearer ${photo.token}` })
          },
          body: formData
        });

        if (response.ok) {
          await store.delete(photo.id);
          console.log('[Offline] Synced photo:', photo.id);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('[Offline] Failed to sync photo:', photo.id, error);
      }
    }
  }

  // Get pending items count
  public async getPendingCount(): Promise<{ updates: number; photos: number }> {
    if (!this.db) await this.initDB();

    const tx = this.db!.transaction(['pendingUpdates', 'pendingPhotos'], 'readonly');
    
    const updatesStore = tx.objectStore('pendingUpdates');
    const photosStore = tx.objectStore('pendingPhotos');
    
    const updates = await updatesStore.count();
    const photos = await photosStore.count();

    return { updates, photos };
  }

  // Clear all offline data
  public async clearOfflineData(): Promise<void> {
    if (!this.db) await this.initDB();

    const tx = this.db!.transaction(['pendingUpdates', 'pendingPhotos', 'offlineData'], 'readwrite');
    
    await tx.objectStore('pendingUpdates').clear();
    await tx.objectStore('pendingPhotos').clear();
    await tx.objectStore('offlineData').clear();

    console.log('[Offline] Cleared all offline data');
  }

  // Check if online
  public isOnline(): boolean {
    return navigator.onLine;
  }

  // Notify about app updates
  private notifyUpdate(): void {
    // This could trigger a toast notification or modal
    // For now, just console log
    console.log('[Offline] New app version available');
    
    // You could dispatch a custom event here for the UI to catch
    window.dispatchEvent(new CustomEvent('appUpdateAvailable'));
  }

  // Request background sync (if supported)
  public async requestBackgroundSync(tag: string): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(tag);
        console.log('[Offline] Background sync requested:', tag);
      } catch (error) {
        console.error('[Offline] Background sync failed:', error);
      }
    }
  }
}

// Create singleton instance
const offlineService = new OfflineService();

export default offlineService;
export { OfflineService };