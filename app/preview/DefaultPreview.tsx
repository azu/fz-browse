import { PreviewProps } from "./PreviewType";
import { FC, useEffect, useMemo, useState } from "react";
import Highlighter from "react-highlight-words";

export const DefaultPreview: FC<PreviewProps> = (props) => {
    const [preview, setPreview] = useState<string[]>([]);
    useEffect(() => {
        let textBuffer = "";
        const push = (line?: string) => {
            if (!line) {
                return;
            }
            setPreview((texts) => texts.concat(line));
        };
        const controller = new AbortController();
        const signal = controller.signal;
        const decoder = new TextDecoder();
        fetch(
            `/api/preview?input=${encodeURIComponent(props.input)}&target=${encodeURIComponent(props.targetFilePath)}`,
            {
                headers: {
                    "CSRF-Token": props.csrfToken
                },
                signal
            }
        )
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
                        push(textBuffer);
                        return;
                    }
                    textBuffer += decoder.decode(value);
                    const lines = textBuffer.split("\n");
                    for (const line of lines.slice(0, -1)) {
                        push(line);
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

                setPreview([]);
                reader
                    .read()
                    .then(readChunk)
                    .catch(() => {
                        // skip
                    });
            });
        return () => {
            controller.abort();
            setPreview([]);
        };
    }, [props]);
    const highlightKeyword = useMemo(() => {
        return props.input.split(/[|^\[\]().+*$]/);
    }, [props.input]);
    const actualFilePath = useMemo(() => {
        return props.cwd + props.targetFilePath;
    }, [props]);
    return (
        <div
            style={{
                maxWidth: "1024px",
                margin: "auto",
                padding: "1rem 0"
            }}
        >
            <p style={{ color: "blue" }}>{actualFilePath}</p>
            <div
                style={{
                    borderTop: "solid #ddd 1px",
                    padding: "1rem 0"
                }}
            >
                {preview.map((item, index) => {
                    return (
                        <p key={index}>
                            <Highlighter
                                highlightClassName="HighlightKeyWord"
                                searchWords={highlightKeyword}
                                autoEscape={true}
                                textToHighlight={item}
                            />
                        </p>
                    );
                })}
            </div>
        </div>
    );
};
