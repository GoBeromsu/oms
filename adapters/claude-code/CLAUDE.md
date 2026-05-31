# Lexa Convention Fragment

<!-- Append this block to your project's CLAUDE.md to activate Lexa conventions in Claude Code. -->

## Vault Convention (Lexa)

This vault is governed by Lexa conventions stored in `.lexa/`.
All knowledge capture and retrieval must follow the declared semantic convention.

**Before working with vault notes:**
- Run `npx lexa doctor` to validate existing notes against the convention (exits 0, non-blocking).
- Read `.lexa/taxonomy.yaml` to understand which folders hold which concepts.
- Read `.lexa/concepts/*.yaml` to understand field requirements and lenses.

**When capturing new knowledge:**
- Use the `/lexa-capture` skill or follow the librarian persona (`core/agents/librarian.md`).
- Every note must carry the required frontmatter fields for its concept.
- Place notes in the folder declared in the taxonomy — do not invent new folders without updating `.lexa/taxonomy.yaml`.

**When retrieving knowledge:**
- Use the `/lexa-retrieve` skill or follow the retriever persona (`core/agents/retriever.md`).
- Apply the concept's declared lens for the retrieval purpose (synthesis, audit, etc.).
- Return only the fields the lens specifies — do not dump full frontmatter.

**Convention violations are warnings, not errors (v0).**
`npx lexa doctor` always exits 0. Fix violations incrementally.
