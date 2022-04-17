import { useEffect, useMemo } from "react";
import { debounce } from "@github/mini-throttle";

export function useDebounce<T extends unknown[], R>(
    func: (...arg: T) => R,
    wait: number,
    deps: ReadonlyArray<unknown> = []
) {
    const dependencies = [...deps, wait];
    const memoized = useMemo(
        () =>
            debounce(func, wait, {
                middle: true,
                start: true,
                once: false
            }),
        dependencies
    );
    useEffect(() => {
        return () => {
            memoized.cancel();
        };
    }, dependencies);
    return memoized;
}
