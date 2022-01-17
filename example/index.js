import { initVideoUpscaler } from '../dist';

const canvas = document.getElementById('canvas');
const video = document.getElementById('video');

let lastCalledTime;
let fps;

const upscaler = initVideoUpscaler({
    canvas,
    video,
    onFrameRendered: () => {
        const now = performance.now();
        if (!lastCalledTime) {
            lastCalledTime = now;
            fps = 25;
            return;
        }

        const delta = (now - lastCalledTime) / 1000;
        lastCalledTime = now;
        fps = fps * 0.9 + (0.1 * 1) / delta;
        // console.log(fps);
    },
});

window.upscaler = upscaler;
upscaler.enable();

video.play();

document.documentElement.onkeydown = (e) => {
    if (e.key !== ' ') {
        return;
    }
    canvas.style.display = 'none';
    document.documentElement.onkeyup = () => {
        if (e.key !== ' ') {
            return;
        }
        canvas.style.display = 'block';
    };
};

canvas.onmousedown = () => {
    canvas.style.display = 'none';
    document.documentElement.onmouseup = () => (canvas.style.display = 'block');
};

canvas.ontouchstart = () => {
    canvas.style.display = 'none';
    document.documentElement.ontouchend = () =>
        (canvas.style.display = 'block');
};

document.getElementById('reverseBtn').onclick = () => {
    video.currentTime -= 5;
};
document.getElementById('forwardBtn').onclick = () => {
    video.currentTime += 5;
};
document.getElementById('playPauseBtn').onclick = () => {
    video.paused ? video.play() : video.pause();
};
