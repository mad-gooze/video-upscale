/**
 * Returns rect size with a given ratio inscribed in a given rect
 *
 * @internal
 */
export function inscribeToRatio(
    outerRect: Pick<DOMRect, 'width' | 'height'>,
    innerRect: Pick<DOMRect, 'width' | 'height'>,
) {
    const { width, height } = outerRect;
    
    const desiredRatio = innerRect.width / innerRect.height;
    const ratio = width / height;

    if (Math.abs(desiredRatio - ratio) < 0.005) {
        // if desired ratio is close to current, use use outer rect as desired size to prevent upscale issues
        return outerRect;
    }

    if (desiredRatio > ratio) {
        // inscribe horizontally
        return {
            width,
            height: Math.ceil(width / desiredRatio),
        };
    }
    // inscribe vertically
    return {
        width: Math.ceil(height * desiredRatio),
        height,
    };
}
