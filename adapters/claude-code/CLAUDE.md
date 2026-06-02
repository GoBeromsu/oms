# Oh My Second Brain Convention Fragment

<!-- Append this block to your project's CLAUDE.md to activate Oh My Second Brain conventions in Claude Code. -->

## Vault Convention (Oh My Second Brain)

This vault is governed by Oh My Second Brain conventions stored in `.oms/`.
All knowledge capture and retrieval must follow the declared semantic convention.

**Before working with vault notes:**
- Run `npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.5/oms-0.1.5.tgz doctor` to validate existing notes against the convention (exits 0, non-blocking).
- Read `.oms/taxonomy.yaml` to understand which folders hold which concepts.
- Read `.oms/concepts/*.yaml` to understand field requirements and lenses.

**When capturing new knowledge:**
- Use the `/oms-capture` skill or follow the librarian persona (`core/agents/librarian.md`).
- Every note must carry the required frontmatter fields for its concept.
- Place notes in the folder declared in the taxonomy — do not invent new folders without updating `.oms/taxonomy.yaml`.

**When retrieving knowledge:**
- Use the `/oms-retrieve` skill or follow the retriever persona (`core/agents/retriever.md`).
- Apply the concept's declared lens for the retrieval purpose (synthesis, audit, etc.).
- Return only the fields the lens specifies — do not dump full frontmatter.

**Convention violations are warnings, not errors (v0).**
`npx -y https://github.com/GoBeromsu/oms/releases/download/oms-v0.1.5/oms-0.1.5.tgz doctor` always exits 0. Fix violations incrementally.
