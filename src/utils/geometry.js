// Every canvas element has x, y (its top-left corner), width, height and rotation (degrees).
// Konva rotates an element around its top-left corner, so the maths below does the same.

function toRadians(degrees){ return degrees * Math.PI / 180; }

// turns a point on the canvas into a point inside the element's own box,
// where (0, 0) is the element's top-left corner and the axes follow its rotation
export function toLocalPoint(element, point){
    const angle = toRadians(-element.rotation);     // undo the element's rotation
    const dx = point.x - element.x;
    const dy = point.y - element.y;
    return {
        x: dx * Math.cos(angle) - dy * Math.sin(angle),
        y: dx * Math.sin(angle) + dy * Math.cos(angle),
    };
}

// the centre of an element, in canvas coordinates
export function getCentre(element){
    const angle = toRadians(element.rotation);
    const halfWidth = element.width / 2;
    const halfHeight = element.height / 2;
    return {
        x: element.x + halfWidth * Math.cos(angle) - halfHeight * Math.sin(angle),
        y: element.y + halfWidth * Math.sin(angle) + halfHeight * Math.cos(angle),
    };
}

// true if the point is inside the element's (possibly rotated) box
export function isPointInside(element, point){
    const local = toLocalPoint(element, point);
    return local.x >= 0 && local.x <= element.width
        && local.y >= 0 && local.y <= element.height;
}
