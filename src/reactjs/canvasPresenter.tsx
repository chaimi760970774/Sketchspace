import { observer } from "mobx-react-lite";
import { saveThumbnail } from "/src/utils/thumbnailStore.ts";
import { CanvasView } from "/src/views/canvas/canvasView.tsx";
import { CanvasBoardView } from "/src/views/canvas/canvasBoardView.tsx";
import { CanvasStatusView } from "/src/views/canvas/canvasStatusView.tsx";
import { CanvasToolbarView } from "/src/views/canvas/canvasToolbarView.tsx";
import { ShapePanelView } from "/src/views/canvas/shapePanelView.tsx";
import { StrokePanelView } from "/src/views/canvas/strokePanelView.tsx";
import { PhotoPanelView } from "/src/views/canvas/photoPanelView.tsx";
import { ShareDialogView } from "/src/views/canvas/shareDialogView.tsx";
import { PhotoSearchView } from "/src/views/canvas/photoSearchView.tsx";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import type { RefObject } from "react";
import type Konva from "konva";
import type { PresenterProps, Brush, ElementChanges, Point, ShapeName, Tool, UnsplashPhoto } from "/src/model/types.ts";

const Canvas = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Canvas(props: PresenterProps){
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

        // the owner made the canvas private or deleted it while we were in it
        if (props.model.canvasRemoved)
            return <CanvasStatusView title={props.model.canvasRemoved === "deleted" ? "This canvas was deleted" : "This canvas is now private"}
                                     message={props.model.canvasRemoved === "deleted"
                                         ? "The owner deleted it."
                                         : "The owner stopped sharing it, so you can no longer draw here."}
                                     onHome={handlerHomeACB}/>;

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
        const canvas = props.model.currentCanvas;
        if (!canvas || !props.model.isCanvasOpen(canvasId))
            return <CanvasStatusView loading message="Opening canvas..."/>;

        return (
            <>
            <CanvasView currentTool={props.model.currentTool}
                        toolPanelOpen={props.model.toolPanelOpen}
                        liveStatus={props.model.liveStatus}
                        peerCount={props.model.peerCount}
                        liveLabel={props.model.getLiveLabel()}
                        credits={props.model.getPhotoCredits()}
                        canvasName={canvas.name}
                        isShared={canvas.isShared}
                        isOwner={props.model.isCurrentCanvasOwner()}
                        busy={props.model.isCanvasBusy(canvas._id)}
                        renaming={props.model.renamingCanvas}
                        nameDraft={props.model.canvasNameDraft}
                        nameError={props.model.canvasNameError}
                        saveStatus={props.model.getSaveStatus()}
                        canDelete={props.model.canDeleteSelection()}
                        onDeselect={handlerDeselectACB}
                        eraserOn={props.model.eraserOn}
                        eyedropperOn={props.model.eyedropperOn}
                        canUndo={props.model.canUndo()}
                        canRedo={props.model.canRedo()}

                        onHomeClick={handlerHomeACB}
                        onGalleryClick={handlerGalleryClickACB}
                        onProfileClick={() => navigate("/profile")}
                        onRenameStart={handlerRenameStartACB}
                        onNameDraftChange={handlerNameDraftChangeACB}
                        onRenameSave={handlerRenameSaveACB}
                        onRenameCancel={handlerRenameCancelACB}
                        onToolPanelPress={handlerToolPanelPressACB}
                        onClear={handlerClearACB}
                        onShare={handlerShareACB}
                        onExport={handlerExportACB}
                        onDelete={handlerDeleteACB}
                        onUndo={handlerUndoACB}
                        onRedo={handlerRedoACB}
                        onCaptureThumbnail={handlerCaptureThumbnailACB}

                        renderToolbar={renderToolbarCB}
                        renderBoard={renderBoardCB}>

                {props.model.currentTool === "shape" &&
                    <ShapePanelView canCut={props.model.canCut()}
                                    canFill={props.model.canFill()}
                                    shapeActionHint={props.model.getShapeActionHint()}
                                    fillColor={props.model.fillColor}
                                    onCut={handlerCutACB}
                                    onFill={handlerFillACB}
                                    onFillColorChange={handlerFillColorChangeACB}
                                    onShapeClick={handlerShapeClickACB}/>}

                {props.model.currentTool === "stroke" &&
                    <StrokePanelView strokeType={props.model.strokeType}
                                     strokeWidth={props.model.strokeWidth}
                                     strokeColor={props.model.strokeColor}
                                     strokeOpacity={props.model.strokeOpacity}
                                     onStrokeTypeChange={handlerStrokeTypeChangeACB}
                                     onStrokeWidthChange={handlerStrokeWidthChangeACB}
                                     onStrokeOpacityChange={handlerStrokeOpacityChangeACB}
                                     onStrokeColorChange={handlerStrokeColorChangeACB}/>}

                {props.model.currentTool === "photo" &&
                    <PhotoPanelView selectedPhotos={props.model.selectedPhotos.slice()}
                                    onUploadPhoto={handlerUploadPhotoACB}
                                    onRemovePhoto={handlerRemovePhotoACB}/>}
            </CanvasView>

            {props.model.shareDialogOpen &&
                <ShareDialogView canvasId={canvas._id}
                                 isShared={canvas.isShared}
                                 copied={props.model.shareCopied}
                                 isOwner={props.model.isCurrentCanvasOwner()}
                                 busy={props.model.isCanvasBusy(canvas._id)}
                                 onCopy={handlerCopyIdACB}
                                 onToggleShared={handlerToggleSharedACB}
                                 onClose={handlerShareCloseACB}/>}

            {props.model.photoSearchOpen &&
                <PhotoSearchView query={props.model.photoSearchQuery}
                                 hint={props.model.photoSearchHint}
                                 orientation={props.model.photoSearchOrientation}
                                 color={props.model.photoSearchColor}
                                 photos={searchState.data}
                                 loading={Boolean(searchState.promise && !searchState.data && !searchState.error)}
                                 error={searchState.error}

                                 onQueryChange={handlerPhotoQueryChangeACB}
                                 onOrientationChange={handlerPhotoOrientationChangeACB}
                                 onColorChange={handlerPhotoColorChangeACB}
                                 onSearch={handlerPhotoSearchACB}
                                 pendingSelection={props.model.pendingPhotoSelection.map(p => p.id)}
                                 onPhotoToggle={handlerPhotoToggleACB}
                                 onConfirm={handlerPhotoConfirmACB}
                                 onDeselectAll={handlerDeselectAllACB}
                                 onClose={handlerPhotoSearchCloseACB}/>}
            </>
        );

        function renderToolbarCB(){
            return (
                <CanvasToolbarView
                    currentTool={props.model.currentTool}
                    eraserOn={props.model.eraserOn}
                    eyedropperOn={props.model.eyedropperOn}
                    canUndo={props.model.canUndo()}
                    canRedo={props.model.canRedo()}
                    onToolClick={handlerToolClickACB}
                    onEraserClick={handlerEraserToggleACB}
                    onEyedropperClick={handlerEyedropperToggleACB}
                    onUploadLocalFile={handlerUploadLocalFileACB}
                    onUndo={handlerUndoACB}
                    onRedo={handlerRedoACB}
                />
            );
        }

        // the view keeps the Konva stage (it needs it for export) and hands it in here
        function renderBoardCB(stageRef: RefObject<Konva.Stage | null>){
            return <CanvasBoardView stageRef={stageRef}
                                    currentTool={props.model.currentTool}
                                    eraserOn={props.model.eraserOn}
                                    eyedropperOn={props.model.eyedropperOn}
                                    elements={props.model.elements.slice()}   // slice() so the presenter re-renders when elements change
                                    strokes={props.model.strokes.slice()}
                                    selectedId={props.model.selectedElementId}
                                    brush={props.model.strokeType}
                                    strokeWidth={props.model.strokeWidth}
                                    strokeColor={props.model.strokeColor}
                                    strokeOpacity={props.model.strokeOpacity}
                                    onDropItem={handlerDropItemACB}
                                    onSelect={handlerSelectElementACB}
                                    onDeselect={handlerDeselectACB}
                                    onElementChange={handlerElementChangeACB}
                                    onStrokeEnd={handlerStrokeEndACB}
                                    onErase={handlerEraseACB}
                                    onEraseEnd={handlerEraseEndACB}
                                    onColorPick={handlerColorPickACB}/>;
        }

        // opening an existing canvas, or creating one for /canvas and replacing the URL with its id
        // (replace, so going back does not land on /canvas and create yet another canvas)
        function openCanvasACB(){
            if (canvasId) props.model.loadCanvas(canvasId);
            else props.model.createNewCanvas().then(showNewCanvasACB);
            return leaveCanvasACB;
        }
        // leaving the page (or opening another canvas) leaves the live room
        function leaveCanvasACB(){ props.model.leaveLiveCanvas(); }
        function showNewCanvasACB(newCanvasId: string | null){
            if (newCanvasId) navigate(`/canvas/${newCanvasId}`, { replace: true });
        }
        function handlerCreateRetryACB(){ props.model.createNewCanvas().then(showNewCanvasACB); }
        function handlerOpenRetryACB(){ if (canvasId) props.model.loadCanvas(canvasId); }
        function handlerHomeACB(){ navigate("/"); }
        function handlerGalleryClickACB(){ navigate("/gallery"); }

        function handlerToolClickACB(tool: Tool){ props.model.setCurrentTool(tool); }

        // topbar
        function handlerRenameStartACB(){ props.model.startRename(); }
        function handlerNameDraftChangeACB(name: string){ props.model.setCanvasNameDraft(name); }
        function handlerRenameSaveACB(){ props.model.saveRename(); }
        function handlerRenameCancelACB(){ props.model.cancelRename(); }
        function handlerEraserToggleACB(){ props.model.toggleEraser(); }
        function handlerEyedropperToggleACB(){ props.model.toggleEyedropper(); }
        function handlerColorPickACB(color: string){
            props.model.setStrokeColor(color);
        }
        function handlerToolPanelPressACB(){ props.model.turnEraserOff(); }
        function handlerClearACB(){ props.model.clearCanvas(); }
        function handlerShareACB(){ props.model.openShareDialog(); }
        function handlerCopyIdACB(){ props.model.copyCanvasId(); }
        function handlerToggleSharedACB(){ props.model.toggleCanvasShared(); }
        function handlerShareCloseACB(){ props.model.closeShareDialog(); }
        function handlerExportACB(succeeded: boolean){ props.model.showExportResult(succeeded); }
        function handlerDeleteACB(){ props.model.deleteSelection(); }
        function handlerUndoACB(){ props.model.undo(); }
        function handlerRedoACB(){ props.model.redo(); }
        function handlerCaptureThumbnailACB(dataUrl: string | null): void {
            if (canvasId && dataUrl) saveThumbnail(canvasId, dataUrl);
        }

        // canvas board
        function handlerDropItemACB(type: string, position: Point){
            if (type.startsWith("photo:")) props.model.addPhotoElement(type.slice(6), position);
            // shapes come in as "shape:star", "shape:circle" ...
            if (type.startsWith("shape:")) props.model.addShapeElement(type.split(":")[1], position);
        }
        function handlerSelectElementACB(id: string){ props.model.selectElement(id); }
        function handlerDeselectACB(){ props.model.selectElement(null); }
        function handlerElementChangeACB(id: string, changes: ElementChanges){ props.model.updateElement(id, changes); }
        function handlerStrokeEndACB(path: Point[]){ props.model.drawStroke(path); }
        function handlerEraseACB(point: Point){ props.model.eraseAt(point); }
        function handlerEraseEndACB(){ props.model.endErase(); }

        // shape panel
        function handlerShapeClickACB(shape: ShapeName){ props.model.addShapeAtCentre(shape); }
        function handlerUploadPhotoACB(){ props.model.openPhotoSearch(); }
        function handlerUploadLocalFileACB(file: File): void {
            const reader = new FileReader();
            reader.onload = function(e): void {
                const dataUrl = e.target?.result as string;
                if (!dataUrl) return;
                const img = new window.Image();
                img.onload = function(): void {
                    props.model.addLocalPhotoElement(dataUrl, img.naturalHeight / img.naturalWidth);
                };
                img.src = dataUrl;
            };
            reader.readAsDataURL(file);
        }
        function handlerRemovePhotoACB(id: string){ props.model.removeSelectedPhoto(id); }
        function handlerCutACB(){ props.model.cutWithSelectedShape(); }
        function handlerFillACB(){ props.model.fillSelectedShape(); }
        function handlerFillColorChangeACB(color: string){ props.model.setFillColor(color); }

        // photo search popup
        function handlerPhotoQueryChangeACB(query: string){ props.model.setPhotoSearchQuery(query); }
        function handlerPhotoSearchACB(){ props.model.doPhotoSearch(); }
        function handlerPhotoOrientationChangeACB(orientation: string){ props.model.setPhotoSearchOrientation(orientation); }
        function handlerPhotoColorChangeACB(color: string){ props.model.setPhotoSearchColor(color); }
        function handlerPhotoToggleACB(photo: UnsplashPhoto){ props.model.togglePendingPhoto(photo); }
        function handlerPhotoConfirmACB(){ props.model.confirmPhotoSelection(); }
        function handlerDeselectAllACB(){ props.model.clearPendingSelection(); }
        function handlerPhotoSearchCloseACB(){ props.model.closePhotoSearch(); }

        // stroke panel
        function handlerStrokeTypeChangeACB(type: Brush){ props.model.setStrokeType(type); }
        function handlerStrokeWidthChangeACB(width: string){ props.model.setStrokeWidth(Number(width)); }
        function handlerStrokeColorChangeACB(color: string){ props.model.setStrokeColor(color); }
        function handlerStrokeOpacityChangeACB(opacity: number){ props.model.setStrokeOpacity(opacity); }
    }
);

export { Canvas };
