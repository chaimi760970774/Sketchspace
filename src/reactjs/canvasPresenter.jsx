import { observer } from "mobx-react-lite";
import { CanvasView } from "/src/views/canvasView.jsx";
import { ShapePanelView } from "/src/views/shapePanelView.jsx";
import { StrokePanelView } from "/src/views/strokePanelView.jsx";
import { useNavigate, useParams } from "react-router-dom";

const Canvas = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Canvas(props){
        const navigate = useNavigate();
        const { canvasId } = useParams();   // undefined for a new canvas, use it to load the canvas from backend later

        return (
            <CanvasView currentTool={props.model.currentTool}
                        collaborators={props.model.collaborators}

                        onHomeClick={() => navigate("/gallery")}
                        onProfileClick={() => navigate("/profile")}
                        onToolChange={handlerToolChangeACB}
                        onUndo={handlerUndoACB}
                        onRedo={handlerRedoACB}
                        onSave={handlerSaveACB}
                        onExport={handlerExportACB}
                        onShare={handlerShareACB}>

                {props.model.currentTool === "shape"
                    ? <ShapePanelView selectedShape={props.model.selectedShape}
                                      onShapeSelect={handlerShapeSelectACB}
                                      onUploadPhoto={handlerUploadPhotoACB}
                                      onFillColor={handlerFillColorACB}/>

                    : <StrokePanelView strokeType={props.model.strokeType}
                                       strokeWidth={props.model.strokeWidth}
                                       strokeColor={props.model.strokeColor}
                                       onStrokeTypeChange={handlerStrokeTypeChangeACB}
                                       onStrokeWidthChange={handlerStrokeWidthChangeACB}
                                       onStrokeColorChange={handlerStrokeColorChangeACB}/>}
            </CanvasView>
        );

        function handlerToolChangeACB(tool){ props.model.setCurrentTool(tool); }

        // shape panel
        function handlerShapeSelectACB(shape){ props.model.selectShape(shape); }

        // stroke panel
        function handlerStrokeTypeChangeACB(type){ props.model.setStrokeType(type); }
        function handlerStrokeWidthChangeACB(width){ props.model.setStrokeWidth(Number(width)); }
        function handlerStrokeColorChangeACB(color){ props.model.setStrokeColor(color); }

        // features below will be done later, only logging for now
        function handlerUploadPhotoACB(){ console.log("upload photo"); }
        function handlerFillColorACB(){ console.log("fill color"); }
        function handlerUndoACB(){ console.log("undo"); }
        function handlerRedoACB(){ console.log("redo"); }
        function handlerSaveACB(){ console.log("save canvas:", canvasId); }
        function handlerExportACB(){ console.log("export canvas:", canvasId); }
        function handlerShareACB(){ console.log("share canvas:", canvasId); }
    }
);

export { Canvas };