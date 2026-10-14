import { Shape } from "react-konva";
import { drawShapePath } from "/src/utils/drawShapePath.ts";
import type Konva from "konva";
import type { ShapeElement } from "/src/model/types.ts";
import type { ElementNodeProps } from "./nodeTypes.ts";

// one shape on the canvas
export function ShapeNode(props: ElementNodeProps<ShapeElement>){
    const element = props.element;
    const isTemplate = !element.color;      // no colour = dashed template, waiting to be cut or filled

    return <Shape id={element.id}
                  x={element.x}
                  y={element.y}
                  width={element.width}
                  height={element.height}
                  rotation={element.rotation}
                  sceneFunc={drawACB}
                  fill={isTemplate ? undefined : element.color ?? undefined}
                  stroke={isTemplate ? "#333" : undefined}
                  strokeWidth={2}
                  dash={[8, 6]}
                  strokeScaleEnabled={false}
                  shadowEnabled={isTemplate}
                  shadowColor="white"
                  shadowBlur={3}          // white glow so the dashed line is still visible on dark photos
                  draggable={props.interactive}
                  listening={props.interactive}
                  onClick={props.onSelect}
                  onTap={props.onSelect}
                  onDragStart={props.onSelect}
                  onDragEnd={props.onDragEnd}
                  onTransformEnd={props.onTransformEnd}/>;

    // Konva also uses this to find what was clicked; on that hidden canvas it always fills the shape,
    // so a template can be clicked anywhere inside, not just on the dashed line
    function drawACB(context: Konva.Context, konvaShape: Konva.Shape){
        drawShapePath(context, element.shape, konvaShape.width(), konvaShape.height());
        context.fillStrokeShape(konvaShape);
    }
}
