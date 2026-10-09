import { observer } from "mobx-react-lite";
import { GalleryView } from "/src/views/galleryView.jsx";
import { useNavigate } from "react-router-dom";

const Gallery = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Gallery(props){
        const navigate = useNavigate();

        return <GalleryView canvases={props.model.getGalleryCanvases()}
                            searchText={props.model.searchText}

                            onSearchChange={handlerSearchChangeACB}
                            onNewCanvas={handlerNewCanvasACB}
                            onCardClick={handlerCardClickACB}/>;

        function handlerSearchChangeACB(text){ props.model.setSearchText(text); }
        function handlerNewCanvasACB(){ navigate("/canvas"); }
        function handlerCardClickACB(canvas){ navigate(`/canvas/${canvas.id}`); }
    }
);

export { Gallery };
