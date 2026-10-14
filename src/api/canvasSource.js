// All requests to the Sketchspace server (REST). Every function returns a promise;
// if the server answers with an error, the promise rejects with an ApiError carrying its message.

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// an error from the server; status is the HTTP status (0 = the server could not be reached)
// hasServerMessage is true when the server explained the error itself ({ error: "..." });
// a 404 without it means the server has no such route at all
export class ApiError extends Error {
    constructor(message, status, hasServerMessage){
        super(message);
        // setting fields in a constructor is how a class instance is built
        this.status = status;
        this.hasServerMessage = hasServerMessage;
    }
}

// sends one request and returns the JSON answer
// credentials: "include" sends the login cookie to the server (another origin), which has to allow this origin
export function request(path, options){
    return fetch(API_URL + path, { credentials: "include", ...options }).then(gotResponseACB, networkErrorACB);

    function networkErrorACB(){
        throw new ApiError("Cannot reach the server, please check that it is running", 0, false);
    }

    function gotResponseACB(response){
        // the server sends { error: "..." } for errors it expects, but plain HTML for crashes
        return response.json().then(gotJsonACB, notJsonACB);

        function gotJsonACB(data){
            if (!response.ok) throw new ApiError(data.error || "Server error " + response.status, response.status, Boolean(data.error));
            return data;
        }
        function notJsonACB(){
            throw new ApiError("Server error " + response.status, response.status, false);
        }
    }
}

// options for a request that sends JSON
export function withJson(method, body){
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
// (The server does not link canvases to accounts yet, so this is only true in this browser.)

const TOKENS_KEY = "sketchspace-owner-tokens";       // guests; a logged-in user has "...:<user id>"
let tokenOwnerId = null;                             // the logged-in user's id, null for a guest

export function setTokenOwner(userId){ tokenOwnerId = userId; }
function tokensKey(){ return tokenOwnerId ? TOKENS_KEY + ":" + tokenOwnerId : TOKENS_KEY; }

function readTokens(){
    try {
        return JSON.parse(localStorage.getItem(tokensKey())) || {};
    } catch (error) {
        return {};      // storage blocked or unreadable: no tokens
    }
}
function writeTokens(tokens){
    try { localStorage.setItem(tokensKey(), JSON.stringify(tokens)); } catch (error) { /* storage blocked */ }
}

export function getOwnerToken(canvasId){ return readTokens()[canvasId] || null; }
export function isCanvasOwner(canvasId){ return getOwnerToken(canvasId) !== null; }
export function getOwnedCanvasIds(){ return Object.keys(readTokens()); }
function saveOwnerToken(canvasId, token){
    const tokens = readTokens();
    tokens[canvasId] = token;
    writeTokens(tokens);
}
export function forgetOwnerToken(canvasId){
    const tokens = readTokens();
    delete tokens[canvasId];
    writeTokens(tokens);
}

function canvasPath(canvasId){ return "/api/canvas/" + encodeURIComponent(canvasId); }

// a MongoDB id is 24 hex characters; a badly formed id is rejected here, with the server's error
function isValidCanvasId(canvasId){ return /^[0-9a-f]{24}$/i.test(canvasId); }
function requestForCanvas(canvasId, pathAfterId, options){
    if (!isValidCanvasId(canvasId)) return Promise.reject(new ApiError("Invalid canvas id", 400, true));
    const token = getOwnerToken(canvasId);
    const withToken = token ? { ...options, headers: { ...(options && options.headers), "X-Owner-Token": token } } : options;
    return request(canvasPath(canvasId) + pathAfterId, withToken);
}


// ========== Canvases ==========
// a canvas: { _id, name, isShared, createdAt, updatedAt, layers }; getCanvas adds isOwner (the caller owns it)

// shared canvases only
export function listCanvases(){
    return request("/api/canvas");
}

// the logged-in user's canvases, shared and private (rejects with 401 for a guest)
export function listMyCanvases(){
    return request("/api/canvas/mine");
}

export function getCanvas(canvasId){
    return requestForCanvas(canvasId, "");
}

// resolves to the new canvas id; the owner token the server returns is saved for later requests
// a canvas is private unless isShared is true
export function createCanvas({ name, isShared }){
    function saveTokenACB(data){
        saveOwnerToken(data.canvasId, data.ownerToken);
        return data.canvasId;
    }
    return request("/api/canvas", withJson("POST", { name: name, isShared: isShared })).then(saveTokenACB);
}

// attaches a canvas made with an owner token to the logged-in account; the token (sent automatically) proves it is theirs
export function claimCanvas(canvasId){
    return requestForCanvas(canvasId, "/claim", { method: "POST" });
}

// changes: { name?, isShared? }, at least one; owner only (the server answers 403 otherwise)
export function updateCanvas(canvasId, changes){
    return requestForCanvas(canvasId, "", withJson("PUT", changes));
}

// owner only; the saved token is dropped once the canvas is gone
export function deleteCanvas(canvasId){
    function forgetACB(data){
        forgetOwnerToken(canvasId);
        return data;
    }
    return requestForCanvas(canvasId, "", { method: "DELETE" }).then(forgetACB);
}


// ========== Strokes ==========
// a stroke: { canvasId, layerId, path: [{ x, y }], brush, size, color, opacity }

// all strokes of a canvas, oldest first (each also has _id and createdAt)
export function listStrokes(canvasId){
    return requestForCanvas(canvasId, "/strokes");
}

// resolves to the new stroke id; the canvas id goes in the URL, not the body
export function addStroke(canvasId, stroke){
    const body = {
        layerId: stroke.layerId,
        path: stroke.path,
        brush: stroke.brush,
        size: stroke.size,
        color: stroke.color,
        opacity: stroke.opacity,
    };
    function getIdACB(data){ return data.strokeId; }
    return requestForCanvas(canvasId, "/strokes", withJson("POST", body)).then(getIdACB);
}

// removes every stroke of the canvas (owner only), resolves to the number removed
export function clearStrokes(canvasId){
    function getRemovedACB(data){ return data.removed; }
    return requestForCanvas(canvasId, "/strokes", { method: "DELETE" }).then(getRemovedACB);
}

// DELETE /api/canvas/:canvasId/strokes/:strokeId
export function deleteStroke(canvasId, strokeId){
    return requestForCanvas(canvasId, "/strokes/" + encodeURIComponent(strokeId), { method: "DELETE" });
}


// ========== Elements (photos, shapes, cutouts) ==========
// an element: { id, type, x, y, width, height, rotation, zIndex, ...fields of its type } (see utils/elementFields.js)

// all elements of a canvas, oldest first
export function listElements(canvasId){
    return requestForCanvas(canvasId, "/elements");
}

// resolves to the new element id; the canvas id goes in the URL, not the body
export function addElement(canvasId, element){
    function getIdACB(data){ return data.elementId; }
    return requestForCanvas(canvasId, "/elements", withJson("POST", element)).then(getIdACB);
}

// changes: the changed fields only, at least one
export function updateElement(canvasId, elementId, changes){
    return requestForCanvas(canvasId, "/elements/" + encodeURIComponent(elementId), withJson("PUT", changes));
}

export function deleteElement(canvasId, elementId){
    return requestForCanvas(canvasId, "/elements/" + encodeURIComponent(elementId), { method: "DELETE" });
}
