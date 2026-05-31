import { parse as parseYaml } from "yaml";

/**
 * Split a markdown document into its YAML frontmatter and body.
 *
 * Recognizes the standard Obsidian/Jekyll fence: a `---` line at the very start
 * of the file, the YAML block, then a closing `---` line.
 */
export interface ParsedNote {
  /** Parsed frontmatter as a plain object. Empty object when no frontmatter. */
  frontmatter: Record<string, unknown>;
  /** The markdown body after the closing fence (or the whole doc if no fence). */
  body: string;
  /** Whether a frontmatter block was present. */
  hasFrontmatter: boolean;
}

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseNote(raw: string): ParsedNote {
  // Only treat as frontmatter if the document opens with the fence.
  if (!raw.startsWith("---")) {
    return { frontmatter: {}, body: raw, hasFrontmatter: false };
  }
  const match = FENCE.exec(raw);
  if (!match) {
    return { frontmatter: {}, body: raw, hasFrontmatter: false };
  }
  const yamlText = match[1] ?? "";
  const parsed = parseYaml(yamlText);
  const frontmatter =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  return {
    frontmatter,
    body: raw.slice(match[0].length),
    hasFrontmatter: true,
  };
}
