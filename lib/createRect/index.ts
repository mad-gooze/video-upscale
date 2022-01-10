export function createRect({width, height}: Pick<DOMRect, 'width' | 'height'>): Float32Array {
    return Float32Array.of(
        0,
        0,
        width,
        0,
        0,
        height,
        0,
        height,
        width,
        0,
        width,
        height,
    );
}