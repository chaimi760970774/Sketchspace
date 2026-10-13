import { io } from "socket.io-client";
import { API_URL } from "/src/api/canvasSource.js";

// Live drawing over socket.io. A socket is in one canvas at a time; every request gets an
// acknowledgement { ok, ... } or { ok: false, error }, and the promises here reject with an Error holding that message.

const ACK_TIMEOUT_MS = 8000;

let socket = null;

// connects once (later calls do nothing)
// handlers: { onConnect, onDisconnect, onStrokeAdded(stroke), onPeers(count), onUnshared, onDeleted }
export function startSocket(handlers){
    if (socket) return;
    socket = io(API_URL);
    socket.on("connect", handlers.onConnect);
    socket.on("disconnect", handlers.onDisconnect);
    socket.on("stroke:added", handlers.onStrokeAdded);
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

// resolves to the new stroke id; the sender does not get its own stroke back through "stroke:added"
export function sendStroke(stroke){
    function getIdACB(result){ return result.id; }
    return emitWithAck("stroke:add", stroke).then(getIdACB);
}
