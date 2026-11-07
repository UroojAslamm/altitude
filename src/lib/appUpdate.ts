/**
 * The service worker serves the cached build first, so a returning browser would keep showing
 * the old app. Check for a new build on load and on return to the tab, and reload once it takes over.
 */
export function watchForAppUpdates() {
  if (!('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  // The first install also takes control of the page. That one needs no reload.
  const updating = Boolean(sw.controller);
  let reloading = false;
  sw.addEventListener('controllerchange', () => {
    if (!updating || reloading) return;
    reloading = true;
    window.location.reload();
  });
  const check = () => { void sw.getRegistration().then((r) => r?.update()).catch(() => undefined); };
  window.addEventListener('load', check);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
}
