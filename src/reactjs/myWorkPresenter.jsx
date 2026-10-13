import { observer } from "mobx-react-lite";
import { MyWorkView } from "/src/views/myWorkView.jsx";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const MyWork = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function MyWork(props){
        const navigate = useNavigate();

        // load the canvas list every time the page is opened
        useEffect(loadCanvasesACB, []);

        return <MyWorkView canvases={props.model.getMyCanvases()}
                           folders={props.model.getMyFolders()}
                           searchText={props.model.myWorkSearchText}
                           loading={props.model.isLoadingCanvases()}
                           error={props.model.getCanvasesError()}
                           creating={props.model.creatingCanvas}
                           busyCanvasIds={props.model.busyCanvasIds}
                           selectedFolderId={props.model.selectedFolderId}
                           dragOverTab={props.model.dragOverTab}
                           newFolderOpen={props.model.newFolderOpen}
                           newFolderName={props.model.newFolderName}
                           newFolderError={props.model.newFolderError}

                           onSearchChange={handlerSearchChangeACB}
                           onRetry={handlerRetryACB}
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
                           onShareChange={handlerShareChangeACB}
                           onNewCanvas={handlerNewCanvasACB}
                           onCardClick={handlerCardClickACB}/>;

        function loadCanvasesACB(){ props.model.loadCanvases(); }

        function handlerSearchChangeACB(text){ props.model.setMyWorkSearchText(text); }
        function handlerRetryACB(){ props.model.loadCanvases(); }
        function handlerFolderClickACB(folderId){ props.model.selectFolder(folderId); }
        function handlerNewFolderOpenACB(){ props.model.openNewFolder(); }
        function handlerNewFolderNameChangeACB(name){ props.model.setNewFolderName(name); }
        function handlerNewFolderCreateACB(){ props.model.createFolder(); }
        function handlerNewFolderCancelACB(){ props.model.cancelNewFolder(); }
        function handlerNewFolderLeaveACB(){ props.model.leaveNewFolder(); }
        function handlerDeleteFolderACB(folderId){ props.model.deleteFolder(folderId); }
        function handlerDragOverTabACB(tab){ props.model.setDragOverTab(tab); }
        function handlerMoveCanvasACB(canvasId, folderId){ props.model.moveCanvasToFolder(canvasId, folderId); }
        function handlerDeleteCanvasACB(canvasId){ props.model.removeCanvas(canvasId); }
        function handlerShareChangeACB(canvasId, isShared){ props.model.setCanvasShared(canvasId, isShared); }

        // the canvas is created on the server first, then opened
        function handlerNewCanvasACB(){ props.model.createNewCanvas().then(openCanvasACB); }
        function openCanvasACB(canvasId){ if (canvasId) navigate(`/canvas/${canvasId}`); }

        function handlerCardClickACB(canvas){ navigate(`/canvas/${canvas._id}`); }
    }
);

export { MyWork };
