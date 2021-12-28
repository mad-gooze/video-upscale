/**
 * Detects if requestVideoFrameCallback is supported
 *
 * @internal
 */
export function detectRequestVideoFrameCallback(): boolean {
    const video = document.createElement('video');
    return typeof video.requestVideoFrameCallback === 'function';
}
