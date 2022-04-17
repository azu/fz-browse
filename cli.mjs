#!/usr/bin/env node
import meow from "meow";
import path from "path";
import url from "url";
import open from "open";
import { createServer } from "./server.mjs";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cli = meow(
    `
  
    Usage
      $ node cli.mjs

    Options
      --run             [String] Run command
      --preview         [String] Preview command
      --cwd             [String:Path] Current working directory

    Examples
      
      `,
    {
        importMeta: import.meta,
        flags: {
            cwd: {
                type: "string",
                isRequired: true,
                default: process.cwd()
            },
            run: {
                type: "string",
                isRequired: true
            },
            preview: {
                type: "string",
            },
            query: {
                type: "string",
            },
            browser: {
                type: "string"
            },
            open: {
                type: "boolean",
            },
            displayItemLimit: {
                type: "number",
                default: 500
            }
        },
        autoHelp: true,
        autoVersion: true,
    },
);

const server = await createServer({
    cwd: cli.flags.cwd,
    run: cli.flags.run,
    query: cli.flags.query,
    preview: cli.flags.preview,
    displayItemLimit: cli.flags.displayItemLimit,
    isProd: process.env.NODE_ENV !== 'develop'
});
const PORT = process.env.PORT ?? 0;
const listener = server.app.listen(PORT, async () => {
    console.log(`http://localhost:${listener.address().port}`)
    if (cli.flags.open) {
        const query = cli.flags.query ? "?" + new URLSearchParams([[
            "q", cli.flags.query
        ]]).toString() : ""
        const options = cli.flags.browser ? { app: { name: cli.flags.browser } } : {}
        await open(`http://localhost:${listener.address().port}${query}`, options);
    }
});
