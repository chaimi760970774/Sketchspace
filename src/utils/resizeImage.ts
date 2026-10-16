// Crops a picture to a centred square and scales it to size x size pixels, in the browser (canvas).
// Every profile photo then has the same shape and a small file size, whatever the user picked.
// The circle itself is drawn by CSS (border-radius: 50%, see .profile-avatar in style.css).
export function resizeToSquare(file: File, size: number): Promise<File> {
    function executorACB(resolve: (resized: File) => void, reject: (error: Error) => void): void {
        const url = URL.createObjectURL(file);
        const image = new Image();

        image.onload = function loadedACB(): void {
            URL.revokeObjectURL(url);
            const side = Math.min(image.naturalWidth, image.naturalHeight);      // the largest centred square
            const left = (image.naturalWidth - side) / 2;
            const top = (image.naturalHeight - side) / 2;

            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext("2d");
            if (!context) { reject(new Error("This browser cannot resize images")); return; }
            context.drawImage(image, left, top, side, side, 0, 0, size, size);

            // WebP where the browser can make it; otherwise it answers with a PNG, which the server accepts too
            canvas.toBlob(blobACB, "image/webp", 0.9);
        };
        image.onerror = function loadFailedACB(): void {
            URL.revokeObjectURL(url);
            reject(new Error("The file could not be read as an image"));
        };
        image.src = url;

        function blobACB(blob: Blob | null): void {
            if (!blob) { reject(new Error("The image could not be resized")); return; }
            const extension = blob.type === "image/png" ? "png" : "webp";
            resolve(new File([blob], "avatar." + extension, { type: blob.type }));
        }
    }
    return new Promise<File>(executorACB);
}
