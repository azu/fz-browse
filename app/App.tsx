import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    VFC,
    startTransition,
    useDeferredValue,
    useTransition, ReactNode, FC, ChangeEventHandler
} from "react";
import { ParsedTSVLine, parseTSVLine } from "./lib/tsv-parse";

import Highlighter from "react-highlight-words";
import { BrowserRouter, Link, useNavigate, useRoutes, useSearchParams } from "react-router-dom";
import { Route, Routes, useLocation } from "react-router";
import { PdfPreview } from "./preview/PdfPreview";
import { EpubPreview } from "./preview/EpubPreview";
import { DefaultPreview } from "./preview/DefaultPreview";
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

const useCustomSearchParams = () => {
    const [search, setSearch] = useSearchParams();
    const searchAsObject = useMemo(() => Object.fromEntries(
        new URLSearchParams(search)
    ), [search]);
    return [searchAsObject, setSearch] as const;
};
export type AppProps = {
    cwd: string;
    initialQuery?: string;
    csrfToken: string;
}
export const Main: VFC<AppProps> = (props) => {
    const [searchAsObject, setSearchParams] = useCustomSearchParams();
    const [input, setInput] = useState<string>(searchAsObject.q ?? "")
    const highlightKeyword = useMemo(() => {
        return input.split(/[\^\[\]().+*$]/);
    }, [input]);
    const [isPending, startTransition] = useTransition();
    const [tsvList, setTsvList] = useState<ParsedTSVLine[]>([])
    const [preview, setPreview] = useState<string[]>([])
    useEffect(() => {
        setTsvList([])
        setPreview([]);
    }, [input])
    const onInputChange: ChangeEventHandler<HTMLInputElement> = (event) => {
        const nextQuery = event.target.value;
        setInput(nextQuery);
        setSearchParams({
            ...searchAsObject,
            q: nextQuery
        });
    }
    const onPreview = useCallback(async (item: string) => {
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
                reader.read().then(readChunk).catch(() => {
                    // skip
                })
            }

            setTsvList([]);
            setPreview([]);
            reader.read().then(readChunk).catch(() => {
                // skip
            })
        });
        return () => {
            controller.abort();
            setTsvList([]);
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
            startTransition(() => {
                setTsvList(texts => texts.concat([tsv]));
            })
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
                reader.read().then(readChunk).catch(() => {
                    // skip
                })
            }

            reader.read().then(readChunk).catch(() => {
                // skip
            })
        }).catch(() => {
            textBuffer = "";
            startTransition(() => {
                setTsvList([])
            })
        })
        return () => {
            startTransition(() => {
                setTsvList([])
            })
            controller.abort();
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
                       onChange={onInputChange}
                       style={{ flex: 1, borderRadius: "10px", padding: "8px" }}/>
            </div>
            <div style={{ display: "flex", }}>
                <div style={{ flex: 1 }}>
                    {isPending && tsvList.length === 0 && <p>Loading...</p>}
                    {tsvList.slice(0, 100).map((tsv, index) => {
                        const filePath = tsv[0];
                        const content = tsv[1];
                        if (!filePath) {
                            return;
                        }
                        const fileUrl = encodeURIComponent(location.origin + "/file/" + encodeURIComponent(filePath));
                        if (!content) {
                            return <h2 key={index}>
                                <Link to={{
                                    pathname: "/preview",
                                    search: new URLSearchParams([
                                        ["target", fileUrl],
                                        ["input", input]
                                    ]).toString()
                                }}>{filePath}</Link>
                            </h2>
                        } else {
                            // content
                            return <p key={index}>
                                <Highlighter
                                    highlightClassName="HighlightKeyWord"
                                    searchWords={highlightKeyword}
                                    autoEscape={true}
                                    textToHighlight={content}
                                />
                            </p>
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


const PreviewRoute = (props: { input: string; target: string; }) => {
    if (props.target.endsWith(".pdf")) {
        return <PdfPreview {...props} />;
    } else if (props.target.endsWith(".epub")) {
        return <EpubPreview {...props} />
    }
    return <DefaultPreview {...props} />
}
export const Preview = () => {
    const [searchAsObject] = useCustomSearchParams();
    const input = searchAsObject.input;
    const target = searchAsObject.target;
    if (!input) {
        throw new Error("require ?input")
    }
    if (!target) {
        throw new Error("require ?target")
    }
    return <PreviewRoute input={input} target={target}/>;
}
export const App: FC<AppProps> = (props) => {
    return <Routes>
        <Route index element={<Main {...props}/>}/>
        <Route path={"/preview"} element={<Preview/>}/>
    </Routes>
}
