// Minimal frontmatter reader — deliberately not a YAML dependency.
//
// The contract is flat `key: value` pairs plus one-line arrays. Anything that
// needs real YAML is over-modelled metadata: frontmatter is a card label and a
// join key, not a config file. Keeping this dependency-free is also what lets
// the same code run under Node, Bun, and a bundler without a resolution story.

/** `--- … ---` at the top of a file → { data, body }. Returns null when absent. */
export function parseFrontmatter(src) {
  if (!src.startsWith("---\n")) return null;
  const end = src.indexOf("\n---", 4);
  if (end === -1) return null;

  const data = {};
  for (const line of src.slice(4, end).split("\n")) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!m) continue;
    const [, key, raw] = m;
    const value = raw.trim();

    // One-line arrays: `tasks: [A.1, A.2]`
    if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }
    // Strip a trailing `# comment`, then surrounding quotes.
    data[key] = value
      .replace(/\s+#.*$/, "")
      .replace(/^["']|["']$/g, "")
      .trim();
  }

  const bodyStart = src.indexOf("\n", end + 1);
  return { data, body: bodyStart === -1 ? "" : src.slice(bodyStart + 1) };
}

/** First `# ` heading, else a humanised filename. The pre-frontmatter fallback. */
export function titleOfMarkdown(markdown, fallbackFile) {
  const heading = markdown.split("\n").find((l) => l.startsWith("# "));
  if (heading) return heading.slice(2).trim();
  const base = fallbackFile.split("/").pop() ?? fallbackFile;
  return base.replace(/\.md$/i, "").replace(/[-_]/g, " ");
}
