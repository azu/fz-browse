import { ChangeEventHandler, FC, useEffect, useMemo, useRef, useState, useTransition, VFC } from "react";
import { ParsedTSVLine, parseTSVLine } from "./lib/tsv-parse";

import Highlighter from "react-highlight-words";
import { Link, useSearchParams } from "react-router-dom";
import { Route, Routes, useNavigationType } from "react-router";
import { PdfPreview } from "./preview/PdfPreview";
import { EpubPreview } from "./preview/EpubPreview";
import { DefaultPreview } from "./preview/DefaultPreview";
import { useSessionStorage } from "./hooks/useSessionStorage";
import { Action } from "history";
import { ImagePreview } from "./preview/ImagePreview";

const useCustomSearchParams = () => {
    const [search, setSearch] = useSearchParams();
    const searchAsObject = useMemo(() => Object.fromEntries(new URLSearchParams(search)), [search]);
    return [searchAsObject, setSearch] as const;
};
export type AppProps = {
    cwd: string;
    initialQuery?: string;
    csrfToken: string;
    displayItemLimit: number;
};
const IMAGE_PATTERN = /\.(png|jpe|jpeg|webp|gif)$/;
const LinkContent = (props: { children: string }) => {
    if (IMAGE_PATTERN.test(props.children)) {
        const imgUrl = location.origin + "/file/" + encodeURIComponent(props.children);
        return <img src={imgUrl} loading={"lazy"} alt={props.children} />;
    }
    return <>{props.children}</>;
};
export const Main: VFC<AppProps> = (props) => {
    const [searchAsObject, setSearchParams] = useCustomSearchParams();
    const [input, setInput] = useState<string>(searchAsObject.q ?? "");
    const highlightKeyword = useMemo(() => {
        return input.split(/[|^\[\]().+*$]/);
    }, [input]);
    const [isPending, startTransition] = useTransition();
    const [tsvList, setTsvList] = useSessionStorage<ParsedTSVLine[]>("fz-browser-session-results", []);
    const isReload = useMemo(() => {
        if (typeof window === "undefined") {
            return false;
        }
        return (
            (window.performance.navigation && window.performance.navigation.type === 1) ||
            window.performance
                .getEntriesByType("navigation")
                .some((nav) => (nav as PerformanceNavigationTiming).type === "reload")
        );
    }, []);
    const initialUpdate = useRef<boolean>(true);
    const navigationType = useNavigationType();
    useEffect(() => {
        // for preserve scroll
        if (!isReload && initialUpdate.current && navigationType === "POP") {
            return;
        }
        setTsvList([]);
    }, [input, navigationType, isReload]);
    useEffect(() => {
        initialUpdate.current = false;
        return () => {
            initialUpdate.current = true;
        };
    }, []);
    const onInputChange: ChangeEventHandler<HTMLInputElement> = (event) => {
        const nextQuery = event.target.value;
        setInput(nextQuery);
        setSearchParams({
            ...searchAsObject,
            q: nextQuery
        });
    };
    // stream
    useEffect(() => {
        // for preserve scroll
        if (initialUpdate.current && navigationType === Action.Pop) {
            return;
        }
        const controller = new AbortController();
        const signal = controller.signal;
        let textBuffer = "";
        const push = (tsv: null | ParsedTSVLine) => {
            if (!tsv) {
                return;
            }
            startTransition(() => {
                setTsvList((texts) => texts.concat([tsv]));
            });
        };
        const decoder = new TextDecoder();
        fetch(`/api/stream?input=${encodeURIComponent(input)}`, {
            headers: {
                "CSRF-Token": props.csrfToken
            },
            signal
        })
            .then((res) => {
                // Verify that we have some sort of 2xx response that we can use
                if (!res.ok) {
                    throw res;
                }
                if (!res.body) {
                    throw new Error("No body");
                }
                return res.body.getReader();
            })
            .then((reader) => {
                function readChunk({ done, value }: ReadableStreamDefaultReadResult<any>) {
                    if (done) {
                        push(parseTSVLine(textBuffer));
                        return;
                    }
                    textBuffer += decoder.decode(value);
                    const lines = textBuffer.split("\n");
                    for (const line of lines.slice(0, -1)) {
                        push(parseTSVLine(line));
                    }
                    textBuffer = lines.slice(-1)[0];
                    // next
                    reader
                        .read()
                        .then(readChunk)
                        .catch(() => {
                            // skip
                        });
                }

                startTransition(() => {
                    setTsvList([]);
                });
                reader
                    .read()
                    .then(readChunk)
                    .catch(() => {
                        // skip
                    });
            })
            .catch(() => {
                textBuffer = "";
                startTransition(() => {
                    setTsvList([]);
                });
            });
        return () => {
            setTsvList([]);
            controller.abort();
        };
    }, [input, navigationType]);
    return (
        <div
            style={{
                maxWidth: "1024px",
                margin: "auto"
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignContent: "center",
                    alignItems: "center",
                    position: "sticky",
                    top: 0,
                    padding: "12px 0",
                    background: "var(--nc-bg-1)",
                    borderBottom: "solid 1px var(--nc-bg-2)"
                }}
            >
                <input
                    type={"text"}
                    value={input}
                    onChange={onInputChange}
                    autoFocus={true}
                    style={{ flex: 1, borderRadius: "10px", padding: "8px" }}
                />
            </div>
            <div>
                <p
                    style={{
                        margin: 0,
                        padding: 0,
                        textAlign: "right"
                    }}
                >
                    Hit: {Math.min(tsvList.length, props.displayItemLimit)}/{tsvList.length}
                </p>
                {tsvList.slice(0, props.displayItemLimit).map((tsv, index) => {
                    const filePath = tsv[0];
                    const content = tsv[1];
                    if (!filePath) {
                        return;
                    }
                    const fileUrl = encodeURIComponent(location.origin + "/file/" + encodeURIComponent(filePath));
                    if (!content) {
                        return (
                            <h2 key={index}>
                                <Link
                                    to={{
                                        pathname: "/preview",
                                        search: new URLSearchParams([
                                            ["targetFilePath", filePath],
                                            ["targetUrl", fileUrl],
                                            ["input", input]
                                        ]).toString()
                                    }}
                                >
                                    <LinkContent>{filePath}</LinkContent>
                                </Link>
                            </h2>
                        );
                    } else {
                        // content
                        // TODO: content length hard limit
                        const sliceContent = content.length > 3000 ? content.slice(0, 3000) + "…" : content;
                        return (
                            <p key={index}>
                                <Highlighter
                                    highlightClassName="HighlightKeyWord"
                                    searchWords={highlightKeyword}
                                    autoEscape={true}
                                    textToHighlight={sliceContent}
                                />
                            </p>
                        );
                    }
                })}
            </div>
        </div>
    );
};

const PreviewRoute = (props: { input: string; targetUrl: string; targetFilePath: string } & AppProps) => {
    if (props.targetUrl.endsWith(".pdf")) {
        return <PdfPreview {...props} />;
    } else if (props.targetUrl.endsWith(".epub")) {
        return <EpubPreview {...props} />;
    } else if (IMAGE_PATTERN.test(props.targetFilePath)) {
        return <ImagePreview {...props} />;
    }
    return <DefaultPreview {...props} />;
};
export const Preview = (appProps: AppProps) => {
    const [searchAsObject] = useCustomSearchParams();
    const input = searchAsObject.input;
    const targetUrl = searchAsObject.targetUrl;
    const targetFilePath = searchAsObject.targetFilePath;
    if (!input) {
        throw new Error("require ?input");
    }
    if (!targetUrl) {
        throw new Error("require ?targetUrl");
    }
    if (!targetFilePath) {
        throw new Error("require ?targetFilePath");
    }
    return <PreviewRoute {...appProps} input={input} targetUrl={targetUrl} targetFilePath={targetFilePath} />;
};
export const App: FC<AppProps> = (props) => {
    return (
        <Routes>
            <Route index element={<Main {...props} />} />
            <Route path={"/preview"} element={<Preview {...props} />} />
        </Routes>
    );
};
// preserve scroll
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
    window.addEventListener("beforeunload", () => {
        window.history.scrollRestoration = "auto";
    });
    window.addEventListener("load", () => {
        window.history.scrollRestoration = "manual";
    });
}
