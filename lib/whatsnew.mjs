// `dev-workflow whatsnew` — what changed since this project was set up.
//
// The seeded tier buys project ownership at a price: a consumer never receives
// improvements to a file they own. Sharpen the CLAUDE.md stub in 3.2 and every
// existing project keeps the 3.0 one, silently, forever.
//
// This command is the antidote. It never writes anything — it reports what is
// new, what would change, and (the interesting part) which stubs the consumer
// owns have since improved upstream. Deciding what to adopt is a judgement call
// about someone's own project, so it belongs to them or to an agent they ask,
// not to a package that cannot see their reasons.
//
// `--json` exists for exactly that hand-off: an agent can read the structured
// form and propose a merge, rather than a human diffing seven files by eye.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { MANAGED, packageFingerprint, SEEDED } from "./sync.mjs";

const LOCK_NAME = "dev-workflow-lock.json";

const dim = (s) => `\x1b[90m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

const sha256 = (buf) => `sha256:${createHash("sha256").update(buf).digest("hex")}`;

/**
 * Simplified semver ordering: numeric parts compare numerically, and any
 * prerelease sorts before the release it precedes (3.0.0-beta.0 < 3.0.0).
 * Deliberately not a dependency — this package ships zero, and the only
 * question asked here is "is A older than B".
 */
const parseVersion = (v) => {
  const [core, pre] = String(v).split("-");
  return { nums: core.split(".").map((n) => Number.parseInt(n, 10) || 0), pre };
};

export function isOlder(a, b) {
  if (!a) return true;
  if (a === b) return false;
  const A = parseVersion(a);
  const B = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if ((A.nums[i] ?? 0) !== (B.nums[i] ?? 0)) return (A.nums[i] ?? 0) < (B.nums[i] ?? 0);
  }
  if (A.pre && !B.pre) return true; // 3.0.0-beta.0 < 3.0.0
  if (!A.pre && B.pre) return false;
  return (A.pre ?? "") < (B.pre ?? "");
}

/** CHANGELOG entries newer than `since`, as `{ version, lines }`. */
export function changelogSince(text, since) {
  const out = [];
  let current = null;
  for (const line of text.split("\n")) {
    const heading = line.match(/^##\s+\[?v?([0-9][^\]\s]*)\]?/);
    if (heading) {
      if (current) out.push(current);
      current = { version: heading[1], lines: [] };
      continue;
    }
    if (current && line.trim()) current.lines.push(line);
  }
  if (current) out.push(current);
  return out.filter((e) => isOlder(since, e.version));
}

export function runWhatsnew({ cwd = process.cwd(), pkgRoot, packageVersion, json = false } = {}) {
  const lockPath = join(cwd, LOCK_NAME);
  if (!existsSync(lockPath)) {
    console.error("No dev-workflow-lock.json here — run `dev-workflow sync` first.");
    return 1;
  }

  let lock;
  try {
    lock = JSON.parse(readFileSync(lockPath, "utf8"));
  } catch {
    console.error(`${LOCK_NAME} is not valid JSON.`);
    return 1;
  }

  const installed = lock.packageVersion;
  const report = {
    installed,
    current: packageVersion,
    newFiles: [],
    managedChanged: [],
    stubsChanged: [],
    orphans: [],
    changelog: [],
  };

  for (const [from, to] of MANAGED) {
    const dest = resolve(cwd, to);
    const srcHash = sha256(readFileSync(resolve(pkgRoot, from)));
    if (!existsSync(dest)) {
      report.newFiles.push({ path: to, tier: "managed" });
    } else if (sha256(readFileSync(dest)) !== srcHash) {
      report.managedChanged.push({ path: to });
    }
  }

  for (const [from, to] of SEEDED) {
    const dest = resolve(cwd, to);
    if (!existsSync(dest)) {
      report.newFiles.push({ path: to, tier: "seeded" });
      continue;
    }
    // The consumer's file is theirs and is never compared. What IS comparable is
    // the stub they started from: if it has changed upstream, there may be
    // something worth folding in by hand.
    const seededAt = lock.seeded?.[to]?.sourceHash;
    const srcHash = sha256(readFileSync(resolve(pkgRoot, from)));
    if (seededAt && seededAt !== srcHash) {
      report.stubsChanged.push({
        path: to,
        seededAtVersion: lock.seeded[to].packageVersion ?? installed,
      });
    }
  }

  // Orphans: paths this project received as managed in an older version that the
  // package no longer ships there. Moving a file upstream (a template that became
  // a skill) leaves a stale copy behind, and nothing else would ever mention it —
  // the same invisibility this command exists to fix. Reported, never deleted:
  // removing files from someone's repo is not a package's call.
  const currentManaged = new Set(MANAGED.map(([, to]) => to));
  const everOurs = new Set([
    ...Object.keys(lock.managed ?? {}),
    ...Object.keys(lock.retired ?? {}),
  ]);
  report.orphans = [...everOurs]
    .filter((p) => !currentManaged.has(p) && existsSync(resolve(cwd, p)))
    .map((path) => ({ path }));

  const changelogPath = join(pkgRoot, "CHANGELOG.md");
  if (existsSync(changelogPath)) {
    report.changelog = changelogSince(readFileSync(changelogPath, "utf8"), installed);
  }

  // Behaviour changed without the version moving — the linked-development case.
  // Files are verified by hash, but a rewritten checker leaves no trace in this
  // repo, so without this the report would confidently say "up to date" about a
  // tool that had been rebuilt underneath it.
  const fingerprint = packageFingerprint(pkgRoot);
  report.packageRebuilt =
    installed === packageVersion &&
    Boolean(lock.packageFingerprint) &&
    lock.packageFingerprint !== fingerprint;

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }

  console.log(bold("\n── dev-workflow whatsnew ───────────────────────\n"));
  console.log(
    `${dim("installed")}  ${installed ?? "unknown"}    ${dim("current")}  ${packageVersion}\n`,
  );

  if (report.changelog.length) {
    console.log(bold("changes"));
    for (const entry of report.changelog) {
      console.log(`  ${cyan(entry.version)}`);
      for (const l of entry.lines) console.log(`    ${l}`);
    }
    console.log();
  }

  if (report.newFiles.length) {
    console.log(bold("new files"));
    for (const f of report.newFiles) {
      console.log(`  ${green("+")} ${f.path} ${dim(`(${f.tier})`)}`);
    }
    console.log(dim("\n  `dev-workflow sync` writes these.\n"));
  }

  if (report.managedChanged.length) {
    console.log(bold("managed — will update automatically"));
    for (const f of report.managedChanged) console.log(`  ${yellow("~")} ${f.path}`);
    console.log(
      dim("\n  `dev-workflow sync` applies these; your local edits are reported as drift.\n"),
    );
  }

  if (report.stubsChanged.length) {
    console.log(bold("stubs improved upstream — yours, so nothing is applied"));
    for (const f of report.stubsChanged) {
      console.log(`  ${yellow("≠")} ${f.path} ${dim(`(seeded at ${f.seededAtVersion})`)}`);
    }
    console.log(
      dim(
        "\n  These files are yours and will never be overwritten. To see what changed, compare\n" +
          "  against the current stub in the package, or hand this to an agent:\n\n" +
          "    dev-workflow whatsnew --json\n",
      ),
    );
  }

  if (report.orphans.length) {
    console.log(bold("orphans — the package no longer ships these here"));
    for (const f of report.orphans) console.log(`  ${yellow("×")} ${f.path}`);
    console.log(
      dim(
        "\n  Usually a file that moved upstream. Safe to delete once you have checked\n  nothing local points at it — the package will not remove files from your repo.\n",
      ),
    );
  }

  if (report.packageRebuilt) {
    console.log(bold("package rebuilt at the same version"));
    console.log(
      `  ${yellow("!")} the tool's own code changed since this project synced, but the version did not move`,
    );
    console.log(
      dim(
        "\n  Normal for a linked or development install. Files above are still verified by\n" +
          "  hash — this only means BEHAVIOUR may differ from what you set up against.\n" +
          "  `dev-workflow sync` re-stamps the fingerprint.\n",
      ),
    );
  }

  const nothing =
    !report.changelog.length &&
    !report.newFiles.length &&
    !report.managedChanged.length &&
    !report.stubsChanged.length &&
    !report.orphans.length &&
    !report.packageRebuilt;
  // "Nothing to report" and "the tool did nothing" look identical from outside,
  // and a command whose whole job is detecting change must prove it looked —
  // otherwise silence reads as breakage, which is how a false green earns trust
  // it has not deserved.
  if (nothing) {
    console.log(green("✓ up to date"));
    console.log(
      dim(
        `  verified ${MANAGED.length} managed file(s) by content hash · ${SEEDED.length} seeded stub(s) by provenance\n` +
          `  package fingerprint matched (${fingerprint.slice(7, 19)}…) · no orphans · no changelog entries since ${installed ?? "unknown"}\n`,
      ),
    );
  }
  return 0;
}
