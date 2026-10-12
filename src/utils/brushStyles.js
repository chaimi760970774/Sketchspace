// How each brush looks. Returns the props for a Konva Line; used by StrokeNode for both the stroke
// being drawn and the strokes loaded from the server, so they always look the same.
// The stroke's own opacity is NOT set here: it is applied on top by StrokeNode, for every brush.
//
// pen:    one smooth solid line, round ends and corners.
// pencil: a thinner, faint centre line plus a few thin copies slightly shifted around it, so the edge
//         looks grainy and soft. The shifts come from a fixed formula (not Math.random), so a stroke
//         looks exactly the same every time it is drawn.

const PEN_TENSION = 0.4;

const PENCIL_GRAIN_ALPHA = 0.35;            // each thin copy is faint; where they overlap it gets darker
const PENCIL_CENTRE_WIDTH = 0.6;            // centre line width, as a part of the stroke size
const PENCIL_GRAIN_WIDTH = 0.35;            // width of each thin copy, as a part of the stroke size
// where each thin copy sits around the centre line, in stroke sizes
const PENCIL_GRAIN_OFFSETS = [
    { x: -0.25, y: 0.15 },
    { x: 0.2, y: -0.2 },
    { x: 0.1, y: 0.3 },
    { x: -0.15, y: -0.3 },
];

export function getBrushProps(stroke){
    if (stroke.brush === "pencil") return getPencilProps(stroke);
    return {
        stroke: stroke.color,
        strokeWidth: stroke.size,
        lineCap: "round",
        lineJoin: "round",
        tension: PEN_TENSION,
    };
}

function getPencilProps(stroke){
    const grainColor = withAlpha(stroke.color, PENCIL_GRAIN_ALPHA);

    return {
        stroke: grainColor,                     // the centre line is as faint as the grain
        strokeWidth: stroke.size * PENCIL_CENTRE_WIDTH,
        lineCap: "round",
        lineJoin: "round",
        sceneFunc: drawPencilACB,
        hitFunc: hitPencilACB,
    };

    function drawPencilACB(context, line){
        const points = line.points();
        // a dot (a click without moving) keeps its copies close together, so it stays one round soft dot
        const isDot = points.length === 4;
        const spread = isDot ? 0.3 : 1;
        PENCIL_GRAIN_OFFSETS.forEach(drawGrainCB);

        // the centre line is drawn the normal Konva way, so the selection highlight (shadow) still works
        tracePath(context, points, noShift);
        context.strokeShape(line);

        function drawGrainCB(offset, copyIndex){
            // the same shift for both points of a dot, otherwise each copy would become a short dash
            function shiftCB(pointIndex){
                // a small wobble per point on top of the fixed offset of this copy
                const wobble = (grain(isDot ? 0 : pointIndex, copyIndex) - 0.5) * 0.3;
                return { x: (offset.x + wobble) * spread * stroke.size, y: (offset.y - wobble) * spread * stroke.size };
            }
            tracePath(context, points, shiftCB);
            context.setAttr("strokeStyle", grainColor);
            context.setAttr("lineWidth", stroke.size * PENCIL_GRAIN_WIDTH);
            context.setAttr("lineCap", "round");
            context.setAttr("lineJoin", "round");
            context.stroke();
        }
    }

    // what counts as a click on the stroke: only the centre line (with the Line's hitStrokeWidth);
    // the grain must not be drawn on Konva's hidden hit canvas
    function hitPencilACB(context, line){
        tracePath(context, line.points(), noShift);
        context.strokeShape(line);
    }
}

// points come flat from Konva: [x0, y0, x1, y1, ...]; shiftCB(pointIndex) moves each point a little
function tracePath(context, points, shiftCB){
    function pointCB(value, index){
        if (index % 2 === 1) return;            // handled together with its x
        const pointIndex = index / 2;
        const shift = shiftCB(pointIndex);
        const x = points[index] + shift.x;
        const y = points[index + 1] + shift.y;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
    }
    context.beginPath();
    points.forEach(pointCB);
}

function noShift(){ return { x: 0, y: 0 }; }

// a number from 0 to 1 that looks random but is always the same for the same point and copy
function grain(pointIndex, copyIndex){
    const value = Math.sin(pointIndex * 12.9898 + copyIndex * 78.233) * 43758.5453;
    return value - Math.floor(value);
}

// "#3366cc" or "#36c" + 0.35 -> "rgba(51, 102, 204, 0.35)"; other colour formats are kept as they are
function withAlpha(color, alpha){
    const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color);
    const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
    const parts = long ? long.slice(1) : short ? short.slice(1).map(doubleDigitCB) : null;
    if (!parts) return color;
    const rgb = parts.map(hexToNumberCB);
    return "rgba(" + rgb.join(", ") + ", " + alpha + ")";

    function doubleDigitCB(digit){ return digit + digit; }
    function hexToNumberCB(hex){ return parseInt(hex, 16); }
}
