// Stores canvas preview thumbnails as JPEG data URLs in localStorage, keyed by canvas id.
// A thumbnail made for the Gallery also remembers which version of the canvas (its updatedAt) it shows,
// so it can be made again when the canvas changed.

const PREFIX = "sketchspace-thumb:";
const VERSION_PREFIX = "sketchspace-thumb-version:";

export function saveThumbnail(canvasId: string, dataUrl: string, version?: string): void {
    try {
        localStorage.setItem(PREFIX + canvasId, dataUrl);
        if (version) localStorage.setItem(VERSION_PREFIX + canvasId, version);
        else localStorage.removeItem(VERSION_PREFIX + canvasId);
    } catch { /* storage blocked or full */ }
}

export function getThumbnail(canvasId: string): string | null {
    try { return localStorage.getItem(PREFIX + canvasId); } catch { return null; }
}

// the updatedAt the stored thumbnail was made for, null if unknown (made by the canvas page)
export function getThumbnailVersion(canvasId: string): string | null {
    try { return localStorage.getItem(VERSION_PREFIX + canvasId); } catch { return null; }
}
