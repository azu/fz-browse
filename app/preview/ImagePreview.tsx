import { PreviewProps } from "./PreviewType";
import { FC, useMemo } from "react";

export const ImagePreview: FC<PreviewProps> = (props) => {
    const imgUrl = useMemo(() => {
        return "/file/" + encodeURIComponent(props.targetFilePath);
    }, [props]);
    return <img src={imgUrl} loading={"lazy"} alt={props.targetFilePath} />;
};
