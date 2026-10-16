import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { API_URL, getLoginToken } from "/src/api/canvasSource.ts";
import type { ElementChanges, ElementServerFields, NewStroke, ServerElement, ServerStroke } from "/src/model/types.ts";

// Live drawing over socket.io. A socket is in one canvas at a time.
// Every request is acknowledged with { ok: true, ... } or { ok: false, error }; the promises reject with that error.

const ACK_TIMEOUT_MS = 8000;

// what the server answers
type Ack<T> = ({ ok: true } & T) | { ok: false; error: string };

export interface JoinResult {
    strokes: ServerStroke[];
    elements: ServerElement[];
    isShared: boolean;
    isOwner: boolean;
}

// events the server sends
interface ServerToClientEvents {
    "stroke:added": (stroke: ServerStroke) => void;
    "stroke:removed": (strokeId: string) => void;
    "stroke:deleted": (strokeId: string) => void;
    "element:added": (element: ServerElement) => void;
    "element:updated": (element: ServerElement) => void;
    "element:deleted": (elementId: string) => void;
    "canvas:cleared": () => void;
    "canvas:peers": (count: number) => void;
    "canvas:unshared": () => void;
    "canvas:deleted": () => void;
}

// events this app sends; the last parameter is the server's acknowledgement
interface ClientToServerEvents {
    "canvas:join": (canvasId: string, options: { ownerToken?: string }, ack: (result: Ack<JoinResult>) => void) => void;
    "canvas:leave": () => void;
    "stroke:add": (stroke: NewStroke, ack: (result: Ack<{ id: string }>) => void) => void;
    "stroke:delete": (strokeId: string, ack: (result: Ack<object>) => void) => void;
    "canvas:clear": (ack: (result: Ack<{ removed: number }>) => void) => void;
    "element:add": (element: ElementServerFields & { canvasId: string }, ack: (result: Ack<{ id: string }>) => void) => void;
    "element:update": (elementId: string, changes: ElementChanges, ack: (result: Ack<object>) => void) => void;
    "element:delete": (elementId: string, ack: (result: Ack<object>) => void) => void;
}

type CanvasSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface SocketHandlers {
    onConnect: () => void;
    onDisconnect: () => void;
    onPeers: (count: number) => void;
    onUnshared: () => void;
    onDeleted: () => void;
    onCleared: () => void;
    onStrokeAdded: (stroke: ServerStroke) => void;
    onStrokeRemoved: (strokeId: string) => void;
    onStrokeDeleted: (strokeId: string) => void;
    onElementAdded: (element: ServerElement) => void;
    onElementUpdated: (element: ServerElement) => void;
    onElementDeleted: (elementId: string) => void;
}

// The one live connection. It is opened, closed and replaced over time and every request uses the
// current one, so it has to be kept here as changeable module state (a const object with a mutable field).
const connection: { socket: CanvasSocket | null } = { socket: null };

// connects once (later calls do nothing)
export function startSocket(handlers: SocketHandlers): void {
    if (connection.socket) return;
    // the login token goes with the connection (read again on every reconnect, so a new login is picked up)
    function sendTokenCB(sendAuth: (auth: object) => void): void { sendAuth({ token: getLoginToken() }); }
    const socket: CanvasSocket = io(API_URL, { auth: sendTokenCB });
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
    connection.socket = socket;
}

// closes the connection, so the next canvas opens a new one with the current login
export function stopSocket(): void {
    if (connection.socket) connection.socket.disconnect();
    connection.socket = null;
}

export function isSocketConnected(): boolean { return Boolean(connection.socket) && Boolean(connection.socket?.connected); }

// the socket with a time limit for the answer; rejects when there is no connection
function getSocketWithTimeout(): Promise<ReturnType<CanvasSocket["timeout"]>> {
    if (!connection.socket) return Promise.reject(new Error("The live connection is not started"));
    return Promise.resolve(connection.socket.timeout(ACK_TIMEOUT_MS));
}

// the server's answer, or its error as a rejection
function checkAck<T>(result: Ack<T>): { ok: true } & T {
    if (!result.ok) throw new Error(result.error);
    return result;
}
// emitWithAck rejects only when the time limit passed without an answer
function timedOutACB(): never { throw new Error("The server did not answer"); }

// resolves to the strokes and elements already there; a private canvas needs the owner token
export function joinCanvas(canvasId: string, ownerToken: string | null): Promise<JoinResult> {
    function sendCB(socket: ReturnType<CanvasSocket["timeout"]>): Promise<Ack<JoinResult>> {
        return socket.emitWithAck("canvas:join", canvasId, { ownerToken: ownerToken || undefined }).catch(timedOutACB);
    }
    return getSocketWithTimeout().then(sendCB).then(checkAck);
}

export function leaveCanvas(): void {
    if (connection.socket) connection.socket.emit("canvas:leave");
}

// resolves to the new stroke id
export function sendStroke(stroke: NewStroke): Promise<string> {
    function sendCB(socket: ReturnType<CanvasSocket["timeout"]>): Promise<Ack<{ id: string }>> {
        return socket.emitWithAck("stroke:add", stroke).catch(timedOutACB);
    }
    function getIdACB(result: { id: string }): string { return result.id; }
    return getSocketWithTimeout().then(sendCB).then(checkAck).then(getIdACB);
}

// deletes one stroke
export function deleteStrokeLive(strokeId: string): Promise<object> {
    function sendCB(socket: ReturnType<CanvasSocket["timeout"]>): Promise<Ack<object>> {
        return socket.emitWithAck("stroke:delete", strokeId).catch(timedOutACB);
    }
    return getSocketWithTimeout().then(sendCB).then(checkAck);
}

// removes every stroke of the canvas (owner only); resolves to the number removed
export function clearCanvasStrokes(): Promise<number> {
    function sendCB(socket: ReturnType<CanvasSocket["timeout"]>): Promise<Ack<{ removed: number }>> {
        return socket.emitWithAck("canvas:clear").catch(timedOutACB);
    }
    function getRemovedACB(result: { removed: number }): number { return result.removed; }
    return getSocketWithTimeout().then(sendCB).then(checkAck).then(getRemovedACB);
}

// resolves to the new element id
export function sendElement(element: ElementServerFields & { canvasId: string }): Promise<string> {
    function sendCB(socket: ReturnType<CanvasSocket["timeout"]>): Promise<Ack<{ id: string }>> {
        return socket.emitWithAck("element:add", element).catch(timedOutACB);
    }
    function getIdACB(result: { id: string }): string { return result.id; }
    return getSocketWithTimeout().then(sendCB).then(checkAck).then(getIdACB);
}

// changes: the changed fields only
export function changeElementLive(elementId: string, changes: ElementChanges): Promise<object> {
    function sendCB(socket: ReturnType<CanvasSocket["timeout"]>): Promise<Ack<object>> {
        return socket.emitWithAck("element:update", elementId, changes).catch(timedOutACB);
    }
    return getSocketWithTimeout().then(sendCB).then(checkAck);
}

export function deleteElementLive(elementId: string): Promise<object> {
    function sendCB(socket: ReturnType<CanvasSocket["timeout"]>): Promise<Ack<object>> {
        return socket.emitWithAck("element:delete", elementId).catch(timedOutACB);
    }
    return getSocketWithTimeout().then(sendCB).then(checkAck);
}
