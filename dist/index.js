import { isSupported } from './isSupported';
import { VideoUpscaler } from './VideoUpscaler';
export function initVideoUpscaler(props) {
    if (!isSupported) {
        throw new Error('video-upscaler is not supported in current browser');
    }
    return new VideoUpscaler(props);
}
