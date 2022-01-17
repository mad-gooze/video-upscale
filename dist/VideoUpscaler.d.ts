export declare type VideoUpscalerProps = {
    video: HTMLVideoElement;
    canvas: HTMLCanvasElement;
    onFrameRendered?: (params: {
        fps: number;
    }) => any;
    onFPSDrop?: (params: {
        fps: number;
        targetFPS: number;
    }) => any;
    targetFPS?: number;
    fpsRatio?: number;
};
export declare class VideoUpscaler {
    private gl;
    private observer;
    private videoTagSize;
    private nextRFCHandle;
    private video;
    private canvas;
    private onFrameRendered;
    private canvasHidden;
    private targetFPS;
    private fps;
    private prevFrameRenderTime;
    private onFPSDrop;
    private fpsRatio;
    private destroyHandlers;
    private destroyed;
    private resampleProgram;
    private sharpenProgram;
    private frameBuffer;
    private frameBufferTexture;
    private videoTexture;
    constructor({ video, canvas, onFrameRendered, targetFPS, onFPSDrop, fpsRatio, }: VideoUpscalerProps);
    private buildProgram;
    private createTexture;
    private clearFPSCounter;
    private hideCanvas;
    private showCanvas;
    private setCanvasSize;
    private getVideoFrameSize;
    private renderFrame;
    private planNextRender;
    enable(): void;
    private cancelNextRender;
    private onDestroy;
    disable(): void;
    destroy(): void;
    getFPS(): number;
    setTargetFPS(targetFPS: number): void;
    isActive(): boolean;
}
