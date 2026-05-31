import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, access } from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../");
const pluginJsonPath = path.join(
  repoRoot,
  "adapters",
  "claude-code",
  ".claude-plugin",
  "plugin.json",
);
// In Claude Code, skill paths in plugin.json are resolved relative to the
// PLUGIN ROOT (the directory containing `.claude-plugin/`), not relative to
// `.claude-plugin/` itself. Mirror that here so the test validates the real
// install layout.
const pluginRoot = path.dirname(path.dirname(pluginJsonPath));

describe("claude-code plugin DoD", () => {
  it("plugin.json has non-empty name, version, description and a non-empty skills array", async () => {
    const raw = await readFile(pluginJsonPath, "utf-8");
    const plugin = JSON.parse(raw) as Record<string, unknown>;

    expect(typeof plugin["name"]).toBe("string");
    expect((plugin["name"] as string).length).toBeGreaterThan(0);

    expect(typeof plugin["version"]).toBe("string");
    expect((plugin["version"] as string).length).toBeGreaterThan(0);

    expect(typeof plugin["description"]).toBe("string");
    expect((plugin["description"] as string).length).toBeGreaterThan(0);

    expect(Array.isArray(plugin["skills"])).toBe(true);
    expect((plugin["skills"] as unknown[]).length).toBeGreaterThan(0);
  });

  it("each skill entry directory exists and contains SKILL.md", async () => {
    const raw = await readFile(pluginJsonPath, "utf-8");
    const plugin = JSON.parse(raw) as Record<string, unknown>;
    const skills = plugin["skills"] as string[];

    for (const skillPath of skills) {
      const absDir = path.resolve(pluginRoot, skillPath);
      const skillMd = path.join(absDir, "SKILL.md");
      // Throws if file doesn't exist — vitest will report it as a failure.
      await expect(access(skillMd)).resolves.toBeUndefined();
    }
  });

  it("the setup skill SKILL.md mentions 'npx lexa'", async () => {
    // The setup skill entry is "./skills/setup/" relative to the plugin root.
    const setupSkillPath = path.resolve(pluginRoot, "./skills/setup/SKILL.md");
    const content = await readFile(setupSkillPath, "utf-8");
    expect(content).toContain("npx lexa");
  });
});
