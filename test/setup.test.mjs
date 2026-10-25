import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ALETHE_COMMIT,
  ALLOWED_TOOLS,
  buildBmadArgs,
  copyTreeSafe,
  detectTools,
  inspectBmadInstallation,
  parseArgs,
  parseTools,
  resolveTarget,
  runSetup,
  templateRoot,
} from "../lib/setup.mjs";

function temporaryDirectory(t) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "agentic-stack-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("parses the explicit update option and tool allowlist", () => {
  const parsed = parseArgs([
    "--target",
    "sample project",
    "--tools",
    "codex,github-copilot,codex",
    "--update-bmad",
    "--dry-run",
  ]);
  assert.equal(parsed.target, "sample project");
  assert.deepEqual(parsed.tools, ["codex", "github-copilot"]);
  assert.equal(parsed.updateBmad, true);
  assert.equal(parsed.dryRun, true);
});

test("rejects unknown tools, unknown options, and incompatible Alethe flags", () => {
  assert.throws(() => parseTools("codex,not-a-tool"), /não suportada/);
  assert.throws(() => parseArgs(["--unknown"]), /Opção desconhecida/);
  assert.throws(
    () => parseArgs(["--skip-alethe", "--enable-alethe-everywhere"]),
    /incompatíveis/,
  );
  assert.deepEqual(ALLOWED_TOOLS, [
    "antigravity-cli",
    "claude-code",
    "codex",
    "cursor",
    "github-copilot",
  ]);
});

test("rejects a filesystem root but resolves normal paths containing spaces", (t) => {
  const directory = temporaryDirectory(t);
  const project = path.join(directory, "repo with spaces & punctuation");
  mkdirSync(project);
  assert.equal(resolveTarget(project), realpathSync(project));
  assert.throws(() => resolveTarget(path.parse(directory).root), /raiz/);
});

test("detects only tools with project, user, or executable evidence", (t) => {
  const directory = temporaryDirectory(t);
  const project = path.join(directory, "project");
  const home = path.join(directory, "home");
  const commands = path.join(directory, "commands");
  mkdirSync(project);
  mkdirSync(home);
  mkdirSync(commands);
  writeFileSync(path.join(commands, "codex.exe"), "");
  mkdirSync(path.join(project, ".cursor"));
  mkdirSync(path.join(project, ".github", "agents"), { recursive: true });

  assert.deepEqual(
    detectTools(project, home, { PATH: commands }),
    ["codex", "cursor", "github-copilot"],
  );
});

test("BMAD updates do not pass module or tool overrides", () => {
  const updateArgs = buildBmadArgs({
    target: "C:\\project",
    tools: ["codex"],
    update: true,
  });
  assert.ok(updateArgs.includes("--action"));
  assert.ok(updateArgs.includes("update"));
  assert.ok(updateArgs.includes("bmad-method"));
  assert.ok(!updateArgs.includes("--tools"));
  assert.ok(!updateArgs.includes("--modules"));
  assert.ok(updateArgs.includes("bmad-method@6.12.4"));

  const freshArgs = buildBmadArgs({
    target: "C:\\project",
    tools: ["codex", "cursor"],
    update: false,
  });
  assert.ok(freshArgs.includes("--modules"));
  assert.ok(freshArgs.includes("bmm"));
  assert.ok(freshArgs.includes("codex,cursor"));
  assert.ok(freshArgs.includes("Portuguese"));
});

test("reads BMAD version, modules, and IDEs from its generated manifest", (t) => {
  const directory = temporaryDirectory(t);
  const config = path.join(directory, "_bmad", "_config");
  mkdirSync(config, { recursive: true });
  writeFileSync(
    path.join(config, "manifest.yaml"),
    [
      "installation:",
      "  version: 6.12.4",
      "modules:",
      "  - name: core",
      "    version: 6.12.4",
      "  - name: bmm",
      "    version: 6.12.4",
      "ides:",
      "  - codex",
      "  - cursor",
      "",
    ].join("\n"),
  );
  assert.deepEqual(inspectBmadInstallation(directory), {
    version: "6.12.4",
    modules: ["core", "bmm"],
    tools: ["codex", "cursor"],
  });
});

test("safe copy preserves conflicts unless force is explicit", (t) => {
  const directory = temporaryDirectory(t);
  const source = path.join(directory, "source");
  const project = path.join(directory, "project");
  const destination = path.join(project, ".agents", "skills", "example");
  mkdirSync(source);
  mkdirSync(destination, { recursive: true });
  writeFileSync(path.join(source, "SKILL.md"), "new");
  writeFileSync(path.join(destination, "SKILL.md"), "user version");

  const preserved = copyTreeSafe(source, destination, { root: project });
  assert.equal(readFileSync(path.join(destination, "SKILL.md"), "utf8"), "user version");
  assert.equal(preserved.conflicts.length, 1);

  const replaced = copyTreeSafe(source, destination, { force: true, root: project });
  assert.equal(readFileSync(path.join(destination, "SKILL.md"), "utf8"), "new");
  assert.equal(replaced.copied.length, 1);
});

test("safe copy can plan and create a standalone file under an allowed root", (t) => {
  const directory = temporaryDirectory(t);
  const source = path.join(directory, "source.txt");
  const root = path.join(directory, "home");
  const destination = path.join(root, ".agentic-stack-template", "package.json");
  mkdirSync(root);
  writeFileSync(source, '{"name":"agentic-stack-template"}');

  const result = copyTreeSafe(source, destination, { root });
  assert.equal(result.unsafe.length, 0);
  assert.equal(readFileSync(destination, "utf8"), '{"name":"agentic-stack-template"}');
});

test(
  "safe copy preserves executable mode for shell wrappers",
  { skip: process.platform === "win32" },
  (t) => {
    const directory = temporaryDirectory(t);
    const source = path.join(directory, "setup-agentic-stack");
    const destinationRoot = path.join(directory, "home");
    const destination = path.join(destinationRoot, "bin", "setup-agentic-stack");
    mkdirSync(path.join(destinationRoot, "bin"), { recursive: true });
    writeFileSync(source, "#!/bin/sh\nexit 0\n");
    chmodSync(source, 0o755);

    copyTreeSafe(source, destination, { root: destinationRoot });
    assert.equal((statSync(destination).mode & 0o111) !== 0, true);
  },
);

test("dry-run copy reports planned files without creating directories", (t) => {
  const directory = temporaryDirectory(t);
  const source = path.join(directory, "source");
  const project = path.join(directory, "project");
  const destination = path.join(project, ".agents", "skills", "example");
  mkdirSync(source);
  mkdirSync(project);
  writeFileSync(path.join(source, "SKILL.md"), "content");

  const result = copyTreeSafe(source, destination, { dryRun: true, root: project });
  assert.equal(result.copied.length, 1);
  assert.equal(existsSync(destination), false);
});

test("safe copy does not follow a symbolic link out of the project", { skip: process.platform === "win32" }, (t) => {
  const directory = temporaryDirectory(t);
  const source = path.join(directory, "source");
  const project = path.join(directory, "project");
  const outside = path.join(directory, "outside");
  mkdirSync(source);
  mkdirSync(project);
  mkdirSync(outside);
  writeFileSync(path.join(source, "SKILL.md"), "content");
  symlinkSync(outside, path.join(project, "linked"), "dir");

  const result = copyTreeSafe(source, path.join(project, "linked", "skill"), { root: project });
  assert.equal(result.unsafe.length, 1);
  assert.deepEqual(readdirSync(outside), []);
});

test("dry-run setup does not write or invoke external installers", async (t) => {
  const directory = temporaryDirectory(t);
  const project = path.join(directory, "project");
  mkdirSync(project);
  const output = [];
  const status = await runSetup(
    ["--target", project, "--tools", "codex", "--dry-run", "--skip-alethe"],
    {
      out: (message) => output.push(message),
      error: (message) => output.push(message),
      cwd: directory,
      env: { PATH: "" },
    },
  );
  assert.equal(status, 0);
  assert.ok(output.some((line) => line.includes("dry-run")));
  assert.equal(existsSync(path.join(project, "_bmad")), false);
});

test("global installer dry-run does not create files in the selected home", (t) => {
  const directory = temporaryDirectory(t);
  const home = path.join(directory, "home");
  mkdirSync(home);
  const result = spawnSync(
    process.execPath,
    [path.join(templateRoot(), "..", "scripts", "install.mjs"), "--dry-run"],
    {
      encoding: "utf8",
      env: { ...process.env, HOME: home, USERPROFILE: home },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(home), []);
});

test("source contains a pinned Alethe revision without vendoring its files", () => {
  assert.match(ALETHE_COMMIT, /^[a-f0-9]{40}$/);
  assert.equal(
    readFileSync(path.join(templateRoot(), "skills", "bmad-agent-tdd", "SKILL.md"), "utf8").includes("Vendox"),
    false,
  );
  assert.equal(existsSync(path.join(templateRoot(), "custom", "config.user.toml")), false);
  assert.equal(existsSync(path.join(templateRoot(), "skills", "alethe")), false);
});
