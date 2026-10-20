import "/style.css"
import type { FocusEvent, MouseEvent } from "react";

interface ShareDialogViewProps {
    canvasId: string;
    isShared: boolean;          // anyone with the canvas id can join
    isPublic: boolean;          // also listed in the Gallery
    copied: boolean;            // Copy was clicked since the popup opened
    isOwner: boolean;           // only the owner can change sharing
    busy: boolean;
    onCopy: () => void;
    onToggleShared: () => void;
    onTogglePublic: () => void;
    onClose: () => void;
}

// popup opened by the invite button; the owner chooses who can get in: nobody (private), anyone with the
// canvas id, and separately whether the canvas is also listed in the Gallery
export function ShareDialogView(props: ShareDialogViewProps){
    return (
        // clicking the dark background closes the popup
        <div className="modal-overlay" onClick={props.onClose}>
            <div className="modal share-modal" role="dialog" aria-label="Invite to canvas" onClick={stopClickACB}>
                <div className="modal-header">
                    <span>Invite to canvas</span>
                    <button className="icon-button" aria-label="Close" onClick={props.onClose}>×</button>
                </div>

                {props.isOwner && (
                    <>
                        <div className="share-toggle-row">
                            <div>
                                <div className="share-toggle-label">Share with the canvas id</div>
                                <div className="share-toggle-hint">
                                    {props.isShared
                                        ? "Anyone with the canvas id can join. It stays out of the Gallery unless you make it public."
                                        : "Private: only you can access this canvas"}
                                </div>
                            </div>
                            <label className="toggle-switch" title={props.isShared ? "Make private" : "Share with the canvas id"}>
                                <input type="checkbox" aria-label="Share with the canvas id" checked={props.isShared}
                                       disabled={props.busy} onChange={props.onToggleShared} />
                                <span className="toggle-slider" />
                            </label>
                        </div>

                        <div className="share-toggle-row">
                            <div>
                                <div className="share-toggle-label">Public for All</div>
                                <div className="share-toggle-hint">
                                    {props.isPublic
                                        ? "Turning this on will make the canvas publicly available for everybody."
                                        : "Not listed in the Gallery. Turning this on also shares it."}
                                </div>
                            </div>
                            <label className="toggle-switch" title={props.isPublic ? "Remove from the Gallery" : "Show in the Gallery"}>
                                <input type="checkbox" aria-label="Public in the Gallery" checked={props.isPublic}
                                       disabled={props.busy} onChange={props.onTogglePublic} />
                                <span className="toggle-slider" />
                            </label>
                        </div>
                    </>
                )}

                {!props.isOwner && (
                    <p className="share-toggle-hint">
                        {props.isPublic ? "This canvas is public in the Gallery." : props.isShared ? "This canvas is shared by id." : "This canvas is private."}
                    </p>
                )}

                {props.isShared && (
                    <>
                        <p>Send this canvas id to anyone. They can paste it into <b>Draw together with others</b> on the Gallery page to join you.</p>
                        <div className="share-id-row">
                            <input className="search-input" readOnly aria-label="Canvas id" value={props.canvasId} onFocus={focusACB}/>
                            <button className="small-button" onClick={props.onCopy}>{props.copied ? "Copied ✓" : "Copy"}</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    function stopClickACB(evt: MouseEvent<HTMLDivElement>){ evt.stopPropagation(); }
    function focusACB(evt: FocusEvent<HTMLInputElement>){ evt.target.select(); }
}
