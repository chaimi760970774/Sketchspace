import "/style.css"

export function GalleryView(props){
    return (
        <div>
            {/* hero banner, grey placeholder for now, replace with image later */}
            <div className="hero">
                <h1 className="hero-title">Making Collage Together!</h1>
                <button className="outline-button" onClick={props.onNewCanvas}>Start doodling</button>
            </div>

            <div className="page-content">
                <input className="search-input" placeholder="Search"
                       value={props.searchText} onChange={searchChangeACB}/>

                <div className="toolbar-row">
                    <div className="toolbar-title">Shared canvases</div>
                    <button className="outline-button" onClick={props.onNewCanvas}>New Canvas ◀</button>
                </div>

                {props.canvases.length === 0 && <div className="empty-text">No canvas found</div>}

                <div className="card-list">
                    {props.canvases.map(cardCB)}
                </div>
            </div>
        </div>
    );

    function searchChangeACB(evt){ props.onSearchChange(evt.target.value); }

    function cardCB(canvas){
        function clickCardACB(){ props.onCardClick(canvas); }

        return <div key={canvas.id} className="card-item" onClick={clickCardACB}>{canvas.title}</div>;
    }
}