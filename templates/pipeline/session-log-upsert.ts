#!/usr/bin/env bun
/**
 * SessionEnd hook — summarize the finished session (duration, models,
 * tokens, est. cost) and upsert it as a "Session log" row in TWO places:
 * a `## Session log` section at the bottom of __project__/tasks/done.md
 * (the repo's canonical archive — survives machines, visible to
 * collaborators, readable without trawling PR threads), and, when the
 * branch has a PR, the same table as a persistent PR comment. One row per
 * session (a session ending twice replaces its row); a cumulative line
 * answers "total cost till now".
 *
 * SESSION_LOG_DRY_RUN=1 → print the would-be table, write/post nothing.
 */
import { createInterface } from "node:readline";
import {
  createReadStream,
  existsSync,
  appendFileSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";

const MARKER = "<!-- claude-session-log -->";

// $/MTok: [input, output]; cache read = 0.1×in, cache write = 1.25×in
const PRICING: [RegExp, [number, number]][] = [
  [/fable|mythos/, [10, 50]],
  [/opus/, [5, 25]],
  [/sonnet/, [3, 15]],
  [/haiku/, [1, 5]],
];

const priceFor = (model: string): [number, number] =>
  PRICING.find(([re]) => re.test(model))?.[1] ?? [3, 15];

type Agg = { inp: number; out: number; cr: number; cw: number };

const input = JSON.parse(await Bun.stdin.text());
const transcript: string = input.transcript_path ?? "";
const cwd: string = input.cwd ?? process.cwd();
const sessionId: string = (input.session_id ?? "unknown").slice(0, 8);
if (!transcript || !existsSync(transcript)) process.exit(0);

// ---- aggregate the transcript (streamed — transcripts can be huge) ----
const perModel = new Map<string, Agg>();
let first = "";
let last = "";
const rl = createInterface({ input: createReadStream(transcript) });
for await (const line of rl) {
  let e: any;
  try {
    e = JSON.parse(line);
  } catch {
    continue;
  }
  if (e.timestamp) {
    if (!first) first = e.timestamp;
    last = e.timestamp;
  }
  const u = e?.message?.usage;
  const model = e?.message?.model;
  if (e.type !== "assistant" || !u || !model || model === "<synthetic>") continue;
  const agg = perModel.get(model) ?? { inp: 0, out: 0, cr: 0, cw: 0 };
  agg.inp += u.input_tokens ?? 0;
  agg.out += u.output_tokens ?? 0;
  agg.cr += u.cache_read_input_tokens ?? 0;
  agg.cw += u.cache_creation_input_tokens ?? 0;
  perModel.set(model, agg);
}
if (perModel.size === 0) process.exit(0);

let cost = 0;
let tin = 0, tout = 0, tcr = 0;
for (const [model, a] of perModel) {
  const [pin, pout] = priceFor(model);
  cost += (a.inp * pin + a.out * pout + a.cr * pin * 0.1 + a.cw * pin * 1.25) / 1e6;
  tin += a.inp + a.cw;
  tout += a.out;
  tcr += a.cr;
}

const fmt = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${n}`;
const durMs = first && last ? +new Date(last) - +new Date(first) : 0;
const dur = `${Math.floor(durMs / 3.6e6)}h ${String(Math.floor((durMs % 3.6e6) / 6e4)).padStart(2, "0")}m`;
const models = [...perModel.keys()]
  .map((m) => m.replace(/^claude-/, ""))
  .join(", ");
const ended = new Date().toISOString().slice(0, 16).replace("T", " ");

// ---- find the PR ----
const gh = (...args: string[]) =>
  spawnSync("gh", args, { cwd, encoding: "utf8", timeout: 30_000 });

// Attribute the row to whoever ran the session (team setting: every
// member's local agent writes to the same tables). Markdown-hostile
// characters are stripped — the name lands inside a table cell.
const rawAuthor =
  spawnSync("git", ["config", "user.name"], { cwd, encoding: "utf8" }).stdout?.trim() ||
  process.env.USER ||
  "unknown";
const author = rawAuthor.replace(/[|`\\\n]/g, "").slice(0, 24);

const row = `| ${ended} | ${author} | \`${sessionId}\` | ${dur} | ${models} | ${fmt(tin)}/${fmt(tout)}/${fmt(tcr)} | $${cost.toFixed(2)} |`;

const prView = gh("pr", "view", "--json", "number");
const pr = prView.status === 0 ? JSON.parse(prView.stdout).number : null;

const header = [
  MARKER,
  "### 🤖 Session log",
  "",
  "| ended (UTC) | author | session | duration | models | tokens in/out/cache-read | est. cost |",
  "|---|---|---|---|---|---|---|",
].join("\n");

const cumulative = (body: string): string => {
  const total = [...body.matchAll(/\| \$([0-9.]+) \|$/gm)].reduce(
    (s, m) => s + parseFloat(m[1]),
    0,
  );
  return `\n**Cumulative est. cost: $${total.toFixed(2)}** _(API-rate estimate; subscription-billed)_`;
};

/** Rebuild the marker→cumulative table from existing text, upserting `row`. */
const upsertTable = (existingBody: string | null): string => {
  const rows = (existingBody ?? "")
    .split("\n")
    .filter((l) => /^\| /.test(l) && !l.includes("---") && !l.includes("ended (UTC)"))
    .filter((l) => !l.includes(`\`${sessionId}\``));
  let body = [header, ...rows, row].join("\n");
  body += cumulative(body);
  return body;
};

// ---- always: upsert into done.md's Session log section ----
const doneFile = `${cwd}/__project__/tasks/done.md`;
const logTarget = existsSync(doneFile) ? doneFile : `${cwd}/.claude/session-log.md`;
if (!process.env.SESSION_LOG_DRY_RUN) {
  const existing = existsSync(logTarget) ? readFileSync(logTarget, "utf8") : "";
  const start = existing.indexOf(MARKER);
  if (start === -1) {
    appendFileSync(logTarget, `\n---\n\n## Session log (auto — SessionEnd hook)\n\n${upsertTable(null)}\n`);
  } else {
    // section runs from the marker through the cumulative line
    const after = existing.indexOf("\n", existing.indexOf("**Cumulative", start));
    const end = after === -1 ? existing.length : after;
    writeFileSync(
      logTarget,
      existing.slice(0, start) + upsertTable(existing.slice(start, end)) + existing.slice(end),
    );
  }
}

if (!pr) {
  if (process.env.SESSION_LOG_DRY_RUN) console.log(upsertTable(null));
  process.exit(0);
}

// ---- upsert the PR comment ----
const repoInfo = gh("repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner");
const nameWithOwner = repoInfo.stdout.trim();
const comments = gh(
  "api",
  `repos/${nameWithOwner}/issues/${pr}/comments`,
  "--jq",
  `[.[] | select(.body | startswith("${MARKER}"))][0] | {id, body}`,
);
const existing = comments.stdout.trim() ? JSON.parse(comments.stdout) : null;

const body = upsertTable(existing?.body ?? null);

if (process.env.SESSION_LOG_DRY_RUN) {
  console.log(body);
  process.exit(0);
}

if (existing?.id) {
  gh("api", "-X", "PATCH", `repos/${nameWithOwner}/issues/comments/${existing.id}`, "-f", `body=${body}`);
} else {
  gh("pr", "comment", String(pr), "--body", body);
}
