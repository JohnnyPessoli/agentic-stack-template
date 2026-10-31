import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  BLOCK_BEGIN,
  BLOCK_END,
  blockHash,
  findBlock,
  instructionBlock,
  instructionFiles,
  planInstructionFile,
} from "../lib/instructions.mjs";
import { runSetup, VERSION } from "../lib/setup.mjs";
import { readRegistry, writeRegistry } from "../lib/registry.mjs";

function temporaryDirectory(t) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "agentic-stack-instructions-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

const DIRECTORY_LINK = process.platform === "win32" ? "junction" : "dir";
const block = instructionBlock({ alethe: true });

test("maps tools to AGENTS.md and CLAUDE.md without duplicates", () => {
  assert.deepEqual(instructionFiles(["codex", "cursor", "github-copilot"]), ["AGENTS.md"]);
  assert.deepEqual(instructionFiles(["claude-code"]), ["CLAUDE.md"]);
  assert.deepEqual(instructionFiles(["claude-code", "antigravity-cli"]), ["AGENTS.md", "CLAUDE.md"]);
});

test("omits the Alethe line when Alethe is skipped", () => {
  assert.match(block, /skill `alethe`/);
  assert.doesNotMatch(instructionBlock({ alethe: false }), /alethe`/);
  assert.match(instructionBlock({ alethe: false }), /bmad-agent-tdd/);
});

test("creates a missing file and appends to an existing one without touching its content", () => {
  assert.deepEqual(planInstructionFile({ existing: undefined, block }), { action: "create", text: `${block}\n` });

  const own = "# Projeto\n\nRegras da equipe.\n";
  const appended = planInstructionFile({ existing: own, block });
  assert.equal(appended.action, "append");
  assert.ok(appended.text.startsWith(own));
  assert.equal(appended.text, `${own}\n${block}\n`);

  const noFinalNewline = planInstructionFile({ existing: "# Projeto", block });
  assert.equal(noFinalNewline.text, `# Projeto\n\n${block}\n`);
});

test("preserves CRLF line endings and ignores EOL conversion of the block", () => {
  const own = "# Projeto\r\nRegras.\r\n";
  const appended = planInstructionFile({ existing: own, block });
  assert.ok(appended.text.startsWith(own));
  assert.equal(appended.text.replace(/\r\n/g, "").includes("\n"), false);

  const again = planInstructionFile({ existing: appended.text, block, recordedHash: blockHash(block) });
  assert.equal(again.action, "unchanged");
});

test("updates an untouched block, preserves an edited one, and forces only the block", () => {
  const oldBlock = `${BLOCK_BEGIN}\nregra antiga\n${BLOCK_END}`;
  const existing = `antes\n\n${oldBlock}\n\ndepois\n`;
  const expected = `antes\n\n${block}\n\ndepois\n`;

  const untouched = planInstructionFile({ existing, block, recordedHash: blockHash(oldBlock) });
  assert.deepEqual(untouched, { action: "update", text: expected });

  const edited = planInstructionFile({ existing, block, recordedHash: blockHash("outra versão") });
  assert.deepEqual(edited, { action: "edited", sidecar: expected });

  const unregistered = planInstructionFile({ existing, block });
  assert.equal(unregistered.action, "edited");

  const forced = planInstructionFile({ existing, block, recordedHash: blockHash("outra versão"), force: true });
  assert.deepEqual(forced, { action: "update", text: expected });
});

test("does not re-add a block the person removed unless forced", () => {
  const existing = "# Projeto\n";
  assert.deepEqual(planInstructionFile({ existing, block, recordedHash: blockHash(block) }), { action: "removed" });
  assert.equal(planInstructionFile({ existing, block, recordedHash: blockHash(block), force: true }).action, "append");
});

test("refuses malformed markers even with --force", () => {
  for (const existing of [
    `${BLOCK_BEGIN}\nsem fim\n`,
    `${BLOCK_END}\n${BLOCK_BEGIN}\n`,
    `${block}\n${block}\n`,
  ]) {
    assert.equal(findBlock(existing).state, "malformed");
    assert.deepEqual(planInstructionFile({ existing, block, force: true }), { action: "malformed" });
  }
});

function bmadProject(directory) {
  const project = path.join(directory, "project");
  mkdirSync(path.join(project, "_bmad", "_config"), { recursive: true });
  writeFileSync(path.join(project, "_bmad", "_config", "manifest.yaml"), "installation:\n  version: 6.12.4\n");
  return project;
}

function setupRunner(project, directory) {
  const output = [];
  const run = (...args) =>
    runSetup(["--target", project, "--tools", "claude-code,codex", "--skip-alethe", ...args], {
      out: (message) => output.push(message),
      error: (message) => output.push(message),
      env: { PATH: "" },
      home: directory,
      askYesNo: async () => false,
    });
  return { run, output };
}

test("setup writes the managed block, is idempotent, and respects edits and removal", async (t) => {
  const directory = temporaryDirectory(t);
  const project = bmadProject(directory);
  const agents = path.join(project, "AGENTS.md");
  const claude = path.join(project, "CLAUDE.md");
  writeFileSync(agents, "# Regras da equipe\n");
  const { run, output } = setupRunner(project, directory);
  const skipBlock = instructionBlock({ alethe: false });

  assert.equal(await run(), 0);
  assert.equal(readFileSync(agents, "utf8"), `# Regras da equipe\n\n${skipBlock}\n`);
  assert.equal(readFileSync(claude, "utf8"), `${skipBlock}\n`);
  assert.equal(readRegistry(project).files["AGENTS.md#agentic-stack"], blockHash(skipBlock));
  assert.ok(output.some((line) => line.includes("Instruções de projeto: AGENTS.md bloco acrescentado; CLAUDE.md criado")));

  const before = readFileSync(agents, "utf8");
  assert.equal(await run(), 0);
  assert.equal(readFileSync(agents, "utf8"), before);

  const edited = before.replace("Não invoque personas", "Invoque o arquiteto antes de codar. Não invoque personas");
  writeFileSync(agents, edited);
  assert.equal(await run(), 0);
  assert.equal(readFileSync(agents, "utf8"), edited);
  assert.equal(readFileSync(`${agents}.new`, "utf8"), before);

  writeFileSync(agents, before);
  assert.equal(await run(), 0);
  assert.equal(existsSync(`${agents}.new`), false);

  writeFileSync(claude, "# Só minhas regras\n");
  assert.equal(await run(), 0);
  assert.equal(readFileSync(claude, "utf8"), "# Só minhas regras\n");
  assert.equal(await run("--force"), 0);
  assert.equal(readFileSync(claude, "utf8"), `# Só minhas regras\n\n${skipBlock}\n`);
});

test("setup skips instructions on request and plans them in dry-run without writing", async (t) => {
  const directory = temporaryDirectory(t);
  const project = bmadProject(directory);
  const { run, output } = setupRunner(project, directory);

  assert.equal(await run("--dry-run"), 0);
  assert.ok(output.some((line) => line.startsWith("Previsto — Instruções de projeto") && line.includes("será criado")));
  assert.equal(existsSync(path.join(project, "AGENTS.md")), false);

  assert.equal(await run("--skip-agent-instructions"), 0);
  assert.equal(existsSync(path.join(project, "AGENTS.md")), false);
  assert.equal(existsSync(path.join(project, "CLAUDE.md")), false);
});

test("updating a project configured with 1.1.0 announces the upgrade and adds the block", async (t) => {
  const directory = temporaryDirectory(t);
  const project = bmadProject(directory);
  const agents = path.join(project, "AGENTS.md");
  writeFileSync(agents, "# Regras existentes\n");
  writeRegistry(project, { templateVersion: "1.1.0", files: {} });
  const { run, output } = setupRunner(project, directory);

  assert.equal(await run("--dry-run"), 0);
  assert.ok(output.some((line) => line.includes(`Atualização 1.1.0 → ${VERSION}`)));
  assert.equal(readFileSync(agents, "utf8"), "# Regras existentes\n");

  assert.equal(await run(), 0);
  assert.ok(readFileSync(agents, "utf8").startsWith("# Regras existentes\n\n<!-- agentic-stack:begin"));
  assert.equal(readRegistry(project).templateVersion, VERSION);
});

test("setup refuses an instructions link that leaves the project", async (t) => {
  const directory = temporaryDirectory(t);
  const project = bmadProject(directory);
  const outside = path.join(directory, "outside");
  mkdirSync(outside);
  symlinkSync(outside, path.join(project, "AGENTS.md"), DIRECTORY_LINK);
  const { run, output } = setupRunner(project, directory);

  assert.equal(await run(), 1);
  assert.deepEqual(readdirSync(outside), []);
  assert.ok(output.some((line) => line.includes("AGENTS.md") && line.includes("não alterado por segurança")));
});
