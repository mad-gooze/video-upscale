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
        fps = fps * 0.9 + 0.1 * 1 / delta;
        // console.log(fps);

        if (video.currentTime > 3) video.pause();
    },
});

window.upscaler = upscaler;
upscaler.enable();

video.play()