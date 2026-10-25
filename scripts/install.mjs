#!/usr/bin/env node

import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { copyTreeSafe } from "../lib/setup.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const home = os.homedir();
const installRoot = path.join(home, ".agentic-stack-template");
const binDirectory = path.join(home, ".local", "bin");
const managedDirectories = ["bin", "lib", "templates"];
const managedFiles = ["package.json"];

function parseOptions(argv) {
  const options = { force: false, dryRun: false, help: false };
  for (const value of argv) {
    if (value === "--force") options.force = true;
    else if (value === "--dry-run") options.dryRun = true;
    else if (value === "--help" || value === "-h") options.help = true;
    else throw new Error(`Opção desconhecida: ${value}`);
  }
  return options;
}

function quotePowerShell(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function command(commandName, args, options = {}) {
  return spawnSync(commandName, args, { ...options, windowsHide: true, stdio: "inherit" });
}

async function ask(question) {
  if (!process.stdin.isTTY) return false;
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await readline.question(`${question} [s/N] `)).trim().toLowerCase();
    return ["s", "sim", "y", "yes"].includes(answer);
  } finally {
    readline.close();
  }
}

function shellProfile() {
  const shell = path.basename(process.env.SHELL || "").toLowerCase();
  if (shell.includes("zsh")) return path.join(home, ".zshrc");
  if (shell.includes("bash")) return path.join(home, process.platform === "darwin" ? ".bash_profile" : ".bashrc");
  if (shell.includes("fish")) return path.join(home, ".config", "fish", "config.fish");
  return undefined;
}

function quoteShell(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function addPathEntry() {
  if (process.platform === "win32") {
    const script = [
      `$entry = ${quotePowerShell(binDirectory)}`,
      "$current = [Environment]::GetEnvironmentVariable('Path', 'User')",
      "$parts = @($current -split ';' | Where-Object { $_ })",
      "if (-not ($parts | Where-Object { $_.TrimEnd('\\') -ieq $entry.TrimEnd('\\') })) {",
      "  $next = (@($parts) + $entry) -join ';'",
      "  [Environment]::SetEnvironmentVariable('Path', $next, 'User')",
      "}",
    ].join("; ");
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    const result = command("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded]);
    if (result.status !== 0) throw new Error("Não foi possível adicionar ~/.local/bin ao PATH do usuário.");
    return;
  }

  const profile = shellProfile();
  if (!profile) throw new Error("Shell não reconhecido; configure ~/.local/bin manualmente.");
  const line =
    path.basename(profile) === "config.fish"
      ? `fish_add_path ${quoteShell(binDirectory)}`
      : `export PATH=${quoteShell(binDirectory)}:$PATH`;
  mkdirSync(path.dirname(profile), { recursive: true });
  const current = existsSync(profile) ? readFileSync(profile, "utf8") : "";
  if (!current.split(/\r?\n/).includes(line)) {
    writeFileSync(profile, `${current}${current.endsWith("\n") || current.length === 0 ? "" : "\n"}${line}\n`);
  }
}

function printManualPathInstructions() {
  if (process.platform === "win32") {
    process.stdout.write(`Adicione esta pasta ao PATH de usuário e reabra o terminal:\n  ${binDirectory}\n`);
    process.stdout.write(`No PowerShell: [Environment]::SetEnvironmentVariable('Path', \"$env:Path;${binDirectory}\", 'User')\n`);
    return;
  }
  const profile = shellProfile();
  const line =
    profile && path.basename(profile) === "config.fish"
      ? `fish_add_path ${quoteShell(binDirectory)}`
      : `export PATH=${quoteShell(binDirectory)}:$PATH`;
  process.stdout.write(`Adicione ao arquivo de inicialização do seu shell:\n  ${line}\n`);
}

function wrapperContents() {
  return {
    "setup-agentic-stack.cmd": [
    "@echo off",
    'node "%USERPROFILE%\\.agentic-stack-template\\bin\\setup-agentic-stack.mjs" %*',
    "exit /b %ERRORLEVEL%",
    "",
    ].join("\r\n"),
    "setup-agentic-stack.ps1": [
    "$script = Join-Path $HOME '.agentic-stack-template\\bin\\setup-agentic-stack.mjs'",
    "& node $script @args",
    "exit $LASTEXITCODE",
    "",
    ].join("\r\n"),
    "setup-agentic-stack": [
    "#!/bin/sh",
    'exec node "$HOME/.agentic-stack-template/bin/setup-agentic-stack.mjs" "$@"',
    "",
    ].join("\n"),
  };
}

function planGeneratedFiles(files, root, destinationDirectory) {
  const result = { copied: [], unchanged: [], conflicts: [], unsafe: [] };
  for (const [name, content] of Object.entries(files)) {
    const destination = path.join(destinationDirectory, name);
    const relative = path.relative(root, destination);
    if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      result.unsafe.push(destination);
      continue;
    }
    let current = root;
    let unsafe = false;
    for (const segment of relative.split(path.sep)) {
      current = path.join(current, segment);
      if (!existsSync(current)) continue;
      const info = lstatSync(current);
      if (info.isSymbolicLink() || (current !== destination && !info.isDirectory())) {
        result.unsafe.push(current);
        unsafe = true;
        break;
      }
    }
    if (unsafe) continue;
    if (!existsSync(destination)) {
      result.copied.push(destination);
      continue;
    }
    const info = lstatSync(destination);
    if (!info.isFile()) {
      result.unsafe.push(destination);
      continue;
    }
    if (readFileSync(destination, "utf8") === content) result.unchanged.push(destination);
    else result.conflicts.push(destination);
  }
  return result;
}

function writeWrappers(directory) {
  for (const [name, content] of Object.entries(wrapperContents())) {
    writeFileSync(path.join(directory, name), content, { mode: name === "setup-agentic-stack" ? 0o755 : 0o644 });
  }
}

function printHelp() {
  process.stdout.write(`Instala o comando global setup-agentic-stack.

Uso:
  PowerShell: .\\install.ps1 [--force] [--dry-run]
  CMD:        install.cmd [--force] [--dry-run]
  macOS/Linux/Git Bash: ./install.sh [--force] [--dry-run]

Sem --force, arquivos conflitantes são preservados. O PATH só é alterado após
consentimento explícito. --dry-run não grava nem altera configurações.
`);
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return 0;
  }
  const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
  if (nodeMajor < 20 || (nodeMajor === 20 && nodeMinor < 12)) {
    throw new Error("Node.js 20.12 ou superior é necessário.");
  }

  process.stdout.write(`Instalação local: ${installRoot}\nComandos globais: ${binDirectory}\n`);
  if (options.dryRun) process.stdout.write("Modo dry-run; nenhuma alteração será feita.\n");

  const copyOptions = { force: options.force, dryRun: options.dryRun };
  const results = [];
  for (const entry of managedDirectories) {
    results.push(copyTreeSafe(path.join(sourceRoot, entry), path.join(installRoot, entry), { ...copyOptions, root: home }));
  }
  for (const entry of managedFiles) {
    results.push(
      copyTreeSafe(path.join(sourceRoot, entry), path.join(installRoot, entry), {
        ...copyOptions,
        root: home,
      }),
    );
  }

  if (options.dryRun) {
    results.push(planGeneratedFiles(wrapperContents(), home, binDirectory));
  } else {
    const wrappers = mkdtempSync(path.join(os.tmpdir(), "agentic-stack-wrappers-"));
    try {
      writeWrappers(wrappers);
      results.push(copyTreeSafe(wrappers, binDirectory, { ...copyOptions, root: home }));
    } finally {
      rmSync(wrappers, { recursive: true, force: true });
    }
  }

  const conflicts = results.flatMap((result) => result.conflicts);
  const unsafe = results.flatMap((result) => result.unsafe);
  for (const result of results) {
    if (options.dryRun) {
      for (const file of result.copied) process.stdout.write(`Planejado: copiar ${file}\n`);
    } else {
      if (result.copied.length) process.stdout.write(`Arquivos novos/atualizados: ${result.copied.length}\n`);
      if (result.unchanged.length) process.stdout.write(`Arquivos já iguais: ${result.unchanged.length}\n`);
    }
    for (const file of result.unchanged) process.stdout.write(`Sem alteração: ${file}\n`);
    for (const file of result.conflicts) process.stdout.write(`Conflito: ${file}\n`);
    for (const file of result.unsafe) process.stdout.write(`Bloqueado: ${file}\n`);
  }
  if (conflicts.length) {
    process.stderr.write("Conflitos preservados. Revise os caminhos ou repita com --force:\n");
    for (const file of conflicts) process.stderr.write(`  - ${file}\n`);
  }
  if (unsafe.length) {
    process.stderr.write("Caminhos simbólicos/incompatíveis foram preservados por segurança:\n");
    for (const file of unsafe) process.stderr.write(`  - ${file}\n`);
  }
  if (options.dryRun) return conflicts.length || unsafe.length ? 1 : 0;
  if (conflicts.length || unsafe.length) return 1;

  const currentPath = (process.env.PATH || "").split(path.delimiter);
  const pathConfigured = currentPath.some((entry) =>
    process.platform === "win32"
      ? path.resolve(entry).toLowerCase() === path.resolve(binDirectory).toLowerCase()
      : path.resolve(entry) === path.resolve(binDirectory),
  );
  if (!pathConfigured) {
    if (await ask("Deseja adicionar ~/.local/bin ao PATH do usuário?")) {
      addPathEntry();
      process.stdout.write("PATH atualizado. Reabra o terminal para usar o comando.\n");
    } else {
      printManualPathInstructions();
    }
  }
  process.stdout.write("Instalação concluída. Reabra o terminal e execute setup-agentic-stack --help.\n");
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    (status) => {
      process.exitCode = status;
    },
    (error) => {
      process.stderr.write(`Erro: ${error.message}\n`);
      process.exitCode = 1;
    },
  );
}
