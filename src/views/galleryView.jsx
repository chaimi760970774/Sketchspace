import "/style.css"
import { formatDate } from "/src/utils/formatDate.js";

export function GalleryView(props){
    return (
        <div>
            {/* hero banner, grey placeholder for now, replace with image later */}
            <div className="hero">
                <h1 className="hero-title">Making Collage Together!</h1>
                <button className="outline-button" disabled={props.creating} onClick={props.onNewCanvas}>
                    {props.creating ? "Creating..." : "Start doodling"}
                </button>
            </div>

            <div className="page-content">
                <input className="search-input" placeholder="Search" aria-label="Search canvases"
                       value={props.searchText} onChange={searchChangeACB}/>

                <div className="toolbar-row">
                    <div className="toolbar-title">Shared canvases</div>
                    <button className="outline-button" disabled={props.creating} onClick={props.onNewCanvas}>
                        {props.creating ? "Creating..." : "New Canvas ◀"}
                    </button>
                </div>

                {renderCanvases()}
            </div>
        </div>
    );

    function searchChangeACB(evt){ props.onSearchChange(evt.target.value); }

    function renderCanvases(){
        if (props.loading) return <div className="spinner" role="status" aria-label="Loading canvases"></div>;
        if (props.error)
            return (
                <div className="load-error" role="alert">
                    <span>Could not load canvases: {props.error}</span>
                    <button className="small-button" onClick={props.onRetry}>Retry</button>
                </div>
            );
        if (props.canvases.length === 0)
            return <div className="empty-text">{props.searchText ? "No canvas found" : "No shared canvases yet"}</div>;

        return <div className="card-list">{props.canvases.map(cardCB)}</div>;
    }

    function cardCB(canvas){
        function clickCardACB(){ props.onCardClick(canvas); }

        return (
            <div key={canvas._id} className="card-item" onClick={clickCardACB}>
                <div className="card-name">{canvas.name}</div>
                <div className="card-date">Updated {formatDate(canvas.updatedAt)}</div>
            </div>
        );
    }
}
