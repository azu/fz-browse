import { useCallback, useEffect, useMemo, useState, VFC } from "react";
import { ParsedTSVLine, parseTSVLine } from "./lib/tsv-parse";
import { useLazyState } from "./hooks/useLazyState";

import Highlighter from "react-highlight-words";
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
    initialQuery?: string;
    csrfToken: string;
}
export const App: VFC<AppProps> = (props) => {
    const [input, setInput] = useState<string>(props.initialQuery ?? "")
    const highlightKeyword = useMemo(() => {
        return input.split(/[\^\[\]().+*$]/);
    }, [input]);
    const [tsvList, { setState: setTsvList, resetState: restTsvList }] = useLazyState<ParsedTSVLine[]>([])
    const [preview, setPreview] = useState<string[]>([])
    useEffect(() => {
        restTsvList()
        setPreview([]);
    }, [input])
    const onPreview = useCallback(async (item) => {
        let textBuffer = '';
        const push = (line?: string) => {
            if (!line) {
                return;
            }
            setPreview(texts => texts.concat(line));
        }
        const controller = new AbortController()
        const signal = controller.signal
        const decoder = new TextDecoder();
        fetch(`/preview?input=${encodeURIComponent(input)}&result=${encodeURIComponent(item)}`, {
            headers: {
                'CSRF-Token': props.csrfToken
            },
            signal
        }).then((res) => {
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
                    push(textBuffer)
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

            restTsvList();
            setPreview([]);
            reader.read().then(readChunk);
        });
        return () => {
            controller.abort();
            restTsvList();
        }
    }, [input]);
    // stream
    useEffect(() => {
        const controller = new AbortController()
        const signal = controller.signal
        let textBuffer = '';
        const push = (tsv: null | ParsedTSVLine) => {
            if (!tsv) {
                return;
            }
            setTsvList(texts => texts.concat([tsv]));
        }
        const decoder = new TextDecoder();
        fetch(`/stream?input=${encodeURIComponent(input)}`, {
            headers: {
                'CSRF-Token': props.csrfToken
            }, signal
        }).then((res) => {
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
                    push(parseTSVLine(textBuffer))
                    return;
                }
                textBuffer += decoder.decode(value);
                const lines = textBuffer.split('\n');
                for (const line of lines.slice(0, -1)) {
                    push(parseTSVLine(line));
                }
                textBuffer = lines.slice(-1)[0];
                // next
                reader.read().then(readChunk);
            }

            restTsvList();
            reader.read().then(readChunk);
        });
        return () => {
            controller.abort();
            restTsvList()
        }
    }, [input])
    return (
        <div>
            <div style={{
                display: "flex",
                alignContent: "center",
                alignItems: "center",
                position: "sticky",
                top: 0,
                padding: "12px 0",
                background: "var(--nc-bg-1)",
                borderBottom: "solid 1px var(--nc-bg-2)"
            }}>
                <input type={"text"}
                       value={input}
                       onChange={(event) => setInput(event.target.value)}
                       style={{ flex: 1, borderRadius: "10px", padding: "8px" }}/>
            </div>
            <div style={{ display: "flex", }}>
                <div style={{ flex: 1 }}>
                    {tsvList.slice(0, 100).map((tsv, index) => {
                        const filePath = tsv[0];
                        const content = tsv[1];
                        if (!filePath) {
                            return;
                        }
                        const fileUrl = encodeURIComponent(location.origin + "/file/" + encodeURIComponent(filePath));
                        if (!content) {
                            return <h2 key={index}>
                                {filePath.endsWith(".pdf")
                                    ?
                                    <a href={`/public/pdf/web/viewer.html?file=${fileUrl}#search=${encodeURIComponent(input)}`}>{filePath}</a>
                                    :
                                    <a href={`/public/epub/index.html?file=${fileUrl}&search=${encodeURIComponent(input)}`}>{filePath}</a>
                                }
                            </h2>
                        } else {
                            // content
                            return <p key={index}><Highlighter
                                highlightClassName="HighlightKeyWord"
                                searchWords={highlightKeyword}
                                autoEscape={true}
                                textToHighlight={content}
                            /></p>
                        }
                    })}
                </div>
                {/*<div style={{ flex: 1, maxWidth: "50%", overflowY: "auto", height: "100vh" }}>*/}
                {/*    {preview.slice(-100).map((item, index) => {*/}
                {/*        return <p key={index + item} style={{ lineHeight: 1.5, margin: 0 }}><Ansi>{item}</Ansi></p>*/}
                {/*    })}*/}
                {/*</div>*/}
            </div>
        </div>
    )
}
