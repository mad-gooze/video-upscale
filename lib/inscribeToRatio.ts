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

    if (innerRect.width === outerRect.width && innerRect.height === outerRect.height) {
        return outerRect;
    }

    if (desiredRatio > ratio) {
        // inscribe horizontally
        return {
            width,
            height: Math.round(width / desiredRatio),
        };
    }
    // inscribe vertically
    return {
        width: Math.round(height * desiredRatio),
        height,
    };
}
