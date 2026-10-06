import "/style.css"

export function MyWorkView(props){
    return (
        <div className="page-content">
            <button className="new-canvas-big" onClick={props.onNewCanvas}>+</button>

            <input className="search-input" placeholder="Search"
                   value={props.searchText} onChange={searchChangeACB}/>

            <div className="category-bar">
                {props.categories.map(categoryCB)}
            </div>

            {props.canvases.length === 0 && <div className="empty-text">No canvas found</div>}

            <div className="card-list">
                {props.canvases.map(cardCB)}
            </div>
        </div>
    );

    function searchChangeACB(evt){ props.onSearchChange(evt.target.value); }

    function categoryCB(category){
        function clickCategoryACB(){ props.onCategoryClick(category); }

        const className = category === props.selectedCategory ? "category-item active" : "category-item";
        return <button key={category} className={className} onClick={clickCategoryACB}>{category}</button>;
    }

    function cardCB(canvas){
        function clickCardACB(){ props.onCardClick(canvas); }

        return <div key={canvas.id} className="card-item" onClick={clickCardACB}>{canvas.title}</div>;
    }
}