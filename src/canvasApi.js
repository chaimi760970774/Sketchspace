import { io } from "socket.io-client";

const API = import.meta.env.VITE_API_URL;

// ========== REST ==========

async function request(path, options){
    const response = await fetch(API + path, options);
    if (!response.ok) throw new Error("API error " + response.status);
    return response.json();
}

function jsonOptions(method, body){
    return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

// -> { canvasId }
export function createCanvas(name, isShared){ return request("/api/canvas", jsonOptions("POST", { name, isShared })); }
// -> [{ _id, name, isShared, createdAt, updatedAt }]
export function listCanvases(){ return request("/api/canvas"); }
export function getCanvas(id){ return request("/api/canvas/" + id); }
// body: { name } and/or { isShared } -> { ok: true }
export function updateCanvas(id, body){ return request("/api/canvas/" + id, jsonOptions("PUT", body)); }
export function deleteCanvas(id){ return request("/api/canvas/" + id, { method: "DELETE" }); }


// ========== Real time ==========

let socket = null;

function getSocket(){
    if (!socket) socket = io(API);
    return socket;
}

// Joins a canvas and wires the callbacks. Returns a function that disconnects again.
// onJoined(strokes) runs on every (re)join, so strokes missed during a disconnect are restored.
export function joinCanvas(canvasId, { onJoined, onStroke, onPeers, onError }){
    const s = getSocket();

    function joinACB(){
        s.emit("canvas:join", canvasId, function ackACB(res){
            if (!res.ok) onError(res.error);
            else onJoined(res.strokes);
        });
    }

    s.on("connect", joinACB);       // fires on first connect and on every reconnect
    s.on("stroke:added", onStroke);
    s.on("canvas:peers", onPeers);
    s.on("connect_error", connectErrorACB);
    if (s.connected) joinACB();

    function connectErrorACB(){ onError("Cannot reach the server"); }

    return function leave(){
        s.off("connect", joinACB);
        s.off("stroke:added", onStroke);
        s.off("canvas:peers", onPeers);
        s.off("connect_error", connectErrorACB);
    };
}

// stroke: { canvasId, layerId, brush, size, color, opacity, path }
export function sendStroke(stroke, onDone){
    getSocket().emit("stroke:add", stroke, onDone);
}
