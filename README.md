# fz-browser

fzf-like tool but view on browser.

## Format

Support simple file path list by line.

```
/path/to/file
/path/to/file
/path/to/file
```

Support following TSV list by line.

```tsv
/path/to/fileA
/path/to/file\tContent of the file A1
/path/to/file\tContent of the file A2
/path/to/file\tContent of the file A3
/path/to/fileB
/path/to/file\tContent of the file B1
```

It will be converted to following structure on view.

```markdown
# /path/to/file

Content of the file A1
Content of the file A2
Content of the file A3

# /path/to/fileB

Content of the file B1
```

Empty TSV line will be ignored.

```tsv
/path/to/fileA
/path/to/file\tContent of the file A1
/path/to/file\tContent of the file A2
/path/to/file\tContent of the file A3
\t # This line will be ignored
```

## Tips

jq support TSV.

ripgrep-all + jq.

```
rga test --json | jq 'if .type == "begin" or .type == "match" then . else {} end | [.data.path.text, .data.lines.text] | @tsv'
```

It means that convert only "begin" and "match" JSON line to TSV.

```
rga test --json | jq 'if .type == "begin" or .type == "match" then 
  .     # Pass it-self to next pipe
else 
  empty # remove this live
end | [.data.path.text, .data.lines.text] | @tsv'
```
