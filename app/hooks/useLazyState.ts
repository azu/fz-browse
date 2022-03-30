import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "./useDebounce";
import { debounce } from "@github/mini-throttle";

export function useLazyState<T>(defaultValue: T) {
    const [state, setState] = useState(defaultValue);
    const [lazyState, setLazyState] = useState(defaultValue);
    const syncState = useCallback(debounce((state: T) => {
        setLazyState(state)
    }, 100, { start: true, middle: true }), [])
    useEffect(() => {
        syncState(state)
    }, [state])
    return [lazyState, setState] as const;
}
