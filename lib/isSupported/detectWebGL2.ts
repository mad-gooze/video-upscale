/**
 * Detects if WebGL2 is supported
 */
export function detectWebGL2(): boolean {
    if (typeof WebGL2RenderingContext === undefined) {
        return false;
    }

    try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('webgl2');
        return context !== null && typeof context.getParameter == 'function';
    } catch {
        return false;
    }
}
