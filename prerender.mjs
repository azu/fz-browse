// Pre-render the app into static HTML.
// run `yarn generate` and then `dist/static` can be served as a static site.
import fs from "fs";
import path from "path";
import { render } from "./dist/server/entry-server.js";
import url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toAbsolute = (p) => path.resolve(__dirname, p)
const template = fs.readFileSync(toAbsolute('dist/static/index.html'), 'utf-8')


// determine routes to pre-render from src/pages
const routesToPrerender = fs
    .readdirSync(toAbsolute('src/pages'))
    .map((file) => {
        const name = file.replace(/\.tsx$/, '').toLowerCase()
        return name === 'home' ? `/` : `/${name}`
    })

;(async () => {
    // pre-render each route...
    for (const url of routesToPrerender) {
        const appHtml = await render(url)
        const html = template.replace(`<!--app-html-->`, appHtml)
        
        const filePath = `dist/static${url === '/' ? '/index' : url}.html`
        fs.writeFileSync(toAbsolute(filePath), html)
        console.log('pre-rendered:', filePath)
    }
})()
