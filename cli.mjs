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
            open: {
                type: "boolean",
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
});
server.app.listen(3000, async () => {
    console.log('http://localhost:3000')
    if (cli.flags.open) {
        await open('http://localhost:3000', { app: { name: 'google chrome' } });
    }
})
