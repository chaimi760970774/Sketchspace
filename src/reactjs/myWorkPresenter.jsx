import { observer } from "mobx-react-lite";
import { MyWorkView } from "/src/views/myWorkView.jsx";
import { useNavigate } from "react-router-dom";

const MyWork = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function MyWork(props){
        const navigate = useNavigate();

        return <MyWorkView canvases={props.model.getMyCanvases()}
                           categories={props.model.categories}
                           searchText={props.model.searchText}
                           selectedCategory={props.model.selectedCategory}

                           onSearchChange={handlerSearchChangeACB}
                           onCategoryClick={handlerCategoryClickACB}
                           onNewCanvas={handlerNewCanvasACB}
                           onCardClick={handlerCardClickACB}/>;

        function handlerSearchChangeACB(text){ props.model.setSearchText(text); }
        function handlerCategoryClickACB(category){ props.model.selectCategory(category); }
        function handlerNewCanvasACB(){ navigate("/canvas"); }
        function handlerCardClickACB(canvas){ navigate(`/canvas/${canvas.id}`); }
    }
);

export { MyWork };