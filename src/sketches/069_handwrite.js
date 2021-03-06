import canvasSketch from 'canvas-sketch';
import random from 'canvas-sketch-util/random';
import { setDrawPolygon } from '../lib/ctx';
import { rope, smoothPath } from '../lib/shape';

const settings = {
    dimensions: 'A4',
    animate: false,
};

const sketch = async () => {
    const generateLine = (fromX, toX, step, height, yOffset) => {
        const linePoints = [];
        for (let i = fromX; i < toX; i += step) {
            linePoints.push([
                i + random.pick([random.range(-step * 4, -step), random.range(0, step / 2)]),
                random.range(-height, height) + yOffset,
            ]);
        }
        return linePoints;
    };

    return ({ context, width, height }) => {
        context.fillStyle = 'hsl(0, 0%, 98%)';
        context.fillRect(0, 0, width, height);

        context.strokeStyle = `hsla(240,100%,20%, 0.3)`;
        context.fillStyle = `hsl(240,100%,15%)`;

        const lineHeight = height / 80;
        let k = 0;
        for (let i = lineHeight * 4; i < height - lineHeight * 4; i += lineHeight * 2.5) {
            let lineLength = 50;
            while (lineLength < width - 80) {
                let wordLength = random.range(width / 10, width / 2);

                if (lineLength + wordLength > width) {
                    wordLength -= lineLength + wordLength - width;
                }

                let lineCoords = generateLine(lineLength, lineLength + wordLength, width / 100, lineHeight, i);
                lineCoords = smoothPath(lineCoords, 2);
                lineCoords = rope(lineCoords.map((i, idx) => [i[0], i[1], random.noise1D(k++, 0.05) / 1.5]));
                setDrawPolygon(context, lineCoords);
                context.fill();
                context.stroke();

                lineLength += wordLength + random.range(width / 30, width / 20);
            }
        }
    };
};

canvasSketch(sketch, settings);
