/**
 * Detects if ResizeObserver is supported
 *
 * @internal
 */
export function detectResizeObserver() {
    return typeof ResizeObserver !== 'undefined';
}
