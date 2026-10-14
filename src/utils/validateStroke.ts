import type { NewStroke, Point } from "/src/model/types.ts";

// Checks a stroke with the same rules the server uses for socket.io strokes (the stricter ones),
// so a stroke that would be rejected is caught before it is sent.
// Returns an error message, or "" if the stroke is fine.

export const MAX_STROKE_POINTS: number = 5000;

function isText(value: string): boolean { return typeof value === "string" && value.length > 0; }
function isFiniteNumber(value: number): boolean { return typeof value === "number" && Number.isFinite(value); }
function isPointCB(point: Point): boolean { return Boolean(point) && isFiniteNumber(point.x) && isFiniteNumber(point.y); }

export function validateStroke(stroke: NewStroke): string {
    if (!isText(stroke.canvasId) || !isText(stroke.layerId) || !isText(stroke.brush) || !isText(stroke.color))
        return "The stroke is missing its canvas, layer, brush or colour";
    if (!isFiniteNumber(stroke.size) || stroke.size <= 0 || stroke.size > 500)
        return "Stroke size must be between 1 and 500";
    if (!isFiniteNumber(stroke.opacity) || stroke.opacity < 0 || stroke.opacity > 1)
        return "Stroke opacity must be between 0 and 1";
    if (!Array.isArray(stroke.path) || stroke.path.length === 0)
        return "The stroke has no points";
    if (stroke.path.length > MAX_STROKE_POINTS)
        return "The stroke is too long, please draw it in shorter pieces";
    if (!stroke.path.every(isPointCB))
        return "The stroke has an invalid point";
    return "";
}
