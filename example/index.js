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

canvas.onmousedown = () => {
    canvas.style.opacity = 0;
    document.documentElement.onmouseup = () =>
        (canvas.style.opacity = 0.999999);
};


canvas.ontouchstart = () => {
    canvas.style.opacity = 0;
    document.documentElement.ontouchend = () =>
        (canvas.style.opacity = 0.999999);
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