// @ts-check
import fs from "fs";
import express from "express";
import path from "path";
import url from "url";
import { execa } from "execa";
import serveStatic from "serve-static";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isTest = process.env.NODE_ENV === 'test'

export async function createServer({
                                       cwd,
                                       run,
                                       query,
                                       preview,
                                       root = process.cwd(),
                                       isProd = process.env.NODE_ENV === 'production'
    
                                   }) {
    const resolve = (p) => path.resolve(__dirname, p)
    
    const indexProd = isProd
        ? fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
        : ''
    
    const app = express()
    
    /**
     * @type {import('vite').ViteDevServer}
     */
    let vite
    if (!isProd) {
        const createServer = await import("vite").then(_ => _.createServer);
        vite = await createServer({
            root,
            logLevel: isTest ? 'error' : 'info',
            server: {
                middlewareMode: 'ssr',
                watch: {
                    // During tests we edit the files too fast and sometimes chokidar
                    // misses change events, so enforce polling for consistency
                    usePolling: true,
                    interval: 100
                }
            }
        })
        // use vite's connect instance as middleware
        app.use(vite.middlewares)
    } else {
        const compression = await import('compression').then(_ => _.default);
        app.use(compression())
        app.use(serveStatic(resolve('dist/client'), {
                index: false
            })
        )
    }
    app.use("/public", serveStatic(path.join(__dirname, 'public')))
    app.get('/stream', async (req, res) => {
        const input = req.query.input;
        if (!input) {
            return res.end();
        }
        const runCommand = run.replace("{input}", `"${input}"`);
        console.log({ input, runCommand })
        // const x = []
        const ret = execa(runCommand, {
            cwd: cwd,
            shell: true,
            // https://stackoverflow.com/questions/68947940/node-js-child-process-is-not-giving-any-response-or-any-error
            stdio: ['ignore', 'pipe', 'pipe']
        });
        ret.stdout.pipe(res);
    });
    app.get('/preview', async (req, res) => {
        const input = req.query.input;
        const result = req.query.result;
        if (!input) {
            return res.end();
        }
        const runCommand = preview.replace("{input}", `"${input}"`).replace("{result}", `"${result}"`);
        console.log({ input, result, runCommand })
        // const x = []
        const ret = execa(runCommand, {
            cwd: cwd,
            shell: true,
            // https://stackoverflow.com/questions/68947940/node-js-child-process-is-not-giving-any-response-or-any-error
            stdio: ['ignore', 'pipe', 'pipe']
        });
        ret.stdout.pipe(res);
    });
    app.get('/file/:filepath', async (req, res) => {
        const filepath = decodeURIComponent(req.params.filepath);
        if (!filepath) {
            return res.end();
        }
        const actualFilePath = path.join(cwd, filepath);
        res.sendFile(actualFilePath);
    });
    
    app.use('*', async (req, res) => {
        try {
            const originalUrl = req.originalUrl
            let template, render
            if (!isProd) {
                // always read fresh template in dev
                template = fs.readFileSync(resolve('index.html'), 'utf-8')
                template = await vite.transformIndexHtml(originalUrl, template)
                render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
            } else {
                template = indexProd
                render = await import('./dist/server/entry-server.js').then(_ => _.render)
            }
            const context = {}
            const appHtml = render(originalUrl, context)
            
            if (context.url) {
                // Somewhere a `<Redirect>` was rendered
                return res.redirect(301, context.url)
            }
            
            const html = template
                .replace(`<!--app-html-->`, appHtml)
                .replace(`{{props.initialData}}`, JSON.stringify({
                    cwd: url.pathToFileURL(cwd),
                    initialQuery: query
                }))
            res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
        } catch (e) {
            !isProd && vite.ssrFixStacktrace(e)
            console.log(e.stack)
            res.status(500).end(e.stack)
        }
    })
    
    return { app, vite }
}

if (!isTest) {
    // createServer().then(({ app }) =>
    //   app.listen(3000, () => {
    //     console.log('http://localhost:3000')
    //   })
    // )
}
