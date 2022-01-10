import RESAMPLE_SHADER_SOURCE from './shaders/lanczos-2.glsl';
import SHARPEN_SHADER_SOURCE from './shaders/CAS.glsl';
import { inscribeToRatio } from './inscribeToRatio';
import VERTEX_SHADER_SOURCE from './shaders/VERTEX_SHADER.glsl';
import { createRect } from './createRect';

export type VideoUpscalerProps = {
    video: HTMLVideoElement;
    canvas: HTMLCanvasElement;
    onFrameRendered?: (params: { fps: number }) => any;
    onFPSDrop?: (params: { fps: number, targetFPS: number }) => any;
    targetFPS?: number;
    fpsRatio?: number;
};

type Program = {
    program: WebGLProgram;
    setViewportSize: (size: Pick<DOMRect, 'width' | 'height'>) => void;
    use: (params: { flip: boolean }) => void;
}

const noop = () => undefined;

const DEFAULT_TARGET_FPS = 30;
const DEFAULT_FPS_RATIO = 0.8;
export class VideoUpscaler {
    private gl: WebGL2RenderingContext;

    private observer: ResizeObserver;
    private videoTagWidth: number | undefined;
    private videoTagHeight: number | undefined;

    private nextRFCHandle: number | undefined;

    private video: HTMLVideoElement;
    private canvas: HTMLCanvasElement;
    private onFrameRendered: Required<VideoUpscalerProps>['onFrameRendered'];

    private canvasHidden: boolean | undefined;

    private targetFPS: number;
    private fps = 0;
    private prevFrameRenderTime: DOMHighResTimeStamp = -1;
    private onFPSDrop: Required<VideoUpscalerProps>['onFPSDrop'];
    private fpsRatio: number;

    private destroyHandlers: Array<() => unknown> = [() => this.disable()];
    private destroyed = false;

    private resampleProgram: Program;
    private sharpenProgram: Program;

    private frameBuffers: WebGLFramebuffer[] = [];
    private textures: WebGLTexture[] = [];

    private videoTexture: WebGLTexture | null;

    constructor({ video, canvas, onFrameRendered = noop, targetFPS = DEFAULT_TARGET_FPS, onFPSDrop = noop, fpsRatio = DEFAULT_FPS_RATIO }: VideoUpscalerProps) {
        try {
            this.video = video;
            this.canvas = canvas;
            this.onFrameRendered = onFrameRendered;
            this.targetFPS = targetFPS;
            this.onFPSDrop = onFPSDrop;
            this.fpsRatio = fpsRatio;

            this.hideCanvas();

            const gl = canvas.getContext('webgl2')!;

            if (!gl) {
                throw new Error('WebGL2 is not supported');
            }
            this.gl = gl;
            this.onDestroy(() => gl.getExtension('WEBGL_lose_context')!.loseContext());

            this.resampleProgram = this.buildProgram(RESAMPLE_SHADER_SOURCE);
            this.sharpenProgram = this.buildProgram(SHARPEN_SHADER_SOURCE);

            this.videoTexture = this.createTexture(gl.LINEAR);

            for (let ii = 0; ii < 2; ++ii) {
                const texture = this.createTexture(gl.NEAREST)!;
                this.textures.push(texture);
                const fbo = gl.createFramebuffer()!;
                this.frameBuffers.push(fbo);
                gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            }

            this.observer = new ResizeObserver(([{ contentRect }]) => this.saveVideoTagSize(contentRect));
            this.observer.observe(video);
            this.onDestroy(() => {
                this.observer.disconnect();
            })

            const onTimeupdate = () => {
                if (!this.video.paused) {
                    return;
                }
                this.planNextRender();
            };
            this.video.addEventListener('timeupdate', onTimeupdate);
            this.onDestroy(() => {
                this.video.removeEventListener('timeupdate', onTimeupdate);
            })
        } catch (e) {
            this.destroy();
            throw e;
        }
    }

    private buildProgram(fragmentShaderSource: string): Program {
        const { gl } = this;
        const program = gl.createProgram();
        this.onDestroy(() => gl.deleteProgram(program));

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        this.onDestroy(() => gl.deleteShader(vertexShader));
        this.onDestroy(() => gl.deleteShader(fragmentShader));

        if (program === null) {
            throw new Error('Failed to create program');
        }
        if (vertexShader === null) {
            throw new Error(`Failed to create vertex shader`);
        }
        if (fragmentShader === null) {
            throw new Error(`Failed to create fragment shader`);
        }

        gl.shaderSource(vertexShader, VERTEX_SHADER_SOURCE);
        gl.compileShader(vertexShader);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        // Check the link status
        const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!linked) {
            // something went wrong with the link
            const programError = gl.getProgramInfoLog(program);
            const vertexShaderError = gl.getShaderInfoLog(vertexShader);
            const fragmentShaderError = gl.getShaderInfoLog(fragmentShader);

            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            gl.deleteProgram(program);
            let errorMessage = 'Failed to link program\n';
            if (programError) {
                errorMessage += `programError: ${programError}\n`;
            }
            if (vertexShaderError) {
                errorMessage += `vertexShaderError: ${vertexShaderError}\n`;
            }
            if (fragmentShaderError) {
                errorMessage += `fragmentShaderError: ${fragmentShaderError}\n`;
            }
            throw new Error(errorMessage);
        }

        const texCoordAttributeLocation = gl.getAttribLocation(
            program,
            'a_texCoord',
        );
        // provide texture coordinates for the rectangle.
        const arrayBuffer = gl.createBuffer();
        this.onDestroy(() => gl.deleteBuffer(arrayBuffer));
        gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            createRect({ width: 1, height: 1 }),
            gl.STATIC_DRAW,
        );

        // Turn on the attribute
        gl.enableVertexAttribArray(texCoordAttributeLocation);

        // Tell the attribute how to get data out of texCoordBuffer (ARRAY_BUFFER)
        gl.vertexAttribPointer(
            texCoordAttributeLocation,
            2,
            gl.FLOAT,
            false,
            0,
            0,
        );

        // look up where the vertex data needs to go.
        const positionAttributeLocation = gl.getAttribLocation(
            program,
            'a_position',
        );
        // Turn on the attribute
        gl.enableVertexAttribArray(positionAttributeLocation);

        // Create a buffer and put a single pixel space rectangle in
        // it (2 triangles)
        const positionBuffer = gl.createBuffer();
        this.onDestroy(() => gl.deleteBuffer(positionBuffer));

        const resolutionLocation = gl.getUniformLocation(
            program,
            'u_resolution',
        );
        let viewportWidth = 0;
        let viewportHeight = 0;

        const setViewportSize = ({ width, height }: Pick<DOMRect, 'width' | 'height'>) => {
            gl.viewport(0, 0, width, height);
            gl.uniform2f(resolutionLocation, width, height);

            if (viewportWidth === width && viewportHeight === height) {
                return;
            }
            viewportWidth = width;
            viewportHeight = height;

            gl.bufferData(
                gl.ARRAY_BUFFER,
                createRect({ width, height }),
                gl.STATIC_DRAW,
            );
        };

        const flipYLocation = gl.getUniformLocation(program, "u_flipY");
        const use = ({ flip }: { flip: boolean }) => {
            gl.useProgram(program);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.vertexAttribPointer(
                positionAttributeLocation,
                2,
                gl.FLOAT,
                false,
                0,
                0,
            );
            gl.uniform1f(flipYLocation, flip ? -1 : 1);
        };

        return {
            program,
            setViewportSize,
            use,
        };
    }

    private createTexture(textureFilter: GLenum): WebGLTexture | null {
        const { gl } = this;
        const texture = gl.createTexture();
        this.onDestroy(() => gl.deleteTexture(texture));

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, textureFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, textureFilter);

        return texture;
    }

    private saveVideoTagSize({ width, height }: Pick<DOMRect, 'width' | 'height'>): void {
        this.videoTagWidth = Math.round(width * devicePixelRatio);
        this.videoTagHeight = Math.round(height * devicePixelRatio);
    }

    private getVideoTagSize(): Pick<DOMRect, 'width' | 'height'> {
        if (this.videoTagWidth === undefined || this.videoTagHeight === undefined) {
            this.saveVideoTagSize(this.video.getBoundingClientRect());
        }

        return {
            width: this.videoTagWidth!,
            height: this.videoTagHeight!,
        };
    }

    private clearFPSCounter(): void {
        this.fps = this.targetFPS;
        this.prevFrameRenderTime = -1;
    }

    private hideCanvas(): void {
        // cleanup current fps meter
        if (this.canvasHidden === true) {
            return;
        }
        this.clearFPSCounter();
        this.canvas.style.visibility = 'hidden';
        this.canvasHidden = true;
    }

    private showCanvas(): void {
        if (this.canvasHidden === false) {
            return;
        }
        this.clearFPSCounter();
        this.canvas.style.visibility = 'visible';
        this.canvasHidden = false;
    }

    private setCanvasSize({
        width,
        height,
    }: Pick<DOMRect, 'width' | 'height'>): void {
        const { canvas } = this;
        if (canvas.width !== width) {
            canvas.width = width;
        }
        if (canvas.height !== height) {
            canvas.height = height;
        }
    }


    private getVideoFrameSize(frameMetadata: VideoFrameMetadata | undefined): Pick<DOMRect, 'width' | 'height'> | undefined {
        if (frameMetadata !== undefined) {
            const { width, height } = frameMetadata;
            return { width, height };
        }

        if (this.video.readyState < 2) {
            return undefined;
        }
        const { videoWidth, videoHeight } = this.video;
        return { width: videoWidth, height: videoHeight };
    }

    private renderFrame = (now?: DOMHighResTimeStamp, frameMetadata?: VideoFrameMetadata) => {
        this.cancelNextRender();

        const { video, gl } = this;
        const videoFrameSize = this.getVideoFrameSize(frameMetadata);
        if (videoFrameSize === undefined) {
            this.hideCanvas();
            this.planNextRender();
            return;
        }

        now = now || performance.now();

        const desiredFrameSize = inscribeToRatio(
            this.getVideoTagSize(),
            videoFrameSize,
        );

        this.setCanvasSize(desiredFrameSize);

        this.resampleProgram.use({ flip: false });
        // gl.activeTexture(gl.TEXTURE0);
        // Bind it to texture unit 0' 2D bind point

        gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, desiredFrameSize.width, desiredFrameSize.height, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffers[0]);
        
        this.resampleProgram.setViewportSize(desiredFrameSize);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            video,
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        this.sharpenProgram.use({ flip: true });
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
        this.sharpenProgram.setViewportSize(desiredFrameSize);

        // gl.texImage2D(
        //     gl.TEXTURE_2D,
        //     0,
        //     gl.RGBA,
        //     gl.RGBA,
        //     gl.UNSIGNED_BYTE,
        //     this.textures[0],
        // );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.flush();

        this.showCanvas();

        if (this.prevFrameRenderTime >= 0 && !video.paused) {
            const delta = (now - this.prevFrameRenderTime) / 1000;
            this.fps = this.fps * 0.95 + (0.05 * 1) / delta;
            if (this.fps / this.targetFPS < this.fpsRatio) {
                // fps is too small, disable upscale
                this.disable();
                this.onFPSDrop({ fps: this.fps, targetFPS: this.targetFPS });
            }
        }
        this.prevFrameRenderTime = now;
        this.onFrameRendered({ fps: this.fps });
        this.planNextRender();
    };

    private planNextRender = () => {
        this.nextRFCHandle = this.video.requestVideoFrameCallback(
            this.renderFrame,
        );
    };

    public enable(): void {
        if (this.destroyed) {
            return;
        }
        this.hideCanvas();
        this.renderFrame();
        this.planNextRender();
    }

    private cancelNextRender(): void {
        if (this.nextRFCHandle === undefined) {
            return;
        }
        this.video.cancelVideoFrameCallback(this.nextRFCHandle);
    }

    private onDestroy(handler: () => unknown): void {
        this.destroyHandlers.push(handler);
    }

    public disable(): void {
        this.hideCanvas();
        this.cancelNextRender();
        this.nextRFCHandle = undefined;
    }

    public destroy(): void {
        if (this.destroyed) {
            return;
        }

        this.destroyHandlers.forEach((handler) => {
            try {
                handler()
            } catch {
                //
            }
        });
        this.destroyed = true;
    }

    public getFPS(): number {
        return this.destroyed ? 0 : this.fps;
    }

    public setTargetFPS(targetFPS: number): void {
        this.targetFPS = targetFPS;
        this.clearFPSCounter();
    }

    public isActive(): boolean {
        return !this.destroyed && this.canvasHidden === false;
    }
}
