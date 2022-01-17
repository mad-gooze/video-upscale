import { Rect } from "../Rect";

export function getDevicePixelContentBoxSize(entry: ResizeObserverEntry): Rect {
    let width: number;
    let height: number;

    const { contentRect, devicePixelContentBoxSize } = entry as any;
    if (devicePixelContentBoxSize && devicePixelContentBoxSize.length > 0) {
        // https://web.dev/device-pixel-content-box/#devicepixelcontentbox
        // use exact size
        width = devicePixelContentBoxSize[0].inlineSize;
        height = devicePixelContentBoxSize[0].blockSize;
    } else {
        width = Math.round(contentRect.width * devicePixelRatio);
        height = Math.round(contentRect.height * devicePixelRatio);
    }
    
    return { width, height };
}