import { PreviewProps } from "./PreviewType";
import { FC } from "react";

export const DefaultPreview: FC<PreviewProps> = (props) => {
    return <div style={{
        width: "100vw",
        height: "100vh"
    }}>
        input: {props.input}
        target: {props.target}
    </div>
}
