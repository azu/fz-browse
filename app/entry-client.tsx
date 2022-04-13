import ReactDOM, { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App, AppProps } from './App'

const initialData = JSON.parse(document.getElementById('initial-data')?.getAttribute('data-json') ?? "{}") as AppProps;

const root = ReactDOM.hydrateRoot(document.getElementById('app')!, <BrowserRouter>
        <App {...initialData}/>
    </BrowserRouter>
);
