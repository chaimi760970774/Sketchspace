import { observer } from "mobx-react-lite";
import type { PresenterProps, Canvas } from "/src/model/types.ts";
import { GalleryView } from "/src/views/galleryView.tsx";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Gallery = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Gallery(props: PresenterProps){
        const navigate = useNavigate();

        // load the canvases and folders every time the page is opened
        useEffect(loadMyWorkACB, []);

        return <GalleryView canvases={props.model.getMyCanvases()}
                            sharedCanvases={props.model.getGalleryCanvases()}
                            sharedSearchText={props.model.gallerySearchText}
                            folders={props.model.getMyFolders()}
                            searchText={props.model.myWorkSearchText}
                            loading={props.model.isLoadingCanvases()}
                            error={props.model.getCanvasesError()}
                            creating={props.model.creatingCanvas}
                            getThumbnail={getThumbnailCB}
                            busyCanvasIds={props.model.busyCanvasIds}
                            selectedFolderId={props.model.selectedFolderId}
                            dragOverTab={props.model.dragOverTab}
                            newFolderOpen={props.model.newFolderOpen}
                            newFolderName={props.model.newFolderName}
                            newFolderError={props.model.newFolderError}
                            canUseFolders={props.model.canUseFolders()}
                            foldersLoading={props.model.isLoadingFolders()}
                            foldersError={props.model.getFoldersError()}
                            creatingFolder={props.model.creatingFolder}
                            busyFolderIds={props.model.busyFolderIds}
                            joinText={props.model.joinCanvasIdDraft}
                            joinError={props.model.joinCanvasIdError}

                            onSearchChange={handlerSearchChangeACB}
                            onSharedSearchChange={handlerSharedSearchChangeACB}
                            onRetry={handlerRetryACB}
                            onFoldersRetry={handlerFoldersRetryACB}
                            onFolderClick={handlerFolderClickACB}
                            onNewFolderOpen={handlerNewFolderOpenACB}
                            onNewFolderNameChange={handlerNewFolderNameChangeACB}
                            onNewFolderCreate={handlerNewFolderCreateACB}
                            onNewFolderCancel={handlerNewFolderCancelACB}
                            onNewFolderLeave={handlerNewFolderLeaveACB}
                            onDeleteFolder={handlerDeleteFolderACB}
                            onDragOverTab={handlerDragOverTabACB}
                            onMoveCanvas={handlerMoveCanvasACB}
                            onDeleteCanvas={handlerDeleteCanvasACB}
                            onJoinTextChange={handlerJoinTextChangeACB}
                            onJoin={handlerJoinACB}
                            onNewCanvas={handlerNewCanvasACB}
                            onCardClick={handlerCardClickACB}/>;

        function getThumbnailCB(canvasId: string){ return props.model.getCardThumbnail(canvasId); }
        function loadMyWorkACB(){ props.model.loadMyWork(); }

        function handlerSearchChangeACB(text: string){ props.model.setMyWorkSearchText(text); }
        function handlerSharedSearchChangeACB(text: string){ props.model.setGallerySearchText(text); }
        function handlerRetryACB(){ props.model.loadCanvases(); }
        function handlerFoldersRetryACB(){ props.model.loadFolders(); }
        function handlerFolderClickACB(folderId: string | null){ props.model.selectFolder(folderId); }
        function handlerNewFolderOpenACB(){ props.model.openNewFolder(); }
        function handlerNewFolderNameChangeACB(name: string){ props.model.setNewFolderName(name); }
        function handlerNewFolderCreateACB(){ props.model.createFolder(); }
        function handlerNewFolderCancelACB(){ props.model.cancelNewFolder(); }
        function handlerNewFolderLeaveACB(){ props.model.leaveNewFolder(); }
        function handlerDeleteFolderACB(folderId: string){ props.model.deleteFolder(folderId); }
        function handlerDragOverTabACB(tab: string | null){ props.model.setDragOverTab(tab); }
        function handlerMoveCanvasACB(canvasId: string, folderId: string | null){ props.model.moveCanvasToFolder(canvasId, folderId); }
        function handlerDeleteCanvasACB(canvasId: string){ props.model.removeCanvas(canvasId); }

        function handlerJoinTextChangeACB(text: string){ props.model.setJoinCanvasIdDraft(text); }
        function handlerJoinACB(){
            const canvasId = props.model.submitJoinCanvasId();
            if (canvasId) navigate(`/canvas/${canvasId}`);
        }

        // the canvas is created on the server first, then opened
        function handlerNewCanvasACB(){ props.model.createNewCanvas(props.model.selectedFolderId).then(openCanvasACB); }
        function openCanvasACB(canvasId: string | null){ if (canvasId) navigate(`/canvas/${canvasId}`); }

        function handlerCardClickACB(canvas: Canvas){ navigate(`/canvas/${canvas._id}`); }
    }
);

export { Gallery };
