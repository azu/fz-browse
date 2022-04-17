import ReactDOMServer from 'react-dom/server'
import { StaticRouter, } from "react-router-dom/server"
import { App } from './App'

const initialData = {
    initialQuery: "",
    cwd: "",
    csrfToken: "",
    displayItemLimit: 200
}

export function render(url: string) {
    return ReactDOMServer.renderToString(
        <StaticRouter location={url}>
            <App {...initialData} />
        </StaticRouter>
    )
}
