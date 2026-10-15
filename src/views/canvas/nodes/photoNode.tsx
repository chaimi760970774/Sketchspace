import { Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import type { PhotoElement } from "/src/model/types.ts";
import type { ElementNodeProps } from "./nodeTypes.ts";

// one photo on the canvas; useImage loads the picture before Konva can draw it
export function PhotoNode(props: ElementNodeProps<PhotoElement>){
    const [image] = useImage(props.element.url, "anonymous");   // "anonymous" so export works later

    return <KonvaImage id={props.element.id}
                       image={image}
                       x={props.element.x}
                       y={props.element.y}
                       width={props.element.width}
                       height={props.element.height}
                       rotation={props.element.rotation}
                       draggable={props.interactive}
                       listening={props.interactive}
                       onClick={props.onSelect}
                       onTap={props.onSelect}
                       onDragStart={props.onSelect}
                       onDragEnd={props.onDragEnd}
                       onTransformEnd={props.onTransformEnd}/>;
}
