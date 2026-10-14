import { request, withJson } from "/src/api/canvasSource.ts";
import type { Folder } from "/src/model/types.ts";

// Folders of the logged-in account (all requests need a login, otherwise 401).
// Moving a canvas into a folder is setCanvasFolder in canvasSource.ts (it is a canvas route).

function folderPath(folderId: string): string { return "/api/folders/" + encodeURIComponent(folderId); }

// the account's folders, oldest first
export function listFolders(): Promise<Folder[]> {
    return request<Folder[]>("/api/folders");
}

// resolves to the new folder; 409 if the account already has a folder with this name (ignoring case)
export function createFolder(name: string): Promise<Folder> {
    return request<Folder>("/api/folders", withJson("POST", { name: name }));
}

// resolves to the renamed folder
export function renameFolder(folderId: string, name: string): Promise<Folder> {
    return request<Folder>(folderPath(folderId), withJson("PUT", { name: name }));
}

// the folder's canvases are kept, the server takes them out of the folder
export function deleteFolder(folderId: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(folderPath(folderId), { method: "DELETE" });
}
