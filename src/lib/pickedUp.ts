/**
 * Orders the student has tapped I got it on, in this tab. The order page and the global
 * watcher both read it, so the Ready alert never shows twice while the server catches up.
 */
export const pickedUp = new Set<string>();
