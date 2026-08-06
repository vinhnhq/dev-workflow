---
id: <prefix>-doc-security-and-data
kind: doc
title: Security & data handling
description: What data is regulated here, what must never be logged, and who can rotate what.
status: active
updated: YYYY-MM-DD
---

# Security & data handling

<!--
SEEDED by @vinhnnn/dev-workflow — yours to own. `sync` never overwrites this file.

WHY IT EXISTS, and why the doc alone is not enough: the moment these rules matter is while someone
is adding a log line or a new column — and nothing prompts them to consult a policy first. Being
wrong is SILENT: no crash, no failing test, just a document URL in a log that is now in a retention
system for a year.

So this file is one third of the mechanism (see docs/project-doc-standard.md §4):
  1. CLAUDE.md carries the trigger  — one line saying regulated data exists here
  2. this doc carries the reference — classification, retention, rotation
  3. a lint or hook carries the enforcement — the part that must not depend on anyone reading

If a rule here is important enough to write down, ask whether it is important enough to enforce.
-->

## Data classes

| Class                                 | Examples | Where it may live | Never                                          |
| ------------------------------------- | -------- | ----------------- | ---------------------------------------------- |
| **Regulated** — identity, financial   |          |                   | logs · analytics · error reports · LLM prompts |
| **Personal** — names, emails, avatars |          |                   |                                                |
| **Operational** — ids, timestamps     |          |                   |                                                |
| **Public**                            |          |                   |                                                |

## Logging rules

The rules that are **enforced**, and by what. A rule listed here without an enforcement mechanism is
a rule that will be broken by someone who never read this file.

| Rule                                      | Enforced by                  |
| ----------------------------------------- | ---------------------------- |
| Never log values from the regulated class | _(lint rule — name it here)_ |
|                                           |                              |

## Regulated paths

Areas where the rules above apply most sharply. These are the paths worth attaching an **advice hook**
to, so the reminder fires when someone edits them rather than when someone reads this file.

- `src/…`

## Secrets

Where each lives, who can rotate it, and what breaks during rotation. **Never the values themselves,
and never an example that looks like a real one.**

| Secret | Lives in | Who rotates | Rotating it breaks |
| ------ | -------- | ----------- | ------------------ |
|        |          |             |                    |

## Retention & deletion

How long each class is kept, what deletes it, and whether deletion is real or a soft flag. Answer
honestly — "nothing deletes this yet" is useful; an aspirational policy is not.

## Third parties

Every service that receives project data, what it receives, and under what agreement. **Model
providers count** — a prompt containing a customer record is a data transfer.

| Service | Receives | Notes |
| ------- | -------- | ----- |
|         |          |       |
