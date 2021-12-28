/**
 * Returns rect size with a given ratio inscribed in a given rect
 */
export function inscribeToRatio(
    rect: Pick<DOMRect, 'width' | 'height'>,
    desiredRatio: number,
) {
    const ratio = rect.width / rect.height;

    if (desiredRatio === ratio) {
        return rect;
    } else if (desiredRatio > ratio) {
        // inscribe horizontally
        return {
            width: rect.width,
            height: rect.width / desiredRatio,
        };
    } else {
        // inscribe vertically
        return {
            width: rect.height * desiredRatio,
            height: rect.height,
        };
    }
}
