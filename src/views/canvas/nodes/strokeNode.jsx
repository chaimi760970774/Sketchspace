import { Line } from "react-konva";

// how far from the line a click still hits it; the drawn line itself is often only a few pixels wide
const HIT_WIDTH = 20;

// one freehand stroke; pencil is see-through and edgy, pen is solid and smoothed
// With the shape tool a stroke can be clicked to select it (it is highlighted, never moved or resized,
// because the server cannot change a saved stroke). The stroke being drawn passes no onSelect.
export function StrokeNode(props){
    const stroke = props.stroke;
    const failed = stroke.status === "failed";      // not saved on the server, drawn faded

    // a single point (just a click) is drawn as a dot: a line from the point to itself
    const path = stroke.path.length === 1 ? [stroke.path[0], stroke.path[0]] : stroke.path;
    function toNumbersCB(point){ return [point.x, point.y]; }

    return <Line id={stroke.id}
                 points={path.flatMap(toNumbersCB)}
                 stroke={stroke.color}
                 strokeWidth={stroke.size}
                 opacity={failed ? stroke.opacity * 0.25 : stroke.opacity}
                 tension={stroke.brush === "pen" ? 0.5 : 0}
                 lineCap="round"
                 lineJoin="round"
                 hitStrokeWidth={Math.max(HIT_WIDTH, stroke.size)}
                 listening={Boolean(props.interactive)}
                 shadowEnabled={Boolean(props.selected)}
                 shadowColor="#2196f3"
                 shadowBlur={12}
                 shadowOpacity={1}
                 onClick={props.onSelect}
                 onTap={props.onSelect}/>;
}
