import { observer } from "mobx-react-lite";
import { GalleryView } from "/src/views/galleryView.jsx";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Gallery = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Gallery(props){
        const navigate = useNavigate();

        // load the canvas list every time the page is opened
        useEffect(loadCanvasesACB, []);

        return <GalleryView canvases={props.model.getGalleryCanvases()}
                            searchText={props.model.gallerySearchText}
                            loading={props.model.isLoadingCanvases()}
                            error={props.model.getCanvasesError()}
                            creating={props.model.creatingCanvas}
                            joinText={props.model.joinCanvasIdDraft}
                            joinError={props.model.joinCanvasIdError}

                            onSearchChange={handlerSearchChangeACB}
                            onRetry={handlerRetryACB}
                            onJoinTextChange={handlerJoinTextChangeACB}
                            onJoin={handlerJoinACB}
                            onNewCanvas={handlerNewCanvasACB}
                            onCardClick={handlerCardClickACB}/>;

        function loadCanvasesACB(){ props.model.loadCanvases(); }

        function handlerSearchChangeACB(text){ props.model.setGallerySearchText(text); }
        function handlerRetryACB(){ props.model.loadCanvases(); }

        // the canvas is created on the server first, then opened
        function handlerNewCanvasACB(){ props.model.createNewCanvas().then(openCanvasACB); }
        function openCanvasACB(canvasId){ if (canvasId) navigate(`/canvas/${canvasId}`); }

        function handlerJoinTextChangeACB(text){ props.model.setJoinCanvasIdDraft(text); }
        function handlerJoinACB(){
            const canvasId = props.model.submitJoinCanvasId();
            if (canvasId) navigate(`/canvas/${canvasId}`);
        }

        function handlerCardClickACB(canvas){ navigate(`/canvas/${canvas._id}`); }
    }
);

export { Gallery };
