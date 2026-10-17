import type { Canvas, CanvasChanges, ElementChanges, ElementServerFields, NewStroke, ServerElement, ServerStroke } from "/src/model/types.ts";

// All requests to the Sketchspace server (REST). Every function returns a promise;
// if the server answers with an error, the promise rejects with an ApiError carrying its message.

// The server's address comes from .env.development / .env.production (VITE_API_URL) and is read only here.
// It is built into the app when it is built, so it has to be set before `npm run build`.
export const API_URL: string = import.meta.env.VITE_API_URL ?? "";

// an error from the server; status is the HTTP status (0 = the server could not be reached)
// hasServerMessage is true when the server explained the error itself ({ error: "..." });
// a 404 without it means the server has no such route at all
export class ApiError extends Error {
    status: number;
    hasServerMessage: boolean;

    constructor(message: string, status: number, hasServerMessage: boolean){
        super(message);
        // setting fields in a constructor is how a class instance is built
        this.status = status;
        this.hasServerMessage = hasServerMessage;
    }
}

interface OkResponse {
    ok: boolean;
}

// ========== Login token ==========
// The app and the server can be on different sites (GitHub Pages and the server's own address), and browsers do not
// send a cookie between sites. So the login token that register and login return is kept here and sent as
// "Authorization: Bearer <token>" with every request, and with the socket connection.

const LOGIN_TOKEN_KEY = "sketchspace_token";

export function getLoginToken(): string | null {
    try { return localStorage.getItem(LOGIN_TOKEN_KEY); } catch (error) { return null; }      // storage blocked: not logged in
}
// null forgets it (logging out)
export function setLoginToken(token: string | null): void {
    try {
        if (token) localStorage.setItem(LOGIN_TOKEN_KEY, token);
        else localStorage.removeItem(LOGIN_TOKEN_KEY);
    } catch (error) { /* storage blocked */ }
}

// sends one request and returns the JSON answer
// T is the shape the server documents for this request: JSON has no types at runtime, so it is trusted, not checked
export function request<T>(path: string, options?: RequestInit): Promise<T> {
    if (!API_URL) return Promise.reject(new ApiError("The server address is not set (VITE_API_URL)", 0, false));
    const headers = new Headers(options?.headers);
    const loginToken = getLoginToken();
    if (loginToken && !headers.has("Authorization")) headers.set("Authorization", "Bearer " + loginToken);
    return fetch(API_URL + path, { ...options, headers: headers }).then(gotResponseACB, networkErrorACB);

    function networkErrorACB(): never {
        throw new ApiError("Cannot reach the server, please check that it is running", 0, false);
    }

    function gotResponseACB(response: Response): Promise<T> {
        // the server sends { error: "..." } for errors it expects, but plain HTML for crashes
        return response.json().then(gotJsonACB, notJsonACB);

        function gotJsonACB(data: T & { error?: string }): T {
            if (!response.ok) throw new ApiError(data.error || "Server error " + response.status, response.status, Boolean(data.error));
            return data;
        }
        function notJsonACB(): never {
            throw new ApiError("Server error " + response.status, response.status, false);
        }
    }
}

// options for a request that sends JSON
export function withJson(method: string, body: unknown): RequestInit {
    return {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}

// ========== Owner tokens ==========
// POST /api/canvas returns the ownerToken once, so it is kept per canvas in this browser
// and sent as X-Owner-Token on every request for that canvas.
// Tokens are kept per user, so accounts that share a browser do not see each other's canvases.

type OwnerTokens = Record<string, string>;      // canvas id -> owner token

const TOKENS_KEY = "sketchspace-owner-tokens";       // guests; a logged-in user has "...:<user id>"

// Who is logged in decides which tokens are used. It changes when someone logs in or out, and every
// request reads it, so it has to be kept here as changeable module state (a const object with a mutable field).
const tokenOwner: { userId: string | null } = { userId: null };      // null for a guest

export function setTokenOwner(userId: string | null): void { tokenOwner.userId = userId; }
function tokensKey(): string { return tokenOwner.userId ? TOKENS_KEY + ":" + tokenOwner.userId : TOKENS_KEY; }

// what localStorage holds was written by this app, but it is checked before it is used
function isOwnerTokens(value: unknown): value is OwnerTokens {
    function isTextCB(entry: unknown): boolean { return typeof entry === "string"; }
    return typeof value === "object" && value !== null && Object.values(value).every(isTextCB);
}

function readTokens(): OwnerTokens {
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(tokensKey()) || "{}");
        return isOwnerTokens(stored) ? stored : {};
    } catch (error) {
        return {};      // storage blocked or unreadable: no tokens
    }
}
function writeTokens(tokens: OwnerTokens): void {
    try { localStorage.setItem(tokensKey(), JSON.stringify(tokens)); } catch (error) { /* storage blocked */ }
}

export function getOwnerToken(canvasId: string): string | null { return readTokens()[canvasId] || null; }
export function isCanvasOwner(canvasId: string): boolean { return getOwnerToken(canvasId) !== null; }
export function getOwnedCanvasIds(): string[] { return Object.keys(readTokens()); }
function saveOwnerToken(canvasId: string, token: string): void {
    writeTokens({ ...readTokens(), [canvasId]: token });
}
export function forgetOwnerToken(canvasId: string): void {
    function isOtherCanvasCB(entry: [string, string]): boolean { return entry[0] !== canvasId; }
    writeTokens(Object.fromEntries(Object.entries(readTokens()).filter(isOtherCanvasCB)));
}

function canvasPath(canvasId: string): string { return "/api/canvas/" + encodeURIComponent(canvasId); }

// a MongoDB id is 24 hex characters; a badly formed id is rejected here, with the server's error
function isValidCanvasId(canvasId: string): boolean { return /^[0-9a-f]{24}$/i.test(canvasId); }
function requestForCanvas<T>(canvasId: string, pathAfterId: string, options?: RequestInit): Promise<T> {
    if (!isValidCanvasId(canvasId)) return Promise.reject(new ApiError("Invalid canvas id", 400, true));
    const token = getOwnerToken(canvasId);
    const withToken = token ? { ...options, headers: { ...options?.headers, "X-Owner-Token": token } } : options;
    return request<T>(canvasPath(canvasId) + pathAfterId, withToken);
}


// ========== Canvases ==========

// shared canvases only
export function listCanvases(): Promise<Canvas[]> {
    return request<Canvas[]>("/api/canvas");
}

// the logged-in user's canvases, shared and private (rejects with 401 for a guest)
export function listMyCanvases(): Promise<Canvas[]> {
    return request<Canvas[]>("/api/canvas/mine");
}

// also says whether the caller owns it (isOwner)
export function getCanvas(canvasId: string): Promise<Canvas> {
    return requestForCanvas<Canvas>(canvasId, "");
}

interface NewCanvas {
    name: string;
    isShared?: boolean;
}

interface CreatedCanvas {
    canvasId: string;
    ownerToken: string;
}

// resolves to the new canvas id; the owner token the server returns is saved for later requests
// a canvas is private unless isShared is true
export function createCanvas({ name, isShared }: NewCanvas): Promise<string> {
    function saveTokenACB(data: CreatedCanvas): string {
        saveOwnerToken(data.canvasId, data.ownerToken);
        return data.canvasId;
    }
    return request<CreatedCanvas>("/api/canvas", withJson("POST", { name: name, isShared: isShared })).then(saveTokenACB);
}

// attaches a canvas made with an owner token to the logged-in account; the token (sent automatically) proves it is theirs
export function claimCanvas(canvasId: string): Promise<OkResponse> {
    return requestForCanvas<OkResponse>(canvasId, "/claim", { method: "POST" });
}

// moves the canvas into one of the account's folders, or out of any folder with null
// (logged-in owner only; a canvas held only by an owner token must be claimed first, otherwise 403)
export function setCanvasFolder(canvasId: string, folderId: string | null): Promise<OkResponse> {
    return requestForCanvas<OkResponse>(canvasId, "/folder", withJson("PUT", { folderId: folderId }));
}

// at least one change; owner only (the server answers 403 otherwise)
export function updateCanvas(canvasId: string, changes: CanvasChanges): Promise<OkResponse> {
    return requestForCanvas<OkResponse>(canvasId, "", withJson("PUT", changes));
}

// owner only; the saved token is dropped once the canvas is gone
export function deleteCanvas(canvasId: string): Promise<OkResponse> {
    function forgetACB(data: OkResponse): OkResponse {
        forgetOwnerToken(canvasId);
        return data;
    }
    return requestForCanvas<OkResponse>(canvasId, "", { method: "DELETE" }).then(forgetACB);
}


// ========== Strokes ==========

// all strokes of a canvas, oldest first
export function listStrokes(canvasId: string): Promise<ServerStroke[]> {
    return requestForCanvas<ServerStroke[]>(canvasId, "/strokes");
}

// resolves to the new stroke id; the canvas id goes in the URL, not the body
export function addStroke(canvasId: string, stroke: NewStroke): Promise<string> {
    const body = {
        layerId: stroke.layerId,
        path: stroke.path,
        brush: stroke.brush,
        size: stroke.size,
        color: stroke.color,
        opacity: stroke.opacity,
    };
    function getIdACB(data: { strokeId: string }): string { return data.strokeId; }
    return requestForCanvas<{ strokeId: string }>(canvasId, "/strokes", withJson("POST", body)).then(getIdACB);
}

// removes every stroke of the canvas (owner only), resolves to the number removed
export function clearStrokes(canvasId: string): Promise<number> {
    function getRemovedACB(data: { removed: number }): number { return data.removed; }
    return requestForCanvas<{ removed: number }>(canvasId, "/strokes", { method: "DELETE" }).then(getRemovedACB);
}

// DELETE /api/canvas/:canvasId/strokes/:strokeId
export function deleteStroke(canvasId: string, strokeId: string): Promise<OkResponse> {
    return requestForCanvas<OkResponse>(canvasId, "/strokes/" + encodeURIComponent(strokeId), { method: "DELETE" });
}


// ========== Elements (photos, shapes, cutouts) ==========
// (see utils/elementFields.ts for the fields of each kind)

// all elements of a canvas, oldest first
export function listElements(canvasId: string): Promise<ServerElement[]> {
    return requestForCanvas<ServerElement[]>(canvasId, "/elements");
}

// resolves to the new element id; the canvas id goes in the URL, not the body
export function addElement(canvasId: string, element: ElementServerFields): Promise<string> {
    function getIdACB(data: { elementId: string }): string { return data.elementId; }
    return requestForCanvas<{ elementId: string }>(canvasId, "/elements", withJson("POST", element)).then(getIdACB);
}

// changes: the changed fields only, at least one
export function updateElement(canvasId: string, elementId: string, changes: ElementChanges): Promise<OkResponse> {
    return requestForCanvas<OkResponse>(canvasId, "/elements/" + encodeURIComponent(elementId), withJson("PUT", changes));
}

export function deleteElement(canvasId: string, elementId: string): Promise<OkResponse> {
    return requestForCanvas<OkResponse>(canvasId, "/elements/" + encodeURIComponent(elementId), { method: "DELETE" });
}
