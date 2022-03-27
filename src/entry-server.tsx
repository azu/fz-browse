import ReactDOMServer from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { App } from './App'
import type { StaticRouterContext } from "react-router";

const initialData = {
    initialInput: ""
}

export function render(url: string, context: StaticRouterContext) {
    return ReactDOMServer.renderToString(
        <StaticRouter location={url} context={context}>
            <App {...initialData} />
        </StaticRouter>
    )
}
