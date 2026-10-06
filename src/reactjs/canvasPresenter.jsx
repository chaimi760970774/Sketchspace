import { observer } from "mobx-react-lite";
import { CanvasView } from "/src/views/canvas/canvasView.jsx";
import { CanvasBoardView } from "/src/views/canvas/canvasBoardView.jsx";
import { ShapePanelView } from "/src/views/canvas/shapePanelView.jsx";
import { StrokePanelView } from "/src/views/canvas/strokePanelView.jsx";
import { PhotoSearchView } from "/src/views/canvas/photoSearchView.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { useRef } from "react";
import { downloadStageImage } from "/src/utils/exportImage.js";

const Canvas = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Canvas(props){
        const navigate = useNavigate();
        const { canvasId } = useParams();   // undefined for a new canvas, use it to load the canvas from backend later
        const searchState = props.model.photoSearchPromiseState;
        const stageRef = useRef(null);      // the Konva stage, only needed for export

        return (
            <>
            <CanvasView currentTool={props.model.currentTool}
                        collaborators={props.model.collaborators}
                        credits={props.model.getPhotoCredits()}

                        onHomeClick={() => navigate("/gallery")}
                        onProfileClick={() => navigate("/profile")}
                        onToolChange={handlerToolChangeACB}
                        onUndo={handlerUndoACB}
                        onRedo={handlerRedoACB}
                        onSave={handlerSaveACB}
                        onExport={handlerExportACB}
                        onShare={handlerShareACB}

                        board={<CanvasBoardView stageRef={stageRef}
                                                elements={props.model.elements.slice()}   // slice() so the presenter re-renders when elements change
                                                selectedId={props.model.selectedElementId}
                                                onDropItem={handlerDropItemACB}
                                                onSelect={handlerSelectElementACB}
                                                onDeselect={handlerDeselectACB}
                                                onElementChange={handlerElementChangeACB}/>}>

                {props.model.currentTool === "shape"
                    ? <ShapePanelView selectedShape={props.model.selectedShape}
                                      selectedPhoto={props.model.selectedPhoto}
                                      canCut={props.model.canCut()}
                                      canFill={props.model.canFill()}
                                      fillColor={props.model.fillColor}
                                      onCut={handlerCutACB}
                                      onFill={handlerFillACB}
                                      onFillColorChange={handlerFillColorChangeACB}
                                      onShapeSelect={handlerShapeSelectACB}
                                      onUploadPhoto={handlerUploadPhotoACB}/>

                    : <StrokePanelView strokeType={props.model.strokeType}
                                       strokeWidth={props.model.strokeWidth}
                                       strokeColor={props.model.strokeColor}
                                       onStrokeTypeChange={handlerStrokeTypeChangeACB}
                                       onStrokeWidthChange={handlerStrokeWidthChangeACB}
                                       onStrokeColorChange={handlerStrokeColorChangeACB}/>}
            </CanvasView>

            {props.model.photoSearchOpen &&
                <PhotoSearchView query={props.model.photoSearchQuery}
                                 photos={searchState.data}
                                 loading={searchState.promise && !searchState.data && !searchState.error}
                                 error={searchState.error}

                                 onQueryChange={handlerPhotoQueryChangeACB}
                                 onSearch={handlerPhotoSearchACB}
                                 onPhotoSelect={handlerPhotoSelectACB}
                                 onClose={handlerPhotoSearchCloseACB}/>}
            </>
        );

        function handlerToolChangeACB(tool){ props.model.setCurrentTool(tool); }

        // canvas board
        function handlerDropItemACB(type, position){
            if (type === "photo") props.model.addPhotoElement(position);
            // shapes come in as "shape:star", "shape:circle" ...
            if (type.startsWith("shape:")) props.model.addShapeElement(type.split(":")[1], position);
        }
        function handlerSelectElementACB(id){ props.model.selectElement(id); }
        function handlerDeselectACB(){ props.model.selectElement(null); }
        function handlerElementChangeACB(id, changes){ props.model.updateElement(id, changes); }

        // shape panel
        function handlerShapeSelectACB(shape){ props.model.selectShape(shape); }
        function handlerUploadPhotoACB(){ props.model.openPhotoSearch(); }
        function handlerCutACB(){ props.model.cutWithSelectedShape(); }
        function handlerFillACB(){ props.model.fillSelectedShape(); }
        function handlerFillColorChangeACB(color){ props.model.setFillColor(color); }

        // photo search popup
        function handlerPhotoQueryChangeACB(query){ props.model.setPhotoSearchQuery(query); }
        function handlerPhotoSearchACB(){ props.model.doPhotoSearch(); }
        function handlerPhotoSelectACB(photo){ props.model.selectPhoto(photo); }
        function handlerPhotoSearchCloseACB(){ props.model.closePhotoSearch(); }

        // stroke panel
        function handlerStrokeTypeChangeACB(type){ props.model.setStrokeType(type); }
        function handlerStrokeWidthChangeACB(width){ props.model.setStrokeWidth(Number(width)); }
        function handlerStrokeColorChangeACB(color){ props.model.setStrokeColor(color); }

        // topbar
        function handlerExportACB(){ downloadStageImage(stageRef.current, "sketchspace.png"); }

        // features below will be done later, only logging for now
        function handlerUndoACB(){ console.log("undo"); }
        function handlerRedoACB(){ console.log("redo"); }
        function handlerSaveACB(){ console.log("save canvas:", canvasId); }
        function handlerShareACB(){ console.log("share canvas:", canvasId); }
    }
);

export { Canvas };