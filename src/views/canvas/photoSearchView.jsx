import "/style.css"

export function PhotoSearchView(props){
    return (
        // clicking the dark background closes the popup
        <div className="modal-overlay" onClick={props.onClose}>
            <div className="modal" onClick={stopClickACB}>
                <div className="modal-header">
                    <span>Find a photo on Unsplash</span>
                    <button className="icon-button" onClick={props.onClose}>×</button>
                </div>

                <form className="photo-search-form" onSubmit={submitSearchACB}>
                    <input className="search-input" placeholder="Search photos, e.g. forest"
                           value={props.query} onChange={queryChangeACB}/>
                    <button className="small-button" type="submit">Search</button>
                </form>

                {renderResults()}
            </div>
        </div>
    );

    // stop clicks inside the popup from closing it
    function stopClickACB(evt){ evt.stopPropagation(); }
    function queryChangeACB(evt){ props.onQueryChange(evt.target.value); }
    function submitSearchACB(evt){
        evt.preventDefault();
        props.onSearch();
    }

    function renderResults(){
        if (props.error) return <div className="empty-text">Something went wrong, please try again</div>;
        if (props.loading) return <div className="empty-text">Loading...</div>;
        if (!props.photos) return <div className="empty-text">Type a keyword to search</div>;
        if (props.photos.length === 0) return <div className="empty-text">No photos found</div>;

        return <div className="photo-grid">{props.photos.map(photoCB)}</div>;
    }

    function photoCB(photo){
        function clickPhotoACB(){ props.onPhotoSelect(photo); }

        // photographer credit, required by Unsplash guidelines
        const creditLink = photo.user.links.html + "?utm_source=sketchspace&utm_medium=referral";

        return (
            <div key={photo.id} className="photo-item">
                <img src={photo.urls.small} alt={photo.alt_description} onClick={clickPhotoACB}/>
                <a href={creditLink} target="_blank" rel="noreferrer">{photo.user.name}</a>
            </div>
        );
    }
}