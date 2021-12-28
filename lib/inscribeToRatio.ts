/**
 * Returns rect size with a given ratio inscribed in a given rect
 *
 * @internal
 */
export function inscribeToRatio(
    rect: Pick<DOMRect, 'width' | 'height'>,
    desiredRatio: number,
) {
    const { width, height } = rect;
    const ratio = width / height;

    if (desiredRatio > ratio) {
        // вписываем по горизонтали
        return {
            width,
            height: width / desiredRatio,
        };
    }
    // вписываем по вертикали
    return {
        width: height * desiredRatio,
        height,
    };
}
