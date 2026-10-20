// Shared types for the app's data: what the model holds, what the server sends, and what
// presenters and views pass around.

import type { userModel } from "./userModel.ts";
import type { galleryModel } from "./galleryModel.ts";
import type { canvasModel } from "./canvasModel.ts";
import type { openCanvasModel } from "./openCanvasModel.ts";
import type { toastModel } from "./toastModel.ts";
import type { historyModel } from "./historyModel.ts";

// The whole MobX model: all parts merged (see mobxReactiveModel.ts), as presenters receive it in props.model.
// Each part declares the types of its own fields (the *State interface in each model file).
// It is an interface (not a type alias) so the parts can refer to it in their own methods (`this`).
type UserPart = typeof userModel;
type GalleryPart = typeof galleryModel;
type CanvasPart = typeof canvasModel;
type OpenCanvasPart = typeof openCanvasModel;
type ToastPart = typeof toastModel;
type HistoryPart = typeof historyModel;
export interface Model extends UserPart, GalleryPart, CanvasPart, OpenCanvasPart, HistoryPart, ToastPart {}

export interface PresenterProps {
    model: Model;
}

export interface Point {
    x: number;
    y: number;
}

// "saving" / "saved" / "failed" only exist in the frontend
export type SaveStatus = "saving" | "saved" | "failed" | "local";

// the left panel of the canvas page
export type Tool = "shape" | "stroke" | "photo";

// ========== Canvases ==========

// a canvas as the server sends it; isOwner is only sent by GET /api/canvas/:id
export interface Canvas {
    _id: string;
    name: string;
    // anyone with the canvas id can join (a private canvas is only for its owner)
    isShared: boolean;
    // also listed in the Gallery; a public canvas is always shared
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
    layers?: { id: string; order: number; visible: boolean }[];
    isOwner?: boolean;
    // the account's folder this canvas is in, null = no folder; only GET /api/canvas/mine sends it
    // (shared canvases and GET /api/canvas/:id leave it out)
    folderId?: string | null;
}

// what PUT /api/canvas/:id can change
export interface CanvasChanges {
    name?: string;
    isShared?: boolean;
    isPublic?: boolean;
}

// ========== Strokes ==========

export type Brush = "pencil" | "pen";

// how a stroke looks
export interface StrokeStyle {
    path: Point[];
    brush: string;              // "pencil" / "pen"; a string because strokes from the server may have others
    size: number;
    color: string;
    opacity: number;
}

// a stroke as it is sent to the server
export interface NewStroke extends StrokeStyle {
    canvasId: string;
    layerId: string;
}

// a stroke as the server sends it (REST and socket alike)
export interface ServerStroke extends NewStroke {
    id: string;
}

// a stroke on the open canvas; id is the server's, or a temporary one until it is saved
export interface Stroke extends NewStroke {
    id: string;
    status: SaveStatus;
}

// the stroke being drawn right now (only the board view has it)
export interface DraftStroke extends StrokeStyle {
    status: "drawing";
}

// ========== Canvas elements (photos, shapes, cutouts) ==========

export type ShapeName = "triangle" | "star" | "circle" | "square";

// the fields every element has on the server
interface ElementFields {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    zIndex?: number;
}

// what the server stores for each kind of element (no id)
export interface PhotoFields extends ElementFields {
    type: "photo";
    url: string;
    photographer?: string;
    photographerLink?: string;
}

export interface ShapeFields extends ElementFields {
    type: "shape";
    shape: string;              // a ShapeName
    color: string | null;       // null = dashed template, waiting to be cut or filled
}

export interface CutoutFields extends ElementFields {
    type: "cutout";
    shape: string;              // the outline the photo was cut with
    url: string;
    photographer?: string;
    photographerLink?: string;
    cutWidth: number;           // size when it was cut; a resized cutout stretches the photo the same way
    cutHeight: number;
    photo: { x: number; y: number; width: number; height: number; rotation: number };   // where the photo sat
}

export type ElementServerFields = PhotoFields | ShapeFields | CutoutFields;

// an element as the server sends it
export type ServerElement = ElementServerFields & { id: string; canvasId?: string };

// an element on the open canvas; id is the server's, or a temporary one until it is saved
interface LocalFields {
    id: string;
    status?: SaveStatus;
}
export type PhotoElement = PhotoFields & LocalFields;
export type ShapeElement = ShapeFields & LocalFields;
export type CutoutElement = CutoutFields & LocalFields;
export type CanvasElement = PhotoElement | ShapeElement | CutoutElement;

// fields of an element that can be changed after it was added (moving, resizing, filling ...)
export interface ElementChanges {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    zIndex?: number;
    color?: string | null;
}

// ========== Users ==========

// the user the pages show (a logged-in account, or a guest)
export interface User {
    id: string;
    name: string;
    email: string;
    photoURL: string | null;
    hasCustomPhoto: boolean;    // true when the user uploaded the photo (then it can be removed)
}

// a user as the server sends it
export interface ServerUser {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
    hasCustomAvatar?: boolean;
    createdAt?: string;
}

export type ProfileField = "name" | "email";

// ========== Other UI data ==========

// a folder of the logged-in account, as the server sends it (id, not _id, like users and elements)
export interface Folder {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

export interface Collaborator {
    id: string;
    name: string;
}

// one photographer to credit, required by Unsplash guidelines
export interface PhotoCredit {
    name: string;
    link: string;
}

// the photo picked in the Unsplash search, ready to drag onto the canvas
export interface SelectedPhoto {
    id: string;
    url: string;
    ratio: number;
    photographer: string;
    photographerLink: string;
    downloadLocation: string;   // Unsplash download tracking URL
}

// the part of an Unsplash search result the app uses
export interface UnsplashPhoto {
    id: string;
    alt_description: string | null;
    width: number;
    height: number;
    urls: { small: string };
    user: { name: string; links: { html: string } };
    links: { download_location: string };
}

// "any" means no filter
export interface UnsplashFilters {
    orientation: string;
    color: string;
}

export type ToastType = "success" | "error" | "info";

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

// an error from a request; status is set for errors from the Sketchspace server (see api/canvasSource.ts)
export type RequestError = Error & { status?: number };

// what resolvePromise fills in while a request runs
export interface PromiseState<T> {
    promise?: Promise<T> | null;
    data?: T | null;
    error?: RequestError | null;
}
