// @ts-check
import fs from "fs";
import express from "express";
import path from "path";
import url from "url";
import { execa } from "execa";
import serveStatic from "serve-static";
import csrf from "csurf";
import cookieParser from "cookie-parser";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csrfProtection = csrf({ cookie: true })
const isTest = process.env.NODE_ENV === 'test'

export async function createServer({
                                       cwd,
                                       run,
                                       query,
                                       preview,
                                       displayItemLimit = 500,
                                       root = process.cwd(),
                                       isProd
    
                                   }) {
    const resolve = (p) => path.resolve(__dirname, p)
    
    const indexProd = isProd
        ? fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
        : ''
    
    const app = express()
    app.use(cookieParser())
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
    app.get('/api/stream', csrfProtection, async (req, res) => {
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
        res.on("close", () => {
            ret.kill('SIGTERM', {
                forceKillAfterTimeout: 100
            })
        });
        ret.stdout.pipe(res);
    });
    app.get('/api/preview', csrfProtection, async (req, res) => {
        const input = req.query.input;
        const target = req.query.target;
        if (!input) {
            return res.end();
        }
        if (!preview) {
            return res.end();
        }
        const runCommand = preview.replace("{input}", `"${input}"`).replace("{target}", `"${target}"`);
        console.log({ input, target, runCommand })
        // const x = []
        const ret = execa(runCommand, {
            cwd: cwd,
            shell: true,
            // https://stackoverflow.com/questions/68947940/node-js-child-process-is-not-giving-any-response-or-any-error
            stdio: ['ignore', 'pipe', 'pipe']
        });
        res.on("close", () => {
            ret.kill('SIGTERM', {
                forceKillAfterTimeout: 100
            })
        });
        ret.stdout.pipe(res);
    });
    app.get('/file/:filepath', csrfProtection, async (req, res) => {
        const filepath = decodeURIComponent(req.params.filepath);
        if (!filepath) {
            return res.end();
        }
        const actualFilePath = path.join(cwd, filepath);
        res.sendFile(actualFilePath);
    });
    
    app.use('*', csrfProtection, async (req, res) => {
        try {
            const originalUrl = req.originalUrl
            let template, render
            if (!isProd) {
                // always read fresh template in dev
                template = fs.readFileSync(resolve('index.html'), 'utf-8')
                template = await vite.transformIndexHtml(originalUrl, template)
                render = (await vite.ssrLoadModule('/app/entry-server.tsx')).render
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
                    initialQuery: query,
                    csrfToken: req.csrfToken(),
                    displayItemLimit: displayItemLimit
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
