import type { CanvasElement, ElementChanges, ElementServerFields, ServerElement } from "/src/model/types.ts";

// The fields of an element that the server stores. Frontend-only fields like `id` (sent separately)
// and `status` are never sent. Each kind of element is written out, so the types stay exact.

// a new element as the server expects it
export function toServerElement(element: CanvasElement | ServerElement): ElementServerFields {
    const base = {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        zIndex: element.zIndex,
    };
    if (element.type === "photo")
        return { ...base, type: "photo", url: element.url, photographer: element.photographer, photographerLink: element.photographerLink };
    if (element.type === "shape")
        return { ...base, type: "shape", shape: element.shape, color: element.color };
    return {
        ...base,
        type: "cutout",
        shape: element.shape,
        url: element.url,
        photographer: element.photographer,
        photographerLink: element.photographerLink,
        cutWidth: element.cutWidth,
        cutHeight: element.cutHeight,
        photo: element.photo,
    };
}

// changed fields only, without the ones that are not set
export function toServerChanges(changes: ElementChanges): ElementChanges {
    return {
        ...(changes.x !== undefined && { x: changes.x }),
        ...(changes.y !== undefined && { y: changes.y }),
        ...(changes.width !== undefined && { width: changes.width }),
        ...(changes.height !== undefined && { height: changes.height }),
        ...(changes.rotation !== undefined && { rotation: changes.rotation }),
        ...(changes.zIndex !== undefined && { zIndex: changes.zIndex }),
        ...(changes.color !== undefined && { color: changes.color }),
    };
}

// an element from the server, marked as saved (fields the app does not use, like canvasId, are left out)
export function toLocalElement(serverElement: ServerElement): CanvasElement {
    return { ...toServerElement(serverElement), id: serverElement.id, status: "saved" };
}
