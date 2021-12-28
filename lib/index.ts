import { isSupported } from './isSupported';
import type { VideoUpscalerProps } from './VideoUpscaler';
import { VideoUpscaler } from './VideoUpscaler';

export function initVideoUpscaler(props: VideoUpscalerProps): VideoUpscaler {
    if (!isSupported) {
        throw new Error('video-upscaler is not supported in current browser');
    }
    return new VideoUpscaler(props);
}

export type { VideoUpscaler, VideoUpscalerProps };
