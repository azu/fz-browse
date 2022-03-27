import { useCallback, useEffect, useState, VFC } from "react";

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

export type AppProps = {
    cwd: string;
    initialInput?: string;
}
export const App: VFC<AppProps> = (props) => {
    const [input, setInput] = useState<string>(props.initialInput ?? "")
    const [texts, setTexts] = useState<string[]>([])
    const [preview, setPreview] = useState<string[]>([])
    useEffect(() => {
        setTexts([]);
        setPreview([]);
    }, [input])
    const onPreview = useCallback(async (item) => {
        let textBuffer = '';
        const push = (line: string) => {
            setPreview(texts => texts.concat(line));
        }
        const controller = new AbortController()
        const signal = controller.signal
        const decoder = new TextDecoder();
        fetch(`/preview?input=${encodeURIComponent(input)}&result=${encodeURIComponent(item)}`, { signal }).then((res) => {
            // Verify that we have some sort of 2xx response that we can use
            if (!res.ok) {
                throw res;
            }
            if (!res.body) {
                throw new Error("No body");
            }
            return res.body.getReader();
        }).then(reader => {
            function readChunk({ done, value }: ReadableStreamDefaultReadResult<any>) {
                if (done) {
                    if (textBuffer) {
                        push(textBuffer)
                    }
                    return;
                }
                textBuffer += decoder.decode(value);
                const lines = textBuffer.split('\n');
                for (const line of lines.slice(0, -1)) {
                    push(line);
                }
                textBuffer = lines.slice(-1)[0];
                // next
                reader.read().then(readChunk);
            }

            setPreview([]);
            reader.read().then(readChunk);
        });
        return () => {
            controller.abort();
            setPreview([]);
        }
    }, [input])
    useEffect(() => {
        const controller = new AbortController()
        const signal = controller.signal
        let textBuffer = '';
        const push = (line: string) => {
            setTexts(texts => texts.concat(line));
        }
        const decoder = new TextDecoder();
        fetch(`/stream?input=${encodeURIComponent(input)}`, { signal }).then((res) => {
            // Verify that we have some sort of 2xx response that we can use
            if (!res.ok) {
                throw res;
            }
            if (!res.body) {
                throw new Error("No body");
            }
            return res.body.getReader();
        }).then(reader => {
            function readChunk({ done, value }: ReadableStreamDefaultReadResult<any>) {
                if (done) {
                    if (textBuffer) {
                        push(textBuffer)
                    }
                    return;
                }
                textBuffer += decoder.decode(value);
                const lines = textBuffer.split('\n');
                for (const line of lines.slice(0, -1)) {
                    push(line);
                }
                textBuffer = lines.slice(-1)[0];
                // next
                reader.read().then(readChunk);
            }

            setTexts([]);
            reader.read().then(readChunk);
        });
        return () => {
            controller.abort();
            setTexts([]);
        }
    }, [input])
    return (
        <>
            <input type={"text"} value={input} onChange={(event) => setInput(event.target.value)}/>
            <div style={{ display: "flex" }}>
                <div style={{ flex: 1, maxWidth: "50%" }}>
                    {texts.slice(-100).map((text, index) => {
                        return <li key={index} onClick={() => onPreview(text)}><a>{text}</a>
                        </li>
                    })}
                </div>
                <pre style={{ flex: 1, maxWidth: "50%" }}>
                    {preview.join("\n")}
                </pre>
            </div>
        </>
    )
}
