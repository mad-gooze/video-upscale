/**
 * Detects if ResizeObserver is supported
 * 
 * @internal
 */
export function detectResizeObserver(): boolean {
    return typeof ResizeObserver !== 'undefined';
}
