import { Line } from "react-konva";
import { getBrushProps } from "/src/utils/brushStyles.js";
import { STROKE_HIT_WIDTH } from "/src/utils/geometry.js";

// one freehand stroke; the brush decides the line style (see brushStyles.js) and the stroke's own
// opacity (chosen with the slider) is applied on top, for every brush
// With the shape tool a stroke can be clicked to select it (it is highlighted, never moved or resized,
// because the server cannot change a saved stroke). The stroke being drawn passes no onSelect.
export function StrokeNode(props){
    const stroke = props.stroke;
    const failed = stroke.status === "failed";      // not saved on the server, drawn faded

    // A single point (just a click) is drawn as a dot: a tiny line with round ends. The second point is
    // moved a hair to the side, because the browser skips lines of zero length and would draw nothing.
    const first = stroke.path[0];
    const path = stroke.path.length === 1 ? [first, { x: first.x + 0.01, y: first.y }] : stroke.path;
    function toNumbersCB(point){ return [point.x, point.y]; }

    return <Line id={stroke.id}
                 points={path.flatMap(toNumbersCB)}
                 {...getBrushProps(stroke)}
                 opacity={failed ? stroke.opacity * 0.25 : stroke.opacity}
                 hitStrokeWidth={Math.max(STROKE_HIT_WIDTH, stroke.size)}
                 listening={Boolean(props.interactive)}
                 shadowEnabled={Boolean(props.selected)}
                 shadowColor="#2196f3"
                 shadowBlur={12}
                 shadowOpacity={1}
                 onClick={props.onSelect}
                 onTap={props.onSelect}/>;
}
