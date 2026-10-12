import { Line } from "react-konva";

// one freehand stroke; pencil is see-through and edgy, pen is solid and smoothed
export function StrokeNode(props){
    const stroke = props.stroke;
    const failed = stroke.status === "failed";      // not saved on the server, drawn faded

    // a single point (just a click) is drawn as a dot: a line from the point to itself
    const path = stroke.path.length === 1 ? [stroke.path[0], stroke.path[0]] : stroke.path;
    function toNumbersCB(point){ return [point.x, point.y]; }

    return <Line points={path.flatMap(toNumbersCB)}
                 stroke={stroke.color}
                 strokeWidth={stroke.size}
                 opacity={failed ? stroke.opacity * 0.25 : stroke.opacity}
                 tension={stroke.brush === "pen" ? 0.5 : 0}
                 lineCap="round"
                 lineJoin="round"
                 listening={false}/>;
}
