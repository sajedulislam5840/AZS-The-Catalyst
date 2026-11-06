/**
 * Cleans up AI answers before they are drawn as Markdown + math.
 *
 * Models often write maths as \( ... \) and \[ ... \]. Markdown treats "\(" and "\["
 * as escaped brackets, so students see stray "[ ... ]" and raw "\frac{1}{u}". The renderer
 * only understands $...$ and $$...$$, so those forms are converted here. Code is left alone.
 */

const CODE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g;

// A formula that sits in a table row must stay on that line, so it becomes inline maths.
function inTableRow(whole: string, offset: number): boolean {
    const lineStart = whole.lastIndexOf("\n", offset - 1) + 1;
    return whole.slice(lineStart, offset).trim().startsWith("|");
}

const display = (inner: string) => `\n\n$$\n${inner.trim()}\n$$\n\n`;

function fixOutsideCode(text: string): string {
    return (
        text
            // \[ ... \]  ->  display formula (inline inside a table row)
            .replace(/\\\[([\s\S]+?)\\\]/g, (_m, inner: string, offset: number, whole: string) =>
                inTableRow(whole, offset) ? `$${inner.trim()}$` : display(inner)
            )
            // \( ... \)  ->  $...$  (inline)
            .replace(/\\\(([\s\S]+?)\\\)/g, (_m, inner: string) => `$${inner.trim()}$`)
            // "[ \frac{a}{b} ]" on its own line: a display formula whose backslash was already eaten
            .replace(/^[ \t]*\[[ \t]+(\\[a-zA-Z][\s\S]*?)[ \t]+\][ \t]*$/gm, (_m, inner: string) => display(inner))
            // A table must start on its own line, or it prints as raw "|" text
            .replace(/([^\n|])\n(\|[^\n]*\|[ \t]*\n\|[ \t:|-]*-[ \t:|-]*\|)/g, "$1\n\n$2")
    );
}

export function prepareAiMarkdown(text: string): string {
    if (!text) return "";
    let out = "";
    let last = 0;
    for (const match of text.matchAll(CODE)) {
        const start = match.index ?? 0;
        out += fixOutsideCode(text.slice(last, start)) + match[0];
        last = start + match[0].length;
    }
    return (out + fixOutsideCode(text.slice(last))).replace(/\n{3,}/g, "\n\n").trim();
}

// KaTeX options: never throw, and keep going when a formula has an unknown symbol or Bangla letters.
export const KATEX_OPTIONS = { strict: false, throwOnError: false, errorColor: "#CC310E" } as const;
