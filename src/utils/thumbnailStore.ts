// Stores canvas preview thumbnails as JPEG data URLs in localStorage, keyed by canvas id.

const PREFIX = "sketchspace-thumb:";

export function saveThumbnail(canvasId: string, dataUrl: string): void {
    try { localStorage.setItem(PREFIX + canvasId, dataUrl); } catch { /* storage blocked or full */ }
}

export function getThumbnail(canvasId: string): string | null {
    try { return localStorage.getItem(PREFIX + canvasId); } catch { return null; }
}
