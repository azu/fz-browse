import { PreviewProps } from "./PreviewType";
import { FC, useMemo } from "react";

const PdfPreview: FC<PreviewProps> = (props) => {
    const viewerUrl = useMemo(() => {
        return `/public/pdf/web/viewer.html?file=${props.target}#search=${encodeURIComponent(props.input)}`;
    }, [props])
    return <iframe src={viewerUrl} style={{
        width: "100vw",
        height: "100vh"
    }}/>
}
export default PdfPreview
