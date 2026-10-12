// saves everything on the Konva stage as a PNG file, returns true if it worked
// The Konva nodes, the <canvas> and the <a> link below are browser objects that can only be
// configured by changing them (hide/show, width, fillStyle, href ...), so mutation is unavoidable here.
export function downloadStageImage(stage, fileName){
    // hide the resize handles so they don't end up in the picture
    const transformers = stage.find("Transformer");
    transformers.forEach(hideCB);
    const drawing = stage.toCanvas({ pixelRatio: 2 });     // a normal <canvas>, 2x for a sharper picture
    transformers.forEach(showCB);

    // the stage is see-through, so paint it on a white background first
    const canvas = document.createElement("canvas");
    canvas.width = drawing.width;
    canvas.height = drawing.height;
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(drawing, 0, 0);

    // toDataURL throws if a photo on the canvas was loaded without CORS permission
    try {
        // click a temporary link to start the download
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = fileName;
        link.click();
        return true;
    } catch (error) {
        return false;
    }

    function hideCB(node){ node.hide(); }
    function showCB(node){ node.show(); }
}
