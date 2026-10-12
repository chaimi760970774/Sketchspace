// All requests to the Sketchspace server (REST). Every function returns a promise;
// if the server answers with an error, the promise rejects with an ApiError carrying its message.

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// an error from the server; status is the HTTP status (0 = the server could not be reached)
export class ApiError extends Error {
    constructor(message, status){
        super(message);
        this.status = status;       // setting fields in a constructor is how a class instance is built
    }
}

// sends one request and returns the JSON answer
function request(path, options){
    return fetch(API_URL + path, options).then(gotResponseACB, networkErrorACB);

    function networkErrorACB(){
        throw new ApiError("Cannot reach the server, please check that it is running", 0);
    }

    function gotResponseACB(response){
        // the server sends { error: "..." } for errors it expects, but plain HTML for crashes
        return response.json().then(gotJsonACB, notJsonACB);

        function gotJsonACB(data){
            if (!response.ok) throw new ApiError(data.error || "Server error " + response.status, response.status);
            return data;
        }
        function notJsonACB(){
            throw new ApiError("Server error " + response.status, response.status);
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

function canvasPath(canvasId){ return "/api/canvas/" + encodeURIComponent(canvasId); }

// same rule as the server (a MongoDB id: 24 hex characters); a badly formed id is rejected
// here without a request, with the same error the server would send
function isValidCanvasId(canvasId){ return /^[0-9a-f]{24}$/i.test(canvasId); }
function requestForCanvas(canvasId, pathAfterId, options){
    if (!isValidCanvasId(canvasId)) return Promise.reject(new ApiError("Invalid canvas id", 400));
    return request(canvasPath(canvasId) + pathAfterId, options);
}


// ========== Canvases ==========
// a canvas: { _id, name, isShared, createdAt, updatedAt, layers }

export function listCanvases(){
    return request("/api/canvas");
}

export function getCanvas(canvasId){
    return requestForCanvas(canvasId, "");
}

// resolves to the new canvas id
export function createCanvas({ name, isShared }){
    function getIdACB(data){ return data.canvasId; }
    return request("/api/canvas", withJson("POST", { name: name, isShared: isShared })).then(getIdACB);
}

// changes: { name?, isShared? }, at least one
export function updateCanvas(canvasId, changes){
    return requestForCanvas(canvasId, "", withJson("PUT", changes));
}

export function deleteCanvas(canvasId){
    return requestForCanvas(canvasId, "", { method: "DELETE" });
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
