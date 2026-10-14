import type { Point } from "/src/model/types.ts";

// Every canvas element has x, y (its top-left corner), width, height and rotation (degrees).
// Konva rotates an element around its top-left corner, so the maths below does the same.
export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
}

function toRadians(degrees: number): number { return degrees * Math.PI / 180; }

// turns a point on the canvas into a point inside the element's own box,
// where (0, 0) is the element's top-left corner and the axes follow its rotation
export function toLocalPoint(element: Box, point: Point): Point {
    const angle = toRadians(-element.rotation);     // undo the element's rotation
    const dx = point.x - element.x;
    const dy = point.y - element.y;
    return {
        x: dx * Math.cos(angle) - dy * Math.sin(angle),
        y: dx * Math.sin(angle) + dy * Math.cos(angle),
    };
}

// the centre of an element, in canvas coordinates
export function getCentre(element: Box): Point {
    const angle = toRadians(element.rotation);
    const halfWidth = element.width / 2;
    const halfHeight = element.height / 2;
    return {
        x: element.x + halfWidth * Math.cos(angle) - halfHeight * Math.sin(angle),
        y: element.y + halfWidth * Math.sin(angle) + halfHeight * Math.cos(angle),
    };
}

// true if the point is inside the element's (possibly rotated) box
export function isPointInside(element: Box, point: Point): boolean {
    const local = toLocalPoint(element, point);
    return local.x >= 0 && local.x <= element.width
        && local.y >= 0 && local.y <= element.height;
}

// distance from a point to the line segment a-b
function distanceToSegment(point: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    // a and b are the same point
    if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
    // how far along a-b the closest point is, kept between a (0) and b (1)
    const along = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
    return Math.hypot(point.x - (a.x + along * dx), point.y - (a.y + along * dy));
}

// how wide a line counts as clicked, so thin lines are easy to hit
export const STROKE_HIT_WIDTH: number = 20;

// true if the point is on the line drawn along path, as close as a click needs to be (thickness is the line's width)
export function isOnPath(path: Point[], thickness: number, point: Point): boolean {
    const reach = Math.max(STROKE_HIT_WIDTH, thickness) / 2;
    if (path.length === 1) return Math.hypot(point.x - path[0].x, point.y - path[0].y) <= reach;
    // each segment goes from the point before (path[index]) to this one
    function isNearSegmentCB(end: Point, index: number): boolean {
        return distanceToSegment(point, path[index], end) <= reach;
    }
    return path.slice(1).some(isNearSegmentCB);
}
