import { useSyncExternalStore } from 'react';

/**
 * Install and offline support. The browser fires `beforeinstallprompt` early (Chrome and Edge on Android,
 * Windows, macOS, Linux), so it is captured at start-up and offered later on the Downloads & help page.
 * Safari (iPhone, iPad, Mac) has no prompt: the page shows the Share → Add to Home Screen / Add to Dock steps.
 */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
export type Platform = 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'other';
export type Browser = 'safari' | 'chrome' | 'edge' | 'samsung' | 'firefox' | 'other';
export type InstallState = { canPrompt: boolean; installed: boolean; offlineReady: boolean; updateReady: boolean };

let deferred: InstallPromptEvent | null = null;
let state: InstallState = { canPrompt: false, installed: false, offlineReady: false, updateReady: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<InstallState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };

export const isStandalone = () => typeof window !== 'undefined' && (
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true);

export function detectPlatform(ua = navigator.userAgent, touch = navigator.maxTouchPoints || 0): Platform {
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touch > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/.test(ua)) return 'mac';
  if (/Linux|CrOS/.test(ua)) return 'linux';
  return 'other';
}
export function detectBrowser(ua = navigator.userAgent): Browser {
  if (/Edg\//.test(ua)) return 'edge';
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if (/Firefox|FxiOS/.test(ua)) return 'firefox';
  if (/CriOS|Chrome\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'other';
}

let registration: ServiceWorkerRegistration | null = null;

/** Call once at start-up. */
export function initInstall() {
  if (typeof window === 'undefined') return;
  set({ installed: isStandalone() });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallPromptEvent; set({ canPrompt: true }); });
  window.addEventListener('appinstalled', () => { deferred = null; set({ canPrompt: false, installed: true }); });
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (import.meta.env.PROD && secure && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        registration = reg;
        if (reg.active) set({ offlineReady: true });
        reg.addEventListener('updatefound', () => {
          const next = reg.installing;
          next?.addEventListener('statechange', () => {
            if (next.state === 'activated') set(navigator.serviceWorker.controller && state.offlineReady ? { updateReady: true } : { offlineReady: true });
          });
        });
      }).catch(() => { /* no offline support in this browser */ });
    });
  }
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const ev = deferred; deferred = null; set({ canPrompt: false });
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  if (outcome === 'accepted') set({ installed: true });
  return outcome;
}

/** Looks for a newer version; reloads into it when found. */
export async function checkForUpdate(): Promise<'updated' | 'current' | 'offline'> {
  if (!registration) return navigator.onLine ? 'current' : 'offline';
  try { await registration.update(); } catch { return 'offline'; }
  if (registration.installing || registration.waiting) { setTimeout(() => location.reload(), 1200); return 'updated'; }
  return 'current';
}

export const useInstallState = () => useSyncExternalStore(
  (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
  () => state,
  () => state,
);
