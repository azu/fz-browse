import { PreviewProps } from "./PreviewType";
import { FC, useMemo } from "react";

export const EpubPreview: FC<PreviewProps> = (props) => {
    const viewerUrl = useMemo(() => {
        return `/epub/index.html?file=${props.targetUrl}&search=${encodeURIComponent(props.input)}`;
    }, [props]);
    return (
        <iframe
            src={viewerUrl}
            style={{
                width: "100vw",
                height: "100vh"
            }}
        />
    );
};
