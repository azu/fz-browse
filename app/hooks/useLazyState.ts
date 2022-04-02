import { SetStateAction, useCallback, useEffect, useRef, useState } from "react";

export function useLazyState<T>(defaultValue: T) {
    const state = useRef<T>(defaultValue);
    const timer = useRef<any>(null);
    const setState = useCallback((s: SetStateAction<T>) => {
        // @ts-ignore
        state.current = typeof s === "function" ? s(state.current) : s;
    }, [])
    const [lazyState, setLazyState] = useState(defaultValue);
    const startTimer = useCallback(() => {
        return setInterval(() => {
            setLazyState(state.current);
        }, 100);
    }, [])
    useEffect(() => {
        timer.current = startTimer();
        return () => {
            clearInterval(timer.current);
        }
    }, [state])
    const resetState = useCallback(() => {
        state.current = defaultValue;
        clearInterval(timer.current);
        timer.current = startTimer();
    }, [timer])
    return [lazyState, { setState, resetState }] as const;
}
