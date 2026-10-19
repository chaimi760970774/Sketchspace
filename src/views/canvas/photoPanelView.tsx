import "/style.css";
import type { DragEvent } from "react";
import type { SelectedPhoto } from "/src/model/types.ts";

interface PhotoPanelViewProps {
    selectedPhotos: SelectedPhoto[];
    onUploadPhoto: () => void;
    onRemovePhoto: (id: string) => void;
}

export function PhotoPanelView(props: PhotoPanelViewProps) {
    return (
        <>
            <button className="small-button" onClick={props.onUploadPhoto}>
                Find images on Unsplash
            </button>

            {props.selectedPhotos.length > 0 && (
                <div className="photo-thumbnails">
                    {props.selectedPhotos.map(thumbnailCB)}
                </div>
            )}
        </>
    );

    function thumbnailCB(photo: SelectedPhoto) {
        function dragStartACB(evt: DragEvent<HTMLImageElement>) {
            evt.dataTransfer.setData("text/plain", "photo:" + photo.id);
        }
        function removeACB() { props.onRemovePhoto(photo.id); }
        return (
            <div key={photo.id} className="photo-thumbnail-item">
                <div className="photo-thumbnail-img-wrap">
                    <img src={photo.url} alt={photo.photographer}
                         draggable="true" onDragStart={dragStartACB}
                         title={"Photo by " + photo.photographer + " — drag to canvas"} />
                    <button className="photo-thumbnail-remove" onClick={removeACB} title="Remove photo">×</button>
                </div>
                <span className="photo-thumbnail-credit">{photo.photographer}</span>
            </div>
        );
    }
}
