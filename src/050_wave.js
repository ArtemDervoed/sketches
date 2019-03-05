import canvasSketch from 'canvas-sketch';
import { lerp } from 'canvas-sketch-util/math';
import { drawLine } from './lib/ctx';
import scb from 'soundcloud-badge';
import audioAnalyser from 'web-audio-analyser';
import { compressArray } from './lib/array';
import { median } from 'd3-array';

const settings = {
    dimensions: [1024, 1024],
    animate: true,
};

const sketch = async ({ width, height }) => {
    const margin = width * 0.1;

    const sx = v => lerp(margin, width - margin, v);
    const sy = v => lerp(margin, height - margin, v);

    let ready = false;
    let analyser;

    let matrixF = [];
    let matrixW = [];

    document.addEventListener('click', () => {
        if (ready) {
            return;
        }
        ready = true;
        scb(
            {
                client_id: 'b95f61a90da961736c03f659c03cb0cc',
                song: 'https://soundcloud.com/lil_peep/spotlight-1',
                dark: true,
                getFonts: true,
            },
            (err, src, data, div) => {
                if (err) {
                    console.error(err);
                    return;
                }

                const audio = new Audio(src);
                audio.crossOrigin = 'Anonymous';
                audio.autoplay = true;
                audio.play();

                analyser = audioAnalyser(audio, { stereo: false });
            }
        );
    });

    return ({ context, width, height, time }) => {
        if (!ready) {
            context.fillStyle = 'hsla(0, 0%, 98%, 1)';
            context.fillRect(0, 0, width, height);

            context.save();
            context.translate(width / 2, height / 2);
            context.rotate(Math.cos(time * 4) / 5);
            context.font = 'bold 90px Arial';
            context.textAlign = 'center';
            context.fillStyle = 'hsl(0, 0%, 20%)';
            context.fillText('Click to start', 0, 0);
            context.restore();
            return;
        }

        if (!analyser) {
            context.fillStyle = 'hsla(0, 0%, 98%, 1)';
            context.fillRect(0, 0, width, height);
            return;
        }

        context.fillStyle = 'hsla(0, 0%, 98%, 0.08)';
        context.fillRect(0, 0, width, height);

        const freqs = analyser.frequencies();
        matrixF = compressArray(freqs, 1000).slice(50, 650);

        const vol = median(freqs);

        const circles = [];
        const total = 15;
        const lP = 0.8 / total;
        const matrixChunkSize = Math.floor(matrixF.length / total);
        for (let i = 0; i < total; i += 1) {
            const matrixPart = matrixF.slice(i * matrixChunkSize, (i + 1) * matrixChunkSize);
            const circleCoords = [];
            for (let j = 0; j < Math.PI * 2; j += 0.1) {
                const matrixItemIdx = Math.floor((j / (Math.PI * 2)) * matrixPart.length);

                const rF = lerp(1 - lP * (i + 1), 1 - lP * i, matrixPart[matrixItemIdx] / (255 / 4));

                circleCoords.push([
                    (rF * Math.cos(j + (time * Math.sqrt(i)) / 2)) / 2 + 0.5, // x
                    (rF * Math.sin(j + (time * Math.sqrt(i)) / 2)) / 2 + 0.5, // y
                ]);
            }
            circles.push(circleCoords);
        }

        circles.forEach((circle, idx) => {
            const circleCoords = circle.map(i => [sx(i[0]), sy(i[1])]);

            context.strokeStyle = `hsl(${vol * 2 + idx * 10 + time*30}, 50%,50%)`;

            drawLine(context, circleCoords, true);
        });
    };
};

canvasSketch(sketch, settings);
