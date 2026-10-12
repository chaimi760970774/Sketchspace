import "/style.css"

// values are the ones the Unsplash API accepts
const ORIENTATIONS = [
    { value: "any", label: "Any orientation" },
    { value: "landscape", label: "Landscape" },
    { value: "portrait", label: "Portrait" },
    { value: "squarish", label: "Square" },
];
const COLORS = [
    { value: "any", label: "Any colour" },
    { value: "black_and_white", label: "Black and white" },
    { value: "black", label: "Black" },
    { value: "white", label: "White" },
    { value: "yellow", label: "Yellow" },
    { value: "orange", label: "Orange" },
    { value: "red", label: "Red" },
    { value: "purple", label: "Purple" },
    { value: "magenta", label: "Magenta" },
    { value: "green", label: "Green" },
    { value: "teal", label: "Teal" },
    { value: "blue", label: "Blue" },
];

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
                    <input className="search-input" placeholder="Search photos, e.g. forest" aria-label="Search photos"
                           value={props.query} onChange={queryChangeACB}/>
                    <button className="small-button" type="submit">Search</button>
                </form>

                <div className="photo-filters">
                    <select aria-label="Orientation" value={props.orientation} onChange={orientationChangeACB}>
                        {ORIENTATIONS.map(optionCB)}
                    </select>
                    <select aria-label="Colour" value={props.color} onChange={colorChangeACB}>
                        {COLORS.map(optionCB)}
                    </select>
                </div>

                {renderResults()}
            </div>
        </div>
    );

    // stop clicks inside the popup from closing it
    function stopClickACB(evt){ evt.stopPropagation(); }
    function queryChangeACB(evt){ props.onQueryChange(evt.target.value); }
    function orientationChangeACB(evt){ props.onOrientationChange(evt.target.value); }
    function colorChangeACB(evt){ props.onColorChange(evt.target.value); }
    function optionCB(option){ return <option key={option.value} value={option.value}>{option.label}</option>; }
    function submitSearchACB(evt){
        evt.preventDefault();
        props.onSearch();
    }

    function renderResults(){
        if (props.hint) return <div className="field-error">{props.hint}</div>;
        if (props.error) return <div className="empty-text">Something went wrong, please try again</div>;
        if (props.loading) return <div className="spinner" role="status" aria-label="Searching photos"></div>;
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