# fz-browse

fzf-like tool but view on browser.

## Installation

    npm install --global fz-browse

## Usage

    Usage
      $ fz-browse [option]

    Options
      --run                        [String] Run command
      --preview                    [String] Preview command
      --cwd                        [String:Path] Current working directory
      --query                      [String] Default search query
      --open                       [Boolean] If it is set, open browser automatically
      --browser                    [String] for opening browser name: chrome, firefox, edge
      --displayItemLimit           [Number] Limit count for display search results

    Examples
      # Search text contents
      fz-browse --run $'rg --ignore-case {input} --json | jq \'if .type == "begin" or .type == "match" then . else empty end | [.data.path.text, .data.lines.text] | @tsv\' -r' --preview "rg --context 5 {input} {target}"
      # Search PDF/epub books
      fz-browse --run $'rga --ignore-case {input} --json | jq \'if .type == "begin" or .type == "match" then . else empty end | [.data.path.text, .data.lines.text] | @tsv\' -r' --preview "rga --context 5 {input} {target}" --cwd "/Path/To/Your/BookDir"

## Command Output Format

### Run command output format

- `--run`: fz-browse execute the `run` command when input search keywords

`--run` command should output following file path by line.

```
/path/to/file
/path/to/file
/path/to/file
```

Also, support following TSV list by line.
If you want to display content of the file in search result, `--run` command should output `<filepath>\t<content>` pattern.

```tsv
/path/to/fileA
/path/to/file\tContent of the file A1
/path/to/file\tContent of the file A2
/path/to/file\tContent of the file A3
/path/to/fileB
/path/to/file\tContent of the file B1
```

It will be converted to following structure on view.

```html
<h2><a href="/preview/?target=/path/to/fileA">/path/to/fileA</a></h2>

<p>Content of the file A1</p>
<p>Content of the file A2</p>
<p>Content of the file A3</p>

<h2><a href="/preview/?target=/path/to/fileB">/path/to/fileB</a></h2>

<p>Content of the file B1</p>
```

:memo: Empty TSV line will be ignored.

```tsv
/path/to/fileA
/path/to/file\tContent of the file A1
/path/to/file\tContent of the file A2
/path/to/file\tContent of the file A3
\t # This line will be ignored
```

### Preview command output format

- `--preview`: fz-browse execute the `preview` command when click the search result

`--preview` command should output following content by line.

```
content A
content B
content C
```

It will be converted to following structure on view.

```html
<p>content A</p>
<p>content B</p>
<p>content C</p>
```


It will be converted

## Recipes

### Search text contents

- Requirements:
  - [ripgrep](https://github.com/BurntSushi/ripgrep)
  - [jq](https://stedolan.github.io/jq/)

```shell
fz-browse --run $'rg --ignore-case {input} --json | jq \'if .type == "begin" or .type == "match" then . else empty end | [.data.path.text, .data.lines.text] | @tsv\' -r' --preview "rg --context 5 {input} {target}"
```

### Search PDF and epub books

- Requirements:
  - [ripgrep-all](https://github.com/phiresky/ripgrep-all)
  - [jq](https://stedolan.github.io/jq/)

```shell
fz-browse --run $'rga --ignore-case {input} --json | jq \'if .type == "begin" or .type == "match" then . else empty end | [.data.path.text, .data.lines.text] | @tsv\' -r' --preview "rga --context 5 {input} {target}" --cwd "/Path/To/Your/BookDir"
```

<details>
<summary>Description</summary>

It means that convert only "begin" and "match" JSON line to TSV.

```
rga test --json | jq 'if .type == "begin" or .type == "match" then 
  .     # Pass it-self to next pipe
else 
  empty # remove this live
end | [.data.path.text, .data.lines.text] | @tsv'
```

</details>

## Develop

    git clone https://github.com/azu/fz-browse
    cd fz-browse
    yarn install
    # using vite server
    NODE_ENV=develop PORT=3000 node ./cli.mjs ...

## License

MIT ©️ azu


