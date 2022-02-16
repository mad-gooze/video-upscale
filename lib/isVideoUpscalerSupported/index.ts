import { once } from '../once';
import { detectSupport } from './detectSupport';

/**
 * Checks if video-upscale is supported
 */
export const isVideoUpscalerSupported: () => boolean = once(detectSupport);
