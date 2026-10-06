import { Image as KonvaImage } from "react-konva";
import useImage from "use-image";

// one photo on the canvas; useImage loads the picture before Konva can draw it
export function PhotoNode(props){
    const [image] = useImage(props.element.url, "anonymous");   // "anonymous" so export works later

    return <KonvaImage id={props.element.id}
                       image={image}
                       x={props.element.x}
                       y={props.element.y}
                       width={props.element.width}
                       height={props.element.height}
                       rotation={props.element.rotation}
                       draggable
                       onClick={props.onSelect}
                       onTap={props.onSelect}
                       onDragStart={props.onSelect}
                       onDragEnd={props.onDragEnd}
                       onTransformEnd={props.onTransformEnd}/>;
}
