import { Link, Route, Switch } from 'react-router-dom'
import { useCallback, useEffect, useState } from "react";

// Auto generates routes from files under ./pages
// https://vitejs.dev/guide/features.html#glob-import
// @ts-ignore
const pages = import.meta.globEager('./pages/*.tsx')

const routes = Object.keys(pages).map((path) => {
    const name = path.match(/\.\/pages\/(.*)\.tsx$/)?.[1] ?? "<t>"
    return {
        name,
        path: name === 'Home' ? '/' : `/${name.toLowerCase()}`,
        component: pages[path].default
    }
})

export function App() {
    const [input, setInput] = useState<string>("")
    const [texts, setTexts] = useState<string[]>([])
    useEffect(() => {
        setTexts([]);
    }, [input])
    const onPreview = useCallback(async (item) => {
        const fetchPromise = fetch(`/preview?input=${encodeURIComponent(input)}&result=${encodeURIComponent(item)}`).then((res) => {
            // Verify that we have some sort of 2xx response that we can use
            if (!res.ok) {
                throw res;
            }
            return res;
        }).then(res => {
            let textBuffer = '';
            return res.body
                // Decode as UTF-8 Text
                ?.pipeThrough(new TextDecoderStream())
                .pipeThrough(new TransformStream({
                    transform(chunk, controller) {
                        textBuffer += chunk;
                        const lines = textBuffer.split('\n');
                        for (const line of lines.slice(0, -1)) {
                            controller.enqueue(line);
                        }
                        textBuffer = lines.slice(-1)[0];
                    },
                    flush(controller) {
                        if (textBuffer) {
                            controller.enqueue(textBuffer);
                        }
                    }
                }))
        });
        const res = await fetchPromise;
        const reader = res?.getReader();

        function read() {
            reader?.read().then(({ value, done }) => {
                    if (value) {
                        console.log(value);
                    }
                    if (done) {
                        return;
                    }
                    read();
                }
            );
        }

        read();
    }, [input])
    useEffect(() => {

        const controller = new AbortController()
        const signal = controller.signal
        const fetchPromise = fetch(`/stream?input=${encodeURIComponent(input)}`, { signal }).then((res) => {
            // Verify that we have some sort of 2xx response that we can use
            if (!res.ok) {
                throw res;
            }
            return res;
        }).then(res => {
            let textBuffer = '';
            return res.body
                // Decode as UTF-8 Text
                ?.pipeThrough(new TextDecoderStream())
                .pipeThrough(new TransformStream({
                    transform(chunk, controller) {
                        textBuffer += chunk;
                        const lines = textBuffer.split('\n');
                        for (const line of lines.slice(0, -1)) {
                            controller.enqueue(line);
                        }
                        textBuffer = lines.slice(-1)[0];
                    },
                    flush(controller) {
                        if (textBuffer) {
                            controller.enqueue(textBuffer);
                        }
                    }
                }))
        });
        (async function () {
            const res = await fetchPromise;
            const reader = res?.getReader();

            function read() {
                reader?.read().then(({ value, done }) => {
                        if (value) {
                            setTexts((texts) => texts.concat(value));
                        }
                        if (done) {
                            return;
                        }
                        read();
                    }
                );
            }

            read();
        })()
        return () => {
            controller.abort();
            setTexts([]);
        }
    }, [input])
    return (
        <>
            <input type={"text"} value={input} onChange={(event) => setInput(event.target.value)}/>
            {texts.slice(-100).map((text, index) => {
                return <li key={index} onClick={() => onPreview(text)}>{text}</li>
            })}
        </>
    )
}
