// Turns a picked image file into a small square JPEG for the profile photo.
// The <canvas> is a browser object that can only be configured by changing it (width, fillStyle ...),
// so mutation is unavoidable here.

const AVATAR_SIZE = 256;                        // width and height in pixels
const MAX_DATA_URL_LENGTH = 204800;             // the server's limit for the whole data URL string
const JPEG_QUALITIES = [0.85, 0.6, 0.4];        // tried in order until the result is small enough

// resolves to a "data:image/jpeg;base64,..." URL, cropped to the center square and scaled to 256x256;
// rejects if the browser cannot read the image or the result is still too large
export function resizeAvatar(file: Blob): Promise<string> {
    return createImageBitmap(file).then(drawACB, readFailedACB);

    function readFailedACB(): never { throw new Error("Could not read this image"); }

    function drawACB(bitmap: ImageBitmap): string {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const context = canvas.getContext("2d");
        if (!context) {
            bitmap.close();
            throw new Error("This browser cannot resize images");
        }

        // the largest centered square of the image
        const side = Math.min(bitmap.width, bitmap.height);
        const sourceX = (bitmap.width - side) / 2;
        const sourceY = (bitmap.height - side) / 2;

        // JPEG has no transparency, so see-through parts become white instead of black
        context.fillStyle = "white";
        context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
        context.imageSmoothingQuality = "high";
        context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
        bitmap.close();         // frees the decoded full-size image

        const dataUrl = exportFitting(canvas, JPEG_QUALITIES);
        if (!dataUrl) throw new Error("The image is too large, please choose a simpler one");
        return dataUrl;
    }
}

// the first export that fits the server's limit, null if none does
function exportFitting(canvas: HTMLCanvasElement, qualities: number[]): string | null {
    if (qualities.length === 0) return null;
    const dataUrl = canvas.toDataURL("image/jpeg", qualities[0]);
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl;
    return exportFitting(canvas, qualities.slice(1));
}
