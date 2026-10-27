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
  createProjectLock,
  detectTools,
  findRepositoryRoot,
  findUv,
  inspectBmadInstallation,
  missingBmadTools,
  parseArgs,
  parseTools,
  projectLockPath,
  resolveTarget,
  runSetup,
  templateRoot,
} from "../lib/setup.mjs";
import { hashBytes, readRegistry, registryPath, writeRegistry } from "../lib/registry.mjs";

function temporaryDirectory(t) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "agentic-stack-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

// Junctions não exigem privilégio de administrador no Windows.
const DIRECTORY_LINK = process.platform === "win32" ? "junction" : "dir";

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

function templatePair(t) {
  const directory = temporaryDirectory(t);
  const source = path.join(directory, "source");
  const project = path.join(directory, "project");
  const destination = path.join(project, ".agents", "skills", "example");
  mkdirSync(source);
  mkdirSync(destination, { recursive: true });
  writeFileSync(path.join(source, "a.md"), "v2 a");
  writeFileSync(path.join(source, "b.md"), "v2 b");
  writeFileSync(path.join(destination, "a.md"), "v1 a");
  writeFileSync(path.join(destination, "b.md"), "user edit");
  const installed = {
    [path.join(destination, "a.md")]: hashBytes(Buffer.from("v1 a")),
    [path.join(destination, "b.md")]: hashBytes(Buffer.from("v1 b")),
  };
  return { source, project, destination, installedHash: (file) => installed[file] };
}

test("template copy upgrades untouched files and keeps edited ones with a .new copy", (t) => {
  const { source, project, destination, installedHash } = templatePair(t);
  const result = copyTreeSafe(source, destination, { root: project, installedHash, sidecar: true });
  assert.deepEqual(result.upgraded, [path.join(destination, "a.md")]);
  assert.deepEqual(result.conflicts, [path.join(destination, "b.md")]);
  assert.equal(readFileSync(path.join(destination, "a.md"), "utf8"), "v2 a");
  assert.equal(readFileSync(path.join(destination, "b.md"), "utf8"), "user edit");
  assert.equal(readFileSync(path.join(destination, "b.md.new"), "utf8"), "v2 b");
});

test("atomic template copy never leaves a component with mixed versions", (t) => {
  const { source, project, destination, installedHash } = templatePair(t);
  const result = copyTreeSafe(source, destination, { root: project, installedHash, sidecar: true, atomic: true });
  assert.equal(result.blocked, true);
  assert.equal(readFileSync(path.join(destination, "a.md"), "utf8"), "v1 a");
  assert.equal(readFileSync(path.join(destination, "b.md.new"), "utf8"), "v2 b");

  writeFileSync(path.join(destination, "b.md"), readFileSync(path.join(destination, "b.md.new")));
  const resolved = copyTreeSafe(source, destination, { root: project, installedHash, sidecar: true, atomic: true });
  assert.equal(resolved.blocked, false);
  assert.equal(readFileSync(path.join(destination, "a.md"), "utf8"), "v2 a");
  assert.equal(existsSync(path.join(destination, "b.md.new")), false);
});

test("registry round-trip keeps valid entries and rejects unsafe ones", (t) => {
  const project = temporaryDirectory(t);
  assert.equal(writeRegistry(project, { templateVersion: "1.1.0", files: {} }), false);
  mkdirSync(path.join(project, "_bmad", "_config"), { recursive: true });
  const hash = hashBytes(Buffer.from("x"));
  assert.equal(
    writeRegistry(project, {
      templateVersion: "1.1.0",
      aletheCommit: ALETHE_COMMIT,
      files: { "_bmad/custom/z.toml": hash, "../outside": hash, "_bmad/custom/a.toml": "not-a-hash" },
    }),
    true,
  );
  const registry = readRegistry(project);
  assert.equal(registry.valid, true);
  assert.equal(registry.templateVersion, "1.1.0");
  assert.deepEqual(registry.files, { "_bmad/custom/z.toml": hash });

  writeFileSync(registryPath(project), "{ broken");
  assert.equal(readRegistry(project).valid, false);
  assert.deepEqual(readRegistry(project).files, {});
});

test("re-running setup over an older install updates untouched files and preserves edits", async (t) => {
  const directory = temporaryDirectory(t);
  const project = path.join(directory, "project");
  mkdirSync(path.join(project, "_bmad", "_config"), { recursive: true });
  writeFileSync(path.join(project, "_bmad", "_config", "manifest.yaml"), "installation:\n  version: 6.12.4\nides:\n  - codex\n");
  const output = [];
  const setup = () =>
    runSetup(["--target", project, "--tools", "codex", "--skip-alethe"], {
      out: (message) => output.push(message),
      error: (message) => output.push(message),
      env: { PATH: "" },
      home: directory,
      askYesNo: async () => false,
    });
  const custom = path.join(project, "_bmad", "custom");
  const kent = path.join(project, ".agents", "skills", "bmad-agent-tdd");
  const template = (...segments) => readFileSync(path.join(templateRoot(), ...segments), "utf8");
  const key = (...segments) => path.relative(project, path.join(...segments)).split(path.sep).join("/");

  assert.equal(await setup(), 0);
  const firstRegistry = readRegistry(project);
  assert.equal(firstRegistry.templateVersion, "1.1.0");
  assert.ok(firstRegistry.files[key(kent, "SKILL.md")]);

  // Simula uma instalação de versão anterior: um arquivo intacto, outros editados
  // e um arquivo que deixou de existir no template.
  const files = { ...firstRegistry.files };
  const old = (file, content) => {
    writeFileSync(file, content);
    files[key(file)] = hashBytes(Buffer.from(content));
  };
  old(path.join(custom, "bmad-agent-dev.toml"), "old dev");
  writeFileSync(path.join(custom, "bmad-agent-pm.toml"), "team edit");
  old(path.join(kent, "customize.toml"), "old kent");
  writeFileSync(path.join(kent, "SKILL.md"), "edited kent");
  old(path.join(kent, "old-notes.md"), "obsolete");
  writeRegistry(project, { templateVersion: "1.0.0", files });

  output.length = 0;
  assert.equal(await setup(), 0);
  assert.ok(output.some((line) => line.includes("template 1.0.0; aplicando a versão 1.1.0")));
  assert.equal(readFileSync(path.join(custom, "bmad-agent-dev.toml"), "utf8"), template("custom", "bmad-agent-dev.toml"));
  assert.equal(readFileSync(path.join(custom, "bmad-agent-pm.toml"), "utf8"), "team edit");
  assert.equal(readFileSync(path.join(custom, "bmad-agent-pm.toml.new"), "utf8"), template("custom", "bmad-agent-pm.toml"));
  assert.equal(readFileSync(path.join(kent, "customize.toml"), "utf8"), "old kent");
  assert.ok(existsSync(path.join(kent, "SKILL.md.new")));
  assert.ok(existsSync(path.join(kent, "old-notes.md")));
  assert.ok(output.some((line) => line.includes("não fazem mais parte") && line.includes("old-notes.md")));

  writeFileSync(path.join(kent, "SKILL.md"), readFileSync(path.join(kent, "SKILL.md.new")));
  assert.equal(await setup(), 0);
  assert.equal(readFileSync(path.join(kent, "customize.toml"), "utf8"), template("skills", "bmad-agent-tdd", "customize.toml"));
  assert.equal(existsSync(path.join(kent, "SKILL.md.new")), false);
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

test("safe copy does not follow a symbolic link out of the project", (t) => {
  const directory = temporaryDirectory(t);
  const source = path.join(directory, "source");
  const project = path.join(directory, "project");
  const outside = path.join(directory, "outside");
  mkdirSync(source);
  mkdirSync(project);
  mkdirSync(outside);
  writeFileSync(path.join(source, "SKILL.md"), "content");
  symlinkSync(outside, path.join(project, "linked"), DIRECTORY_LINK);

  const result = copyTreeSafe(source, path.join(project, "linked", "skill"), { root: project });
  assert.equal(result.unsafe.length, 1);
  assert.deepEqual(readdirSync(outside), []);
});

test("safe copy accepts a skills link that stays inside the project", (t) => {
  const directory = temporaryDirectory(t);
  const source = path.join(directory, "source");
  const project = path.join(directory, "project");
  const sharedSkills = path.join(project, ".agents", "skills");
  mkdirSync(source);
  mkdirSync(sharedSkills, { recursive: true });
  mkdirSync(path.join(project, ".claude"));
  writeFileSync(path.join(source, "SKILL.md"), "content");
  symlinkSync(sharedSkills, path.join(project, ".claude", "skills"), DIRECTORY_LINK);

  const result = copyTreeSafe(source, path.join(project, ".claude", "skills", "kent"), { root: project });
  assert.deepEqual(result.unsafe, []);
  assert.equal(readFileSync(path.join(sharedSkills, "kent", "SKILL.md"), "utf8"), "content");
});

test("project lock blocks a live owner but reclaims a lock left by a dead process", (t) => {
  const directory = temporaryDirectory(t);
  const lockPath = projectLockPath(directory);
  t.after(() => rmSync(lockPath, { force: true }));

  const release = createProjectLock(directory);
  assert.throws(() => createProjectLock(directory), /Outra execução/);
  release();

  const finished = spawnSync(process.execPath, ["-e", ""]);
  writeFileSync(lockPath, `${finished.pid}\n`);
  const releaseReclaimed = createProjectLock(directory);
  assert.equal(readFileSync(lockPath, "utf8").trim(), String(process.pid));
  releaseReclaimed();
  assert.equal(existsSync(lockPath), false);
});

test("finds uv in the official install directory when PATH was not refreshed", (t) => {
  const directory = temporaryDirectory(t);
  const bin = path.join(directory, ".local", "bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(path.join(bin, process.platform === "win32" ? "uv.exe" : "uv"), "");

  assert.equal(findUv({ PATH: "" }, path.join(directory, "empty-home")), undefined);
  assert.deepEqual(findUv({ PATH: "" }, directory), {
    path: path.join(bin, process.platform === "win32" ? "uv.exe" : "uv"),
    onPath: false,
  });
  assert.equal(findUv({ PATH: bin }, directory).onPath, true);
});

test("reports BMAD tools missing from an existing installation", () => {
  const info = { version: "6.12.4", modules: ["bmm"], tools: ["claude-code"] };
  assert.deepEqual(missingBmadTools(info, ["claude-code", "codex"]), ["codex"]);
  assert.deepEqual(missingBmadTools({ ...info, tools: [] }, ["codex"]), []);
});

test("dry-run warns about a Git subdirectory and BMAD tools not yet integrated", async (t) => {
  const directory = temporaryDirectory(t);
  const repository = path.join(directory, "repo");
  const project = path.join(repository, "packages", "app");
  mkdirSync(path.join(repository, ".git"), { recursive: true });
  mkdirSync(path.join(project, "_bmad", "_config"), { recursive: true });
  writeFileSync(
    path.join(project, "_bmad", "_config", "manifest.yaml"),
    "installation:\n  version: 6.12.4\nides:\n  - claude-code\n",
  );
  assert.equal(findRepositoryRoot(realpathSync(project)), realpathSync(repository));

  const output = [];
  const status = await runSetup(["--target", project, "--tools", "codex", "--dry-run", "--skip-alethe"], {
    out: (message) => output.push(message),
    error: (message) => output.push(message),
    env: { PATH: "" },
    home: directory,
  });
  assert.equal(status, 0);
  assert.ok(output.some((line) => line.includes("não é a raiz")));
  assert.ok(output.some((line) => line.includes("não registra integração para: codex")));
  assert.ok(output.some((line) => line.startsWith("Pré-requisitos")));
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

function runGlobalInstaller(home, args = []) {
  return spawnSync(process.execPath, [path.join(templateRoot(), "..", "scripts", "install.mjs"), ...args], {
    encoding: "utf8",
    input: "",
    env: { ...process.env, HOME: home, USERPROFILE: home, SHELL: "" },
  });
}

test("global installer installs into an empty home and is idempotent", (t) => {
  const home = path.join(temporaryDirectory(t), "home");
  mkdirSync(home);
  const first = runGlobalInstaller(home);
  assert.equal(first.status, 0, first.stderr);
  assert.ok(existsSync(path.join(home, ".agentic-stack-template", "lib", "setup.mjs")));
  assert.ok(existsSync(path.join(home, ".local", "bin", "setup-agentic-stack")));
  const second = runGlobalInstaller(home);
  assert.equal(second.status, 0, second.stderr);
});

test("global installer writes nothing when an update has unreviewed conflicts", (t) => {
  const home = path.join(temporaryDirectory(t), "home");
  const installRoot = path.join(home, ".agentic-stack-template");
  mkdirSync(path.join(installRoot, "lib"), { recursive: true });
  writeFileSync(path.join(installRoot, "lib", "setup.mjs"), "old version");
  writeFileSync(path.join(installRoot, "package.json"), '{"name":"agentic-stack-template"}');

  const result = runGlobalInstaller(home);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /nenhum arquivo foi alterado/);
  assert.match(result.stderr, /instalação anterior/);
  assert.equal(existsSync(path.join(installRoot, "bin")), false);
  assert.equal(existsSync(path.join(home, ".local")), false);
  assert.equal(readFileSync(path.join(installRoot, "lib", "setup.mjs"), "utf8"), "old version");

  const forced = runGlobalInstaller(home, ["--force"]);
  assert.equal(forced.status, 0, forced.stderr);
  assert.notEqual(readFileSync(path.join(installRoot, "lib", "setup.mjs"), "utf8"), "old version");
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
