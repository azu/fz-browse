export type ParsedTSVLine = [filePath: string, content: string];
export const parseTSVLine = (line: string): ParsedTSVLine | null => {
    if (!line) {
        return null;
    }
    const items = line.split("\t");
    if (items.length === 1) {
        return [line, ""];
    }
    if (items.length !== 2) {
        return null;
    }
    if (items[0] === "" && items[1] === "") {
        return null;
    }
    if (items[0] !== "" && items[1] === undefined) {
        return [items[0], ""];
    }
    // FIXME: remove this \\n hack for ripgrep
    return [items[0], items[1].replace(/\\n$/, "")] as ParsedTSVLine;
};

if (import.meta.vitest) {
    const { it, assert } = import.meta.vitest;
    it("parseTSVLine", () => {
        assert.deepStrictEqual(parseTSVLine("./test/js.pdf"), ["./test/js.pdf", ""]);
        assert.deepStrictEqual(parseTSVLine("./test/js.pdf\t"), ["./test/js.pdf", ""]);
        assert.deepStrictEqual(parseTSVLine("\t"), null);
        assert.deepStrictEqual(parseTSVLine("test.md\ttest\\ttest\\n"), ["test.md", "test\\ttest"]);
        assert.deepStrictEqual(parseTSVLine(""), null);
    });
}
