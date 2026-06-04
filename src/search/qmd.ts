import { spawn } from "node:child_process";

export interface QmdCommandResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface QmdCommandRunner {
  readonly run: (args: readonly string[]) => Promise<QmdCommandResult>;
}

export interface NodeQmdRunnerOptions {
  readonly command?: string;
  readonly timeoutMs?: number;
}

export interface QmdModels {
  readonly embedding?: string;
  readonly reranking?: string;
  readonly generation?: string;
}

export type QmdProviderStatus =
  | { readonly available: true; readonly models: QmdModels }
  | { readonly available: false; readonly reason: string };

export interface QmdHitEvidence {
  readonly lexical: boolean;
  readonly vector: boolean;
}

export interface QmdSearchHit {
  readonly docid: string;
  readonly score: number;
  readonly uri: string;
  readonly path: string;
  readonly line?: number;
  readonly title?: string;
  readonly snippet: string;
  readonly evidence: QmdHitEvidence;
}

export type QmdQueryResult =
  | { readonly available: true; readonly hits: readonly QmdSearchHit[] }
  | { readonly available: false; readonly reason: string; readonly hits: readonly QmdSearchHit[] };

export interface QmdStatusOptions {
  readonly runner?: QmdCommandRunner;
}

export interface QmdQueryOptions {
  readonly query: string;
  readonly collection?: string;
  readonly limit?: number;
  readonly runner?: QmdCommandRunner;
}

const DEFAULT_QMD_TIMEOUT_MS = 60_000;

export function createNodeQmdRunner(opts: NodeQmdRunnerOptions = {}): QmdCommandRunner {
  const command = opts.command ?? "qmd";
  const timeoutMs = opts.timeoutMs ?? DEFAULT_QMD_TIMEOUT_MS;
  return {
    run: (args) =>
    new Promise((resolve) => {
      const child = spawn(command, [...args], { stdio: ["ignore", "pipe", "pipe"] });
      const stdout: string[] = [];
      const stderr: string[] = [];
      let settled = false;
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        finish({
          status: 124,
          stdout: stdout.join(""),
          stderr: `qmd timed out after ${timeoutMs}ms`,
        });
      }, timeoutMs);

      function finish(result: QmdCommandResult): void {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(result);
      }

      child.stdout.setEncoding("utf-8");
      child.stderr.setEncoding("utf-8");
      child.stdout.on("data", (chunk: string) => stdout.push(chunk));
      child.stderr.on("data", (chunk: string) => stderr.push(chunk));
      child.on("error", (error) => {
        finish({ status: 127, stdout: stdout.join(""), stderr: error.message });
      });
      child.on("close", (status) => {
        finish({ status: status ?? 1, stdout: stdout.join(""), stderr: stderr.join("") });
      });
    }),
  };
}

export const nodeQmdRunner: QmdCommandRunner = createNodeQmdRunner();

function modelLine(stdout: string, label: string): string | undefined {
  const pattern = new RegExp(`^\\s*${label}:\\s*(.+)$`, "im");
  const match = pattern.exec(stdout);
  return match?.[1]?.trim();
}

function unavailable(result: QmdCommandResult): QmdProviderStatus {
  const reason = result.stderr.trim() || result.stdout.trim() || `qmd exited with status ${result.status}`;
  return { available: false, reason };
}

export async function readQmdStatus(opts: QmdStatusOptions = {}): Promise<QmdProviderStatus> {
  const runner = opts.runner ?? nodeQmdRunner;
  const result = await runner.run(["status"]);
  if (result.status !== 0) {
    return unavailable(result);
  }

  return {
    available: true,
    models: {
      embedding: modelLine(result.stdout, "Embedding"),
      reranking: modelLine(result.stdout, "Reranking"),
      generation: modelLine(result.stdout, "Generation"),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function hasNumberArray(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  return Array.isArray(value) && value.some((item) => typeof item === "number");
}

function qmdUriPath(uri: string): string {
  return uri.replace(/^qmd:\/\/[^/]+\//, "");
}

function parseHit(value: unknown): QmdSearchHit | undefined {
  if (!isRecord(value)) return undefined;
  const docid = stringField(value, "docid");
  const score = numberField(value, "score");
  const uri = stringField(value, "file");
  const snippet = stringField(value, "snippet") ?? "";
  if (!docid || score === undefined || !uri) return undefined;

  const explain = value["explain"];
  const explainRecord = isRecord(explain) ? explain : {};
  return {
    docid,
    score,
    uri,
    path: qmdUriPath(uri),
    line: numberField(value, "line"),
    title: stringField(value, "title"),
    snippet,
    evidence: {
      lexical: hasNumberArray(explainRecord, "ftsScores"),
      vector: hasNumberArray(explainRecord, "vectorScores"),
    },
  };
}

export async function queryQmd(opts: QmdQueryOptions): Promise<QmdQueryResult> {
  const runner = opts.runner ?? nodeQmdRunner;
  const limit = Math.max(1, Math.min(opts.limit ?? 10, 50));
  const args = ["query", "--format", "json", "--explain", "-n", String(limit)];
  if (opts.collection) {
    args.push("-c", opts.collection);
  }
  args.push(opts.query);

  const result = await runner.run(args);
  if (result.status !== 0) {
    return { ...unavailable(result), hits: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      available: false,
      reason: `Unable to parse qmd JSON: ${detail}`,
      hits: [],
    };
  }

  const values = Array.isArray(parsed) ? parsed : [];
  return {
    available: true,
    hits: values.flatMap((value) => {
      const hit = parseHit(value);
      return hit ? [hit] : [];
    }),
  };
}
