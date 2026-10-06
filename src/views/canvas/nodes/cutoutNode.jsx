import { Shape } from "react-konva";
import useImage from "use-image";
import { drawShapePath } from "/src/utils/drawShapePath.js";

// a piece of photo cut out by a shape
// the shape outline is used as a clip, so only the part of the photo inside it gets drawn
export function CutoutNode(props){
    const element = props.element;
    const [image] = useImage(element.url, "anonymous");   // "anonymous" so export works

    return <Shape id={element.id}
                  x={element.x}
                  y={element.y}
                  width={element.width}
                  height={element.height}
                  rotation={element.rotation}
                  sceneFunc={drawACB}
                  hitFunc={hitACB}
                  draggable
                  onClick={props.onSelect}
                  onTap={props.onSelect}
                  onDragStart={props.onSelect}
                  onDragEnd={props.onDragEnd}
                  onTransformEnd={props.onTransformEnd}/>;

    function drawACB(context, konvaShape){
        if (!image) return;     // photo not loaded yet

        context.save();
        // the cutout may have been resized after cutting, stretch everything to the new size
        context.scale(konvaShape.width() / element.cutWidth, konvaShape.height() / element.cutHeight);

        drawShapePath(context, element.shape, element.cutWidth, element.cutHeight);
        context.clip();         // from now on only pixels inside the shape are drawn

        // put the photo back exactly where it was under the shape
        context.translate(element.photo.x, element.photo.y);
        context.rotate(element.photo.rotation * Math.PI / 180);
        context.drawImage(image, 0, 0, element.photo.width, element.photo.height);
        context.restore();
    }

    // Konva finds what was clicked by drawing this outline on a hidden canvas
    function hitACB(context, konvaShape){
        drawShapePath(context, element.shape, konvaShape.width(), konvaShape.height());
        context.fillShape(konvaShape);
    }
}
