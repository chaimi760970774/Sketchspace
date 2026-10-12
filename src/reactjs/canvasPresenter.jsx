import { observer } from "mobx-react-lite";
import { CanvasView } from "/src/views/canvas/canvasView.jsx";
import { CanvasBoardView } from "/src/views/canvas/canvasBoardView.jsx";
import { CanvasStatusView } from "/src/views/canvas/canvasStatusView.jsx";
import { ShapePanelView } from "/src/views/canvas/shapePanelView.jsx";
import { StrokePanelView } from "/src/views/canvas/strokePanelView.jsx";
import { PhotoSearchView } from "/src/views/canvas/photoSearchView.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";

const Canvas = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Canvas(props){
        const navigate = useNavigate();
        const { canvasId } = useParams();       // undefined on /canvas, then a new canvas is created
        const searchState = props.model.photoSearchPromiseState;

        // runs again whenever another canvas is opened
        useEffect(openCanvasACB, [canvasId]);

        // /canvas without an id: a new canvas is being created
        if (!canvasId) {
            if (props.model.createCanvasError && !props.model.creatingCanvas)
                return <CanvasStatusView title="Could not create a canvas"
                                         message={props.model.createCanvasError}
                                         onRetry={handlerCreateRetryACB}
                                         onHome={handlerHomeACB}/>;
            return <CanvasStatusView loading message="Creating a new canvas..."/>;
        }

        if (props.model.isCanvasNotFound())
            return <CanvasStatusView title="Canvas not found"
                                     message="It may have been deleted, or the link is wrong."
                                     onHome={handlerHomeACB}/>;
        if (props.model.getCanvasError())
            return <CanvasStatusView title="Could not open the canvas"
                                     message={props.model.getCanvasError()}
                                     onRetry={handlerOpenRetryACB}
                                     onHome={handlerHomeACB}/>;
        // also covers the first render after the id changed, before the new canvas started loading
        if (!props.model.isCanvasOpen(canvasId))
            return <CanvasStatusView loading message="Opening canvas..."/>;

        const canvas = props.model.currentCanvas;

        return (
            <>
            <CanvasView currentTool={props.model.currentTool}
                        collaborators={props.model.collaborators}
                        credits={props.model.getPhotoCredits()}
                        canvasName={canvas.name}
                        isShared={canvas.isShared}
                        busy={props.model.isCanvasBusy(canvas._id)}
                        renaming={props.model.renamingCanvas}
                        nameDraft={props.model.canvasNameDraft}
                        nameError={props.model.canvasNameError}
                        strokeSaveStatus={props.model.getStrokeSaveStatus()}
                        canDelete={props.model.canDeleteSelection()}
                        selectionLabel={props.model.getSelectionLabel()}

                        onHomeClick={handlerHomeACB}
                        onProfileClick={() => navigate("/profile")}
                        onToolChange={handlerToolChangeACB}
                        onRenameStart={handlerRenameStartACB}
                        onNameDraftChange={handlerNameDraftChangeACB}
                        onRenameSave={handlerRenameSaveACB}
                        onRenameCancel={handlerRenameCancelACB}
                        onShareToggle={handlerShareToggleACB}
                        onExport={handlerExportACB}
                        onDelete={handlerDeleteACB}

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
                                 orientation={props.model.photoSearchOrientation}
                                 color={props.model.photoSearchColor}
                                 photos={searchState.data}
                                 loading={searchState.promise && !searchState.data && !searchState.error}
                                 error={searchState.error}

                                 onQueryChange={handlerPhotoQueryChangeACB}
                                 onOrientationChange={handlerPhotoOrientationChangeACB}
                                 onColorChange={handlerPhotoColorChangeACB}
                                 onSearch={handlerPhotoSearchACB}
                                 onPhotoSelect={handlerPhotoSelectACB}
                                 onClose={handlerPhotoSearchCloseACB}/>}
            </>
        );

        // the view keeps the Konva stage (it needs it for export) and hands it in here
        function renderBoardCB(stageRef){
            return <CanvasBoardView stageRef={stageRef}
                                    currentTool={props.model.currentTool}
                                    elements={props.model.elements.slice()}   // slice() so the presenter re-renders when elements change
                                    strokes={props.model.strokes.slice()}
                                    selectedId={props.model.selectedElementId}
                                    brush={props.model.strokeType}
                                    strokeWidth={props.model.strokeWidth}
                                    strokeColor={props.model.strokeColor}
                                    strokeOpacity={props.model.getStrokeOpacity()}
                                    onDropItem={handlerDropItemACB}
                                    onSelect={handlerSelectElementACB}
                                    onDeselect={handlerDeselectACB}
                                    onElementChange={handlerElementChangeACB}
                                    onStrokeEnd={handlerStrokeEndACB}/>;
        }

        // opening an existing canvas, or creating one for /canvas and replacing the URL with its id
        // (replace, so going back does not land on /canvas and create yet another canvas)
        function openCanvasACB(){
            if (canvasId) props.model.loadCanvas(canvasId);
            else props.model.createNewCanvas().then(showNewCanvasACB);
        }
        function showNewCanvasACB(newCanvasId){
            if (newCanvasId) navigate(`/canvas/${newCanvasId}`, { replace: true });
        }
        function handlerCreateRetryACB(){ props.model.createNewCanvas().then(showNewCanvasACB); }
        function handlerOpenRetryACB(){ props.model.loadCanvas(canvasId); }
        function handlerHomeACB(){ navigate("/"); }

        function handlerToolChangeACB(tool){ props.model.setCurrentTool(tool); }

        // topbar
        function handlerRenameStartACB(){ props.model.startRename(); }
        function handlerNameDraftChangeACB(name){ props.model.setCanvasNameDraft(name); }
        function handlerRenameSaveACB(){ props.model.saveRename(); }
        function handlerRenameCancelACB(){ props.model.cancelRename(); }
        function handlerShareToggleACB(){ props.model.toggleCurrentCanvasShared(); }
        function handlerExportACB(succeeded){ props.model.showExportResult(succeeded); }
        function handlerDeleteACB(){ props.model.deleteSelection(); }

        // canvas board
        function handlerDropItemACB(type, position){
            if (type === "photo") props.model.addPhotoElement(position);
            // shapes come in as "shape:star", "shape:circle" ...
            if (type.startsWith("shape:")) props.model.addShapeElement(type.split(":")[1], position);
        }
        function handlerSelectElementACB(id){ props.model.selectElement(id); }
        function handlerDeselectACB(){ props.model.selectElement(null); }
        function handlerElementChangeACB(id, changes){ props.model.updateElement(id, changes); }
        function handlerStrokeEndACB(path){ props.model.drawStroke(path); }

        // shape panel
        function handlerShapeClickACB(shape){ props.model.addShapeAtCentre(shape); }
        function handlerUploadPhotoACB(){ props.model.openPhotoSearch(); }
        function handlerCutACB(){ props.model.cutWithSelectedShape(); }
        function handlerFillACB(){ props.model.fillSelectedShape(); }
        function handlerFillColorChangeACB(color){ props.model.setFillColor(color); }

        // photo search popup
        function handlerPhotoQueryChangeACB(query){ props.model.setPhotoSearchQuery(query); }
        function handlerPhotoSearchACB(){ props.model.doPhotoSearch(); }
        function handlerPhotoOrientationChangeACB(orientation){ props.model.setPhotoSearchOrientation(orientation); }
        function handlerPhotoColorChangeACB(color){ props.model.setPhotoSearchColor(color); }
        function handlerPhotoSelectACB(photo){ props.model.selectPhoto(photo); }
        function handlerPhotoSearchCloseACB(){ props.model.closePhotoSearch(); }

        // stroke panel
        function handlerStrokeTypeChangeACB(type){ props.model.setStrokeType(type); }
        function handlerStrokeWidthChangeACB(width){ props.model.setStrokeWidth(Number(width)); }
        function handlerStrokeColorChangeACB(color){ props.model.setStrokeColor(color); }
    }
);

export { Canvas };
