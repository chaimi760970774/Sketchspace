// Props shared by the nodes for photos, shapes and cutouts (see canvasBoardView.tsx, elementCB)
import type { KonvaEventObject } from "konva/lib/Node";

export interface ElementNodeProps<E> {
    element: E;
    interactive: boolean;       // false with the stroke tool or the eraser: the node ignores the mouse
    onSelect: () => void;
    onDragEnd: (evt: KonvaEventObject<DragEvent>) => void;
    onTransformEnd: (evt: KonvaEventObject<Event>) => void;
}
