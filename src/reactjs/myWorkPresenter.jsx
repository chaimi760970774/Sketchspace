import { observer } from "mobx-react-lite";
import { MyWorkView } from "/src/views/myWorkView.jsx";
import { useNavigate } from "react-router-dom";

const MyWork = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function MyWork(props){
        const navigate = useNavigate();

        return <MyWorkView canvases={props.model.getMyCanvases()}
                           folders={props.model.getMyFolders()}
                           searchText={props.model.searchText}
                           selectedFolderId={props.model.selectedFolderId}
                           dragOverTab={props.model.dragOverTab}
                           newFolderOpen={props.model.newFolderOpen}
                           newFolderName={props.model.newFolderName}

                           onSearchChange={handlerSearchChangeACB}
                           onFolderClick={handlerFolderClickACB}
                           onNewFolderOpen={handlerNewFolderOpenACB}
                           onNewFolderNameChange={handlerNewFolderNameChangeACB}
                           onNewFolderCreate={handlerNewFolderCreateACB}
                           onNewFolderCancel={handlerNewFolderCancelACB}
                           onDeleteFolder={handlerDeleteFolderACB}
                           onDragOverTab={handlerDragOverTabACB}
                           onMoveCanvas={handlerMoveCanvasACB}
                           onNewCanvas={handlerNewCanvasACB}
                           onCardClick={handlerCardClickACB}/>;

        function handlerSearchChangeACB(text){ props.model.setSearchText(text); }
        function handlerFolderClickACB(folderId){ props.model.selectFolder(folderId); }
        function handlerNewFolderOpenACB(){ props.model.openNewFolder(); }
        function handlerNewFolderNameChangeACB(name){ props.model.setNewFolderName(name); }
        function handlerNewFolderCreateACB(){ props.model.createFolder(); }
        function handlerNewFolderCancelACB(){ props.model.cancelNewFolder(); }
        function handlerDeleteFolderACB(folderId){ props.model.deleteFolder(folderId); }
        function handlerDragOverTabACB(tab){ props.model.setDragOverTab(tab); }
        function handlerMoveCanvasACB(canvasId, folderId){ props.model.moveCanvasToFolder(canvasId, folderId); }
        function handlerNewCanvasACB(){ navigate("/canvas"); }
        function handlerCardClickACB(canvas){ navigate(`/canvas/${canvas.id}`); }
    }
);

export { MyWork };
