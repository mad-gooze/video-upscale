/**
 * Detects if ResizeObserver is supported
 */
export function detectResizeObserver(): boolean {
    return typeof ResizeObserver !== 'undefined';
}
