import "/style.css"
import type { FocusEvent, MouseEvent } from "react";

interface ShareDialogViewProps {
    canvasId: string;
    isShared: boolean;
    copied: boolean;            // Copy was clicked since the popup opened
    isOwner: boolean;           // only the owner can change sharing
    busy: boolean;
    onCopy: () => void;
    onToggleShared: () => void;
    onClose: () => void;
}

// popup opened by the invite button, lets the owner toggle shared/private
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
                    <div className="share-toggle-row">
                        <div>
                            <div className="share-toggle-label">
                                {props.isShared ? "Shared" : "Private"}
                            </div>
                            <div className="share-toggle-hint">
                                {props.isShared
                                    ? "Anyone with the canvas id can join"
                                    : "Only you can access this canvas"}
                            </div>
                        </div>
                        <label className="toggle-switch" title={props.isShared ? "Make private" : "Share in Gallery"}>
                            <input type="checkbox" checked={props.isShared} disabled={props.busy}
                                   onChange={props.onToggleShared} />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                )}

                {!props.isOwner && (
                    <p className="share-toggle-hint">
                        {props.isShared ? "This canvas is shared." : "This canvas is private."}
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
