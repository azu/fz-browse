import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { App, AppProps } from './App'

const initialData = JSON.parse(document.getElementById('initial-data')?.getAttribute('data-json') ?? "{}") as AppProps;

ReactDOM.hydrate(
    <BrowserRouter>
        <App {...initialData}/>
    </BrowserRouter>,
    document.getElementById('app')
)
