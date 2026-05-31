/**
 * Lexa MCP server stub.
 *
 * The full MCP backbone (wiring @modelcontextprotocol/sdk, transport negotiation,
 * tool dispatch) is roadmap work, not implemented in v0. This module is a safe
 * import-time no-op: it exports the tool registry and a factory that returns a
 * plain object. Nothing here throws on import.
 */

export interface LexaMcpTool {
  name: string;
  description: string;
}

export const lexaMcpTools: LexaMcpTool[] = [
  {
    name: "capture",
    description: "Capture a note into the vault with validated frontmatter.",
  },
  {
    name: "retrieve",
    description: "Retrieve notes matching a concept lens and field filters.",
  },
  {
    name: "validate_frontmatter",
    description: "Validate a note's frontmatter against the active ontology.",
  },
];

/**
 * Create a Lexa MCP server handle.
 *
 * Returns a plain registry object in v0. In a future release this will construct
 * an @modelcontextprotocol/sdk Server instance with registered tool handlers.
 */
export function createLexaMcpServer(): { tools: LexaMcpTool[] } {
  /* TODO: wire @modelcontextprotocol/sdk in roadmap */
  return { tools: lexaMcpTools };
}
