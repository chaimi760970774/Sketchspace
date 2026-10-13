import { io } from "socket.io-client";
import { API_URL } from "/src/api/canvasSource.js";

// Live drawing over socket.io. A socket is in one canvas at a time.
// Every request is acknowledged with { ok, ... } or { ok: false, error }; the promises reject with that error.

const ACK_TIMEOUT_MS = 8000;

let socket = null;

// connects once (later calls do nothing)
// handlers: onConnect, onDisconnect, onPeers(count), onUnshared, onDeleted, onCleared,
//           onStrokeAdded / onStrokeRemoved / onStrokeDeleted, onElementAdded / onElementUpdated / onElementDeleted
export function startSocket(handlers){
    if (socket) return;
    socket = io(API_URL);
    socket.on("connect", handlers.onConnect);
    socket.on("disconnect", handlers.onDisconnect);
    socket.on("stroke:added", handlers.onStrokeAdded);
    socket.on("stroke:removed", handlers.onStrokeRemoved);
    socket.on("stroke:deleted", handlers.onStrokeDeleted);
    socket.on("element:added", handlers.onElementAdded);
    socket.on("element:updated", handlers.onElementUpdated);
    socket.on("element:deleted", handlers.onElementDeleted);
    socket.on("canvas:cleared", handlers.onCleared);
    socket.on("canvas:peers", handlers.onPeers);
    socket.on("canvas:unshared", handlers.onUnshared);
    socket.on("canvas:deleted", handlers.onDeleted);
}

export function isSocketConnected(){ return Boolean(socket) && socket.connected; }

// sends an event and waits for its acknowledgement
function emitWithAck(event, ...args){
    if (!socket) return Promise.reject(new Error("The live connection is not started"));
    return new Promise(function executorACB(resolve, reject){
        function ackACB(timeoutError, result){
            if (timeoutError) return reject(new Error("The server did not answer"));
            if (!result.ok) return reject(new Error(result.error));
            resolve(result);
        }
        socket.timeout(ACK_TIMEOUT_MS).emit(event, ...args, ackACB);
    });
}

// resolves to { strokes, isShared, isOwner }; a private canvas needs the owner token
export function joinCanvas(canvasId, ownerToken){
    return emitWithAck("canvas:join", canvasId, { ownerToken: ownerToken || undefined });
}

export function leaveCanvas(){
    if (socket) socket.emit("canvas:leave");
}

// resolves to the new stroke id
export function sendStroke(stroke){
    function getIdACB(result){ return result.id; }
    return emitWithAck("stroke:add", stroke).then(getIdACB);
}

// deletes one stroke
export function deleteStrokeLive(strokeId){
    return emitWithAck("stroke:delete", strokeId);
}

// removes every stroke of the canvas (owner only); resolves to the number removed
export function clearCanvasStrokes(){
    function getRemovedACB(result){ return result.removed; }
    return emitWithAck("canvas:clear").then(getRemovedACB);
}

// resolves to the new element id
export function sendElement(element){
    function getIdACB(result){ return result.id; }
    return emitWithAck("element:add", element).then(getIdACB);
}

// changes: the changed fields only
export function changeElementLive(elementId, changes){
    return emitWithAck("element:update", elementId, changes);
}

export function deleteElementLive(elementId){
    return emitWithAck("element:delete", elementId);
}
