import { isVideoUpscalerSupported } from './isVideoUpscalerSupported';
import type { VideoUpscalerProps } from './VideoUpscaler';
import { VideoUpscaler } from './VideoUpscaler';

function initVideoUpscaler(props: VideoUpscalerProps): VideoUpscaler {
    if (!isVideoUpscalerSupported()) {
        throw new Error('video-upscaler is not supported in current browser');
    }
    return new VideoUpscaler(props);
}

export { isVideoUpscalerSupported, initVideoUpscaler };
export type { VideoUpscaler, VideoUpscalerProps };
