// draws the outline of a shape inside a width x height box using the Canvas API
// (will also be reused for cutting photos in the next step)
export function drawShapePath(context, shape, width, height){
    // star corners as fractions of the box, same as the panel icon
    const starPoints = [
        [0.50, 0.00], [0.61, 0.35], [0.98, 0.35], [0.68, 0.57], [0.79, 0.91],
        [0.50, 0.70], [0.21, 0.91], [0.32, 0.57], [0.02, 0.35], [0.39, 0.35],
    ];

    context.beginPath();

    if (shape === "square") context.rect(0, 0, width, height);

    if (shape === "circle") context.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);

    if (shape === "triangle"){
        context.moveTo(width / 2, 0);
        context.lineTo(width, height);
        context.lineTo(0, height);
    }

    if (shape === "star"){
        context.moveTo(starPoints[0][0] * width, starPoints[0][1] * height);
        starPoints.slice(1).forEach(drawStarLineCB);
    }

    context.closePath();

    function drawStarLineCB(point){
        context.lineTo(point[0] * width, point[1] * height);
    }
}