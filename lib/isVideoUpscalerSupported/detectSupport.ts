import { detectRequestVideoFrameCallback } from './detectRequestVideoFrameCallback';
import { detectResizeObserver } from './detectResizeObserver';
import { detectWebGL2 } from './detectWebGL2';

export function detectSupport(): boolean {
    return (
        detectRequestVideoFrameCallback() &&
        detectWebGL2() &&
        detectResizeObserver()
    );
}
