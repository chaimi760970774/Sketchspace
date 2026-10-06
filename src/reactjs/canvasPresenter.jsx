import { observer } from "mobx-react-lite";
import { CanvasView } from "/src/views/canvasView.jsx";
import { ShapePanelView } from "/src/views/shapePanelView.jsx";
import { StrokePanelView } from "/src/views/strokePanelView.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { createCanvas, joinCanvas, sendStroke, updateCanvas } from "/src/canvasApi.js";

const Canvas = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Canvas(props){
        const navigate = useNavigate();
        const { canvasId } = useParams();   // undefined for a new canvas, which is created on the backend below

        useEffect(setupCanvasACB, [canvasId]);

        return (
            <CanvasView currentTool={props.model.currentTool}
                        collaborators={props.model.collaborators}
                        peers={props.model.peers}
                        strokes={props.model.strokes}
                        strokeColor={props.model.strokeColor}
                        strokeWidth={props.model.strokeWidth}
                        error={props.model.canvasError}
                        onStrokeFinished={handlerStrokeFinishedACB}

                        onHomeClick={() => navigate("/gallery")}
                        onProfileClick={() => navigate("/profile")}
                        onToolChange={handlerToolChangeACB}
                        onUndo={handlerUndoACB}
                        onRedo={handlerRedoACB}
                        onSave={handlerSaveACB}
                        onExport={handlerExportACB}
                        onShare={handlerShareACB}>

                {props.model.currentTool === "shape"
                    ? <ShapePanelView selectedShape={props.model.selectedShape}
                                      onShapeSelect={handlerShapeSelectACB}
                                      onUploadPhoto={handlerUploadPhotoACB}
                                      onFillColor={handlerFillColorACB}/>

                    : <StrokePanelView strokeType={props.model.strokeType}
                                       strokeWidth={props.model.strokeWidth}
                                       strokeColor={props.model.strokeColor}
                                       onStrokeTypeChange={handlerStrokeTypeChangeACB}
                                       onStrokeWidthChange={handlerStrokeWidthChangeACB}
                                       onStrokeColorChange={handlerStrokeColorChangeACB}/>}
            </CanvasView>
        );

        function setupCanvasACB(){
            const model = props.model;
            let leave = null;
            let cancelled = false;
            model.setStrokes([]);
            model.setPeers(0);
            model.setCanvasError(null);

            if (!canvasId){
                // new canvas: create it shared, then reopen this page on its id
                createCanvas("Untitled", true)
                    .then(function createdACB(res){ if (!cancelled) navigate("/canvas/" + res.canvasId, { replace: true }); })
                    .catch(function failedACB(err){ model.setCanvasError(err.message); });
            } else {
                leave = joinCanvas(canvasId, {
                    onJoined: function joinedACB(strokes){ model.setCanvasError(null); model.setStrokes(strokes); },
                    onStroke: function strokeACB(stroke){ model.addStroke(stroke); },
                    onPeers: function peersACB(count){ model.setPeers(count); },
                    onError: function errorACB(message){ model.setCanvasError(message); },
                });
            }
            return function cleanupACB(){ cancelled = true; if (leave) leave(); };
        }

        function handlerStrokeFinishedACB(path){
            if (!canvasId) return;
            const model = props.model;
            const stroke = {
                canvasId,
                layerId: "foreground",
                brush: model.strokeType,
                size: model.strokeWidth,
                color: model.strokeColor,
                opacity: 1,
                path: path.slice(0, 5000),      // the API accepts 1..5000 points
            };
            model.addStroke(stroke);            // other people's strokes are broadcast, our own is not echoed back
            sendStroke(stroke, function ackACB(res){
                if (!res.ok) model.setCanvasError(res.error);
            });
        }

        function handlerToolChangeACB(tool){ props.model.setCurrentTool(tool); }

        // shape panel
        function handlerShapeSelectACB(shape){ props.model.selectShape(shape); }

        // stroke panel
        function handlerStrokeTypeChangeACB(type){ props.model.setStrokeType(type); }
        function handlerStrokeWidthChangeACB(width){ props.model.setStrokeWidth(Number(width)); }
        function handlerStrokeColorChangeACB(color){ props.model.setStrokeColor(color); }

        // features below will be done later, only logging for now
        function handlerUploadPhotoACB(){ console.log("upload photo"); }
        function handlerFillColorACB(){ console.log("fill color"); }
        function handlerUndoACB(){ console.log("undo"); }
        function handlerRedoACB(){ console.log("redo"); }
        function handlerSaveACB(){ console.log("save canvas:", canvasId); }
        function handlerExportACB(){ console.log("export canvas:", canvasId); }
        function handlerShareACB(){
            if (canvasId) updateCanvas(canvasId, { isShared: true }).catch(function failedACB(err){ props.model.setCanvasError(err.message); });
        }
    }
);

export { Canvas };