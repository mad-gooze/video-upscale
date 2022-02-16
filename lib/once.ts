/**
 * Returns memoized fn
 */
export const once = <A extends any[], R>(
    fn: (...arg: A) => R,
): ((...arg: A) => R) => {
    let called = false;
    let result: R;

    return (...args) => {
        if (called) return result;
        called = true;
        result = fn(...args);
        (fn as any) = null;
        return result;
    };
};
