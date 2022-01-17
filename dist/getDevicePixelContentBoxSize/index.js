export function getDevicePixelContentBoxSize(entry) {
    let width;
    let height;
    const { contentRect, devicePixelContentBoxSize } = entry;
    if (devicePixelContentBoxSize && devicePixelContentBoxSize.length > 0) {
        // https://web.dev/device-pixel-content-box/#devicepixelcontentbox
        // use exact size
        width = devicePixelContentBoxSize[0].inlineSize;
        height = devicePixelContentBoxSize[0].blockSize;
    }
    else {
        width = Math.round(contentRect.width * devicePixelRatio);
        height = Math.round(contentRect.height * devicePixelRatio);
    }
    return { width, height };
}
