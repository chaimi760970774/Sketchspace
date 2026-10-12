import { observer } from "mobx-react-lite";
import { CanvasView } from "/src/views/canvas/canvasView.jsx";
import { CanvasBoardView } from "/src/views/canvas/canvasBoardView.jsx";
import { ShapePanelView } from "/src/views/canvas/shapePanelView.jsx";
import { StrokePanelView } from "/src/views/canvas/strokePanelView.jsx";
import { PhotoSearchView } from "/src/views/canvas/photoSearchView.jsx";
import { useNavigate } from "react-router-dom";

const Canvas = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Canvas(props){
        const navigate = useNavigate();
        // useParams() gives the canvasId (undefined for a new canvas), use it to load the canvas from backend later
        const searchState = props.model.photoSearchPromiseState;

        return (
            <>
            <CanvasView currentTool={props.model.currentTool}
                        collaborators={props.model.collaborators}
                        credits={props.model.getPhotoCredits()}

                        onHomeClick={() => navigate("/gallery")}
                        onProfileClick={() => navigate("/profile")}
                        onToolChange={handlerToolChangeACB}
                        onExport={handlerExportACB}

                        renderBoard={renderBoardCB}>

                {props.model.currentTool === "shape"
                    ? <ShapePanelView selectedPhoto={props.model.selectedPhoto}
                                      canCut={props.model.canCut()}
                                      canFill={props.model.canFill()}
                                      shapeActionHint={props.model.getShapeActionHint()}
                                      fillColor={props.model.fillColor}
                                      onCut={handlerCutACB}
                                      onFill={handlerFillACB}
                                      onFillColorChange={handlerFillColorChangeACB}
                                      onShapeClick={handlerShapeClickACB}
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
                                 hint={props.model.photoSearchHint}
                                 photos={searchState.data}
                                 loading={searchState.promise && !searchState.data && !searchState.error}
                                 error={searchState.error}

                                 onQueryChange={handlerPhotoQueryChangeACB}
                                 onSearch={handlerPhotoSearchACB}
                                 onPhotoSelect={handlerPhotoSelectACB}
                                 onClose={handlerPhotoSearchCloseACB}/>}
            </>
        );

        // the view keeps the Konva stage (it needs it for export) and hands it in here
        function renderBoardCB(stageRef){
            return <CanvasBoardView stageRef={stageRef}
                                    elements={props.model.elements.slice()}   // slice() so the presenter re-renders when elements change
                                    selectedId={props.model.selectedElementId}
                                    onDropItem={handlerDropItemACB}
                                    onSelect={handlerSelectElementACB}
                                    onDeselect={handlerDeselectACB}
                                    onElementChange={handlerElementChangeACB}/>;
        }

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
        function handlerShapeClickACB(shape){ props.model.addShapeAtCentre(shape); }
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
        function handlerExportACB(succeeded){ props.model.showExportResult(succeeded); }
    }
);

export { Canvas };