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
function request(path, options){
    return fetch(API_URL + path, options).then(gotResponseACB, networkErrorACB);

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
function withJson(method, body){
    return {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}

// ========== Owner tokens ==========
// POST /api/canvas returns an ownerToken once (the server keeps only its hash), so it is saved in this
// browser, per canvas. It goes in the X-Owner-Token header of every request for that canvas: the server
// needs it for private canvases and for changing or deleting any canvas.

const TOKENS_KEY = "sketchspace-owner-tokens";

function readTokens(){
    try {
        return JSON.parse(localStorage.getItem(TOKENS_KEY)) || {};
    } catch (error) {
        return {};      // storage blocked or holding something unreadable: act as if there are no tokens
    }
}
function writeTokens(tokens){
    try { localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens)); } catch (error) { /* storage blocked */ }
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

// same rule as the server (a MongoDB id: 24 hex characters); a badly formed id is rejected
// here without a request, with the same error the server would send
function isValidCanvasId(canvasId){ return /^[0-9a-f]{24}$/i.test(canvasId); }
function requestForCanvas(canvasId, pathAfterId, options){
    if (!isValidCanvasId(canvasId)) return Promise.reject(new ApiError("Invalid canvas id", 400, true));
    const token = getOwnerToken(canvasId);
    const withToken = token ? { ...options, headers: { ...(options && options.headers), "X-Owner-Token": token } } : options;
    return request(canvasPath(canvasId) + pathAfterId, withToken);
}


// ========== Canvases ==========
// a canvas: { _id, name, isShared, createdAt, updatedAt, layers }

// the shared canvases only: the server never lists private ones
export function listCanvases(){
    return request("/api/canvas");
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
// Note: the server does not have this route yet, so for now it answers 404 (see removeStroke in the model)
export function deleteStroke(canvasId, strokeId){
    return requestForCanvas(canvasId, "/strokes/" + encodeURIComponent(strokeId), { method: "DELETE" });
}
