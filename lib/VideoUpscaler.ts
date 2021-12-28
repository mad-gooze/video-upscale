import { FRAGMENT_SHADER_SOURCE } from './FRAGMENT_SHADER_SOURCE';
import { inscribeToRatio } from './inscribeToRatio';
import { VERTEX_SHADER_SOURCE } from './VERTEX_SHADER_SOURCE';

export type VideoUpscalerProps = {
    video: HTMLVideoElement;
    canvas: HTMLCanvasElement;
    onFrameRendered?: () => any;
};

export class VideoUpscaler {
    private gl: WebGL2RenderingContext;
    private resolutionLocation: WebGLUniformLocation | null;

    private observer: ResizeObserver;
    private videoTagWidth: number | undefined;
    private videoTagHeight: number | undefined;

    private nextCallbackHandle: number | undefined;

    private video: HTMLVideoElement;
    private canvas: HTMLCanvasElement;
    private onFrameRendered?: () => any;

    constructor({ video, canvas, onFrameRendered }: VideoUpscalerProps) {
        this.video = video;
        this.canvas = canvas;
        this.onFrameRendered = onFrameRendered;

        this.observer = new ResizeObserver(([{ contentRect }]) => {
            this.videoTagWidth = contentRect.width;
        });
        this.observer.observe(video);

        const gl = canvas.getContext('webgl2')!;

        if (!gl) {
            throw new Error('WebGL2 is not supported');
        }
        this.gl = gl;

        const program = gl.createProgram();
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

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
        gl.shaderSource(fragmentShader, FRAGMENT_SHADER_SOURCE);
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
            let errorMessage = 'Failed to link program';
            if (programError !== null) {
                errorMessage += `, programError: ${programError}`;
            }
            if (vertexShaderError !== null) {
                errorMessage += `, vertexShaderError: ${vertexShaderError}`;
            }
            if (fragmentShaderError !== null) {
                errorMessage += `, fragmentShaderError: ${fragmentShaderError}`;
            }
            throw new Error(errorMessage);
        }

        // look up where the vertex data needs to go.
        const positionAttributeLocation = gl.getAttribLocation(
            program,
            'a_position',
        );
        const texCoordAttributeLocation = gl.getAttribLocation(
            program,
            'a_texCoord',
        );

        // lookup uniforms
        this.resolutionLocation = gl.getUniformLocation(
            program,
            'u_resolution',
        );
        const imageLocation = gl.getUniformLocation(program, 'u_image');

        // Create a vertex array object (attribute state)
        const vao = gl.createVertexArray();

        // and make it the one we're currently working with
        gl.bindVertexArray(vao);

        // Create a buffer and put a single pixel space rectangle in
        // it (2 triangles)
        const positionBuffer = gl.createBuffer();

        // Turn on the attribute
        gl.enableVertexAttribArray(positionAttributeLocation);

        // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        gl.vertexAttribPointer(
            positionAttributeLocation,
            2,
            gl.FLOAT,
            false,
            0,
            0,
        );

        // provide texture coordinates for the rectangle.
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
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

        // Create a texture.
        const texture = gl.createTexture();

        // make unit 0 the active texture uint
        // (ie, the unit all other texture commands will affect
        gl.activeTexture(gl.TEXTURE0);

        // Bind it to texture unit 0' 2D bind point
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Set the parameters so we don't need mips and so we're not filtering
        // and we don't repeat at the edges
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Tell it to use our program (pair of shaders)
        gl.useProgram(program);

        // Bind the attribute/buffer set we want.
        gl.bindVertexArray(vao);

        // Tell the shader to get the texture from texture unit 0
        gl.uniform1i(imageLocation, 0);

        // Bind the position buffer so gl.bufferData that will be called
        // in setRectangle puts data in the position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    }

    private getVideoTagSize(): Pick<DOMRect, 'width' | 'height'> {
        let { videoTagWidth: width, videoTagHeight: height } = this;
        if (width === undefined || height === undefined) {
            const videoRect = this.video.getBoundingClientRect();
            width = this.videoTagWidth = videoRect.width;
            height = this.videoTagHeight = videoRect.height;
        }

        return {
            width,
            height,
        };
    }

    private renderFrame(): void {
        const { video, gl, canvas } = this;
        const { videoWidth, videoHeight } = video;
        if (videoWidth <= 0 || videoHeight <= 0) {
            return;
        }

        if (canvas.height !== videoHeight || canvas.width !== videoWidth) {
            const videoRatio = videoWidth / videoHeight;
            const videoSize = inscribeToRatio(
                this.getVideoTagSize(),
                videoRatio,
            );

            canvas.width = videoSize.width;
            canvas.height = videoSize.height;

            // Tell WebGL how to convert from clip space to pixels
            gl.viewport(0, 0, canvas.width, canvas.height);

            // Pass in the canvas resolution so we can convert from pixels to clipspace in the shader
            gl.uniform2f(this.resolutionLocation, canvas.width, canvas.height);

            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([
                    0,
                    0,
                    canvas.width,
                    0,
                    0,
                    canvas.height,
                    0,
                    canvas.height,
                    canvas.width,
                    0,
                    canvas.width,
                    canvas.height,
                ]),
                gl.STATIC_DRAW,
            );
        }

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            video,
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.flush();

        if (this.onFrameRendered !== undefined) {
            this.onFrameRendered();
        }
    }

    private planNextRender = () => {
        this.renderFrame();
        this.nextCallbackHandle = this.video.requestVideoFrameCallback(() => {
            this.planNextRender();
        });
    };

    public enable(): void {
        this.planNextRender();
    }

    public disable(): void {
        if (this.nextCallbackHandle === undefined) {
            return;
        }
        this.video.cancelVideoFrameCallback(this.nextCallbackHandle);
        this.nextCallbackHandle = undefined;
    }
}
