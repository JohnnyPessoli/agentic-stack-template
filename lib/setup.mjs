import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
  BLOCK_REGISTRY_SUFFIX,
  blockHash,
  instructionBlock,
  instructionFiles,
  planInstructionFile,
} from "./instructions.mjs";
import { hashBytes, readRegistry, registryFile, registryKey, registryPath, writeRegistry } from "./registry.mjs";

export const VERSION = "1.2.0";
export const BMAD_VERSION = "6.12.4";
export const ALETHE_REPOSITORY = "https://github.com/Kc1t/alethe-orchestrate-skill.git";
export const ALETHE_COMMIT = "3268b6d115cb27d58ebf3409de6c49d55f919477";
export const ALETHE_RULE =
  "Quando o projeto tiver BMAD instalado, use os fluxos e personas BMAD relevantes sem exigir que a pessoa os nomeie. Atue como líder e escolha entre trabalhar diretamente ou orquestrar workers conforme o tamanho e a decomposição da tarefa.";

export const ALLOWED_TOOLS = [
  "antigravity-cli",
  "claude-code",
  "codex",
  "cursor",
  "github-copilot",
];

export const TOOL_SKILL_DIRS = {
  "antigravity-cli": ".agents/skills",
  "claude-code": ".claude/skills",
  codex: ".agents/skills",
  cursor: ".agents/skills",
  "github-copilot": ".agents/skills",
};

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TEMPLATE_DIR = path.join(ROOT, "templates");
const OUTPUT = {
  out: (message) => process.stdout.write(`${message}\n`),
  error: (message) => process.stderr.write(`${message}\n`),
};

export function helpText() {
  return `setup-agentic-stack ${VERSION}

Uso:
  setup-agentic-stack [opções]

Opções:
  --target <diretório>          Projeto-alvo (padrão: diretório atual)
  --tools <lista>               IDs separados por vírgula; substitui a detecção
  --dry-run                     Lista ações sem alterar arquivos ou executar instalações
  --force                       Substitui conflitos apenas nos arquivos de template
  --install-uv                  Autoriza instalação oficial de uv se estiver ausente
  --update-bmad                 Atualiza BMAD existente pelo fluxo oficial 6.12.4
  --skip-alethe                 Não instala Alethe nem altera configuração global
  --enable-alethe-everywhere    Autoriza modo global Alethe e regra BMAD sem prompt
  --skip-agent-instructions     Não cria nem altera o bloco em AGENTS.md/CLAUDE.md
  --help                        Exibe esta ajuda

Ferramentas aceitas: ${ALLOWED_TOOLS.join(", ")}.
`;
}

export function parseArgs(argv) {
  const options = {
    target: undefined,
    tools: undefined,
    dryRun: false,
    force: false,
    installUv: false,
    updateBmad: false,
    skipAlethe: false,
    enableAletheEverywhere: false,
    skipAgentInstructions: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--help" || value === "-h") {
      options.help = true;
    } else if (value === "--dry-run") {
      options.dryRun = true;
    } else if (value === "--force") {
      options.force = true;
    } else if (value === "--install-uv") {
      options.installUv = true;
    } else if (value === "--update-bmad") {
      options.updateBmad = true;
    } else if (value === "--skip-alethe") {
      options.skipAlethe = true;
    } else if (value === "--enable-alethe-everywhere") {
      options.enableAletheEverywhere = true;
    } else if (value === "--skip-agent-instructions") {
      options.skipAgentInstructions = true;
    } else if (value === "--target" || value === "--tools") {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        throw new Error(`A opção ${value} exige um valor.`);
      }
      index += 1;
      if (value === "--target") options.target = next;
      else options.tools = parseTools(next);
    } else {
      throw new Error(`Opção desconhecida: ${value}`);
    }
  }

  if (options.skipAlethe && options.enableAletheEverywhere) {
    throw new Error("--skip-alethe e --enable-alethe-everywhere são incompatíveis.");
  }

  return options;
}

export function parseTools(value) {
  const tools = value
    .split(",")
    .map((tool) => tool.trim())
    .filter(Boolean);
  if (tools.length === 0) throw new Error("--tools precisa conter pelo menos um ID.");

  const unknown = tools.filter((tool) => !ALLOWED_TOOLS.includes(tool));
  if (unknown.length > 0) {
    throw new Error(
      `Ferramenta(s) não suportada(s): ${unknown.join(", ")}. Aceitas: ${ALLOWED_TOOLS.join(", ")}.`,
    );
  }

  return [...new Set(tools)];
}

export function resolveTarget(target, cwd = process.cwd()) {
  const candidate = path.resolve(cwd, target || ".");
  if (!existsSync(candidate)) {
    throw new Error(`O diretório-alvo não existe: ${candidate}`);
  }
  if (!statSync(candidate).isDirectory()) {
    throw new Error(`O destino não é um diretório: ${candidate}`);
  }

  const canonical = realpathSync(candidate);
  const root = path.parse(canonical).root;
  if (path.resolve(canonical) === path.resolve(root)) {
    throw new Error("A raiz de um volume ou filesystem não pode ser o projeto-alvo.");
  }
  return canonical;
}

function hasPath(...segments) {
  return existsSync(path.join(...segments));
}

export function detectTools(target, home = os.homedir(), env = process.env) {
  const tools = [];
  const commands = new Set(
    (env.PATH || "")
      .split(path.delimiter)
      .filter(Boolean)
      .flatMap((directory) => {
        try {
          return readdirSync(directory).map((entry) => entry.toLowerCase());
        } catch {
          return [];
        }
      }),
  );
  const hasCommand = (...names) =>
    names.some((name) => commands.has(name.toLowerCase()));

  if (
    hasCommand("agy", "agy.exe", "antigravity", "antigravity.exe") ||
    hasPath(home, ".gemini", "antigravity")
  ) {
    tools.push("antigravity-cli");
  }
  if (
    hasCommand("claude", "claude.exe") ||
    hasPath(target, ".claude") ||
    hasPath(home, ".claude")
  ) {
    tools.push("claude-code");
  }
  if (
    hasCommand("codex", "codex.exe") ||
    hasPath(target, ".codex") ||
    hasPath(home, ".codex")
  ) {
    tools.push("codex");
  }
  if (
    hasCommand("cursor", "cursor.exe") ||
    hasPath(target, ".cursor") ||
    hasPath(target, ".cursorrules") ||
    hasPath(home, ".cursor")
  ) {
    tools.push("cursor");
  }

  const copilotInstructions = path.join(target, ".github", "copilot-instructions.md");
  const copilotAgents = path.join(target, ".github", "agents");
  const vscodeExtensions = path.join(target, ".vscode", "extensions.json");
  let vscodeMentionsCopilot = false;
  if (existsSync(vscodeExtensions)) {
    try {
      vscodeMentionsCopilot = /github\.copilot/i.test(
        readFileSync(vscodeExtensions, "utf8"),
      );
    } catch {
      vscodeMentionsCopilot = false;
    }
  }
  const extensionDir = path.join(home, ".vscode", "extensions");
  let installedCopilotExtension = false;
  if (existsSync(extensionDir)) {
    try {
      installedCopilotExtension = readdirSync(extensionDir).some((entry) =>
        /^github\.copilot(?:-chat)?-/i.test(entry),
      );
    } catch {
      installedCopilotExtension = false;
    }
  }
  if (
    existsSync(copilotInstructions) ||
    existsSync(copilotAgents) ||
    vscodeMentionsCopilot ||
    installedCopilotExtension
  ) {
    tools.push("github-copilot");
  }

  return tools;
}

export function buildBmadArgs({ target, tools, update }) {
  const prefix = [
    "exec",
    "--yes",
    "--package",
    `bmad-method@${BMAD_VERSION}`,
    "--",
    "bmad-method",
    "install",
    "--directory",
    target,
  ];

  if (update) return [...prefix, "--action", "update", "--yes"];
  return [
    ...prefix,
    "--modules",
    "bmm",
    "--tools",
    tools.join(","),
    "--communication-language",
    "Portuguese",
    "--document-output-language",
    "Portuguese",
    "--yes",
  ];
}

export function inspectBmadInstallation(target) {
  const manifestPath = path.join(target, "_bmad", "_config", "manifest.yaml");
  if (!existsSync(manifestPath)) return { version: undefined, modules: [], tools: [] };
  const info = statSync(manifestPath);
  if (info.size > 1_000_000) return { version: undefined, modules: [], tools: [] };
  const content = readFileSync(manifestPath, "utf8");
  const installation =
    content.match(/^installation:\r?\n((?:[ \t].*(?:\r?\n|$))*)/m)?.[1] || "";
  const version =
    installation.match(/^[ \t]+version:\s*([0-9][A-Za-z0-9.+-]*)\s*$/m)?.[1] ||
    undefined;
  const modules = [...content.matchAll(/^[ \t]*-[ \t]+name:\s*([a-z0-9_-]+)\s*$/gim)].map(
    (match) => match[1],
  );
  const toolsBlock = content.match(/^ides:\s*\r?\n((?:[ \t]+.*(?:\r?\n|$))*)/m)?.[1] || "";
  const tools = [...toolsBlock.matchAll(/^[ \t]*-[ \t]+([a-z0-9_-]+)\s*$/gim)].map(
    (match) => match[1],
  );
  return { version, modules: [...new Set(modules)], tools: [...new Set(tools)] };
}

function isWithin(root, destination) {
  const relative = path.relative(root, destination);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

// Links/junctions para diretórios do próprio projeto (ex.: .claude/skills -> .agents/skills)
// são aceitos; qualquer link que saia do projeto continua recusado.
function linkStaysInside(root, linkPath) {
  try {
    const realRoot = realpathSync(root);
    const real = realpathSync(linkPath);
    return real !== realRoot && isWithin(realRoot, real) && statSync(real).isDirectory();
  } catch {
    return false;
  }
}

function isSafeDirectory(root, directory) {
  const info = lstatSync(directory);
  if (info.isSymbolicLink()) return linkStaysInside(root, directory);
  return info.isDirectory();
}

function inspectDestination(root, destination) {
  if (!isWithin(root, destination)) throw new Error("Tentativa de escrita fora do destino permitido.");
  const relative = path.relative(root, destination);
  let current = root;
  if (existsSync(current)) {
    const info = lstatSync(current);
    if (info.isSymbolicLink() || !info.isDirectory()) {
      return { conflict: current, unsafe: true };
    }
  }
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!existsSync(current)) continue;
    const info = lstatSync(current);
    if (info.isSymbolicLink()) {
      if (linkStaysInside(root, current)) continue;
      return { conflict: current, unsafe: true };
    }
    if (current !== destination && !info.isDirectory()) {
      return { conflict: current, unsafe: true };
    }
  }
  return { conflict: undefined, unsafe: false };
}

function writeCopy(sourcePath, destinationPath, mode) {
  mkdirSync(path.dirname(destinationPath), { recursive: true });
  const temporary = `${destinationPath}.${randomUUID()}.tmp`;
  copyFileSync(sourcePath, temporary);
  try {
    if (existsSync(destinationPath)) rmSync(destinationPath);
    writeFileSync(destinationPath, readFileSync(temporary), { mode });
    if (process.platform !== "win32") chmodSync(destinationPath, mode);
  } finally {
    if (existsSync(temporary)) rmSync(temporary);
  }
}

function sameFile(file, bytes) {
  return existsSync(file) && lstatSync(file).isFile() && readFileSync(file).equals(bytes);
}

// Caminho real onde um arquivo de instruções pode ser lido/gravado, ou undefined
// quando não é seguro: link para fora do projeto, link quebrado ou não arquivo.
function resolveProjectFile(target, file) {
  let info;
  try {
    info = lstatSync(file);
  } catch (error) {
    return error.code === "ENOENT" ? file : undefined;
  }
  if (!info.isSymbolicLink()) return info.isFile() ? file : undefined;
  try {
    const real = realpathSync(file);
    return isWithin(realpathSync(target), real) && statSync(real).isFile() ? real : undefined;
  } catch {
    return undefined;
  }
}

function writeTextAtomic(file, text) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, text);
    renameSync(temporary, file);
  } finally {
    if (existsSync(temporary)) rmSync(temporary);
  }
}

/**
 * Copia uma árvore de template em duas fases (planejar, depois gravar).
 *
 * - installedHash(destino): hash registrado na última instalação; um arquivo
 *   divergente cujo hash ainda é esse não foi editado e é atualizado sem --force.
 * - atomic: com qualquer conflito/caminho inseguro, nada do componente é gravado.
 * - sidecar: para cada conflito, grava a versão nova ao lado como `<arquivo>.new`.
 *
 * `files` mapeia cada destino ao hash do arquivo de template correspondente.
 */
export function copyTreeSafe(
  source,
  destination,
  { force = false, dryRun = false, root = destination, installedHash, atomic = false, sidecar = false } = {},
) {
  const result = {
    copied: [],
    upgraded: [],
    unchanged: [],
    conflicts: [],
    unsafe: [],
    sidecars: [],
    blocked: false,
    files: new Map(),
  };
  const rootState = inspectDestination(root, destination);
  if (rootState.unsafe) {
    result.unsafe.push(rootState.conflict);
    return result;
  }

  const directories = [];
  const writes = [];
  const sources = new Map();

  function visit(sourcePath, destinationPath) {
    const sourceInfo = lstatSync(sourcePath);
    if (sourceInfo.isSymbolicLink()) {
      result.unsafe.push(sourcePath);
      return;
    }
    if (sourceInfo.isDirectory()) {
      const destinationState = inspectDestination(root, destinationPath);
      if (destinationState.unsafe) {
        result.unsafe.push(destinationState.conflict);
        return;
      }
      if (!existsSync(destinationPath)) directories.push(destinationPath);
      for (const entry of readdirSync(sourcePath)) {
        visit(path.join(sourcePath, entry), path.join(destinationPath, entry));
      }
      return;
    }

    const state = inspectDestination(root, destinationPath);
    if (state.unsafe) {
      result.unsafe.push(state.conflict);
      return;
    }
    const sourceBytes = readFileSync(sourcePath);
    result.files.set(destinationPath, hashBytes(sourceBytes));
    sources.set(destinationPath, { sourcePath, sourceBytes, mode: sourceInfo.mode & 0o777 });
    if (existsSync(destinationPath)) {
      const destinationInfo = lstatSync(destinationPath);
      if (!destinationInfo.isFile()) {
        result.unsafe.push(destinationPath);
        return;
      }
      const destinationBytes = readFileSync(destinationPath);
      if (sourceBytes.equals(destinationBytes)) {
        result.unchanged.push(destinationPath);
        return;
      }
      const recorded = installedHash?.(destinationPath);
      if (!force && recorded && recorded === hashBytes(destinationBytes)) {
        result.upgraded.push(destinationPath);
      } else if (force) {
        result.copied.push(destinationPath);
      } else {
        result.conflicts.push(destinationPath);
        if (sidecar) result.sidecars.push(`${destinationPath}.new`);
        return;
      }
    } else {
      result.copied.push(destinationPath);
    }
    writes.push(destinationPath);
  }

  if (!isWithin(root, destination)) throw new Error("Tentativa de escrita fora do destino permitido.");
  visit(source, destination);
  if (dryRun) return result;

  result.blocked = atomic && (result.conflicts.length > 0 || result.unsafe.length > 0);
  if (!result.blocked) {
    const parent = path.dirname(destination);
    if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
    for (const directory of directories) mkdirSync(directory, { recursive: true });
    for (const file of writes) {
      const { sourcePath, mode } = sources.get(file);
      writeCopy(sourcePath, file, mode);
    }
  }

  for (const sidecarPath of [...result.sidecars]) {
    const original = sidecarPath.slice(0, -".new".length);
    const { sourcePath, sourceBytes, mode } = sources.get(original);
    const state = inspectDestination(root, sidecarPath);
    if (state.unsafe || (existsSync(sidecarPath) && !lstatSync(sidecarPath).isFile())) {
      result.sidecars.splice(result.sidecars.indexOf(sidecarPath), 1);
      result.unsafe.push(sidecarPath);
      continue;
    }
    if (!sameFile(sidecarPath, sourceBytes)) writeCopy(sourcePath, sidecarPath, mode);
  }

  // Remove apenas `.new` gerados pelo template que ficaram idênticos ao arquivo
  // já resolvido; qualquer outro arquivo do projeto é preservado.
  const current = result.blocked ? result.unchanged : [...result.unchanged, ...result.copied, ...result.upgraded];
  for (const file of current) {
    const { sourceBytes } = sources.get(file);
    if (sameFile(`${file}.new`, sourceBytes) && !inspectDestination(root, `${file}.new`).unsafe) {
      rmSync(`${file}.new`);
    }
  }
  return result;
}

export function projectLockPath(target) {
  const hash = createHash("sha256").update(target.toLowerCase()).digest("hex");
  return path.join(os.tmpdir(), `setup-agentic-stack-${hash}.lock`);
}

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function lockIsStale(lockPath) {
  try {
    const pid = Number.parseInt(readFileSync(lockPath, "utf8").trim(), 10);
    return Number.isInteger(pid) && pid > 0 && pid !== process.pid && !processAlive(pid);
  } catch {
    return false;
  }
}

export function createProjectLock(target) {
  const lockPath = projectLockPath(target);
  const acquire = () => writeFileSync(lockPath, `${process.pid}\n`, { flag: "wx" });
  try {
    acquire();
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    // Uma execução interrompida (Ctrl+C, terminal fechado) deixa o lock para trás;
    // ele só é reaproveitado quando o processo que o criou não existe mais.
    let reclaimed = false;
    if (lockIsStale(lockPath)) {
      rmSync(lockPath, { force: true });
      try {
        acquire();
        reclaimed = true;
      } catch (retryError) {
        if (retryError.code !== "EEXIST") throw retryError;
      }
    }
    if (!reclaimed) {
      throw new Error(
        `Outra execução pode estar usando este projeto (lock: ${lockPath}). Verifique antes de removê-lo.`,
      );
    }
  }
  return () => rmSync(lockPath, { force: true });
}

function findNpmCli(env = process.env) {
  const candidates = new Set();
  const nodeDirectory = path.dirname(process.execPath);
  candidates.add(path.join(nodeDirectory, "node_modules", "npm", "bin", "npm-cli.js"));
  candidates.add(path.join(nodeDirectory, "npm", "bin", "npm-cli.js"));

  for (const directory of (env.PATH || "").split(path.delimiter).filter(Boolean)) {
    candidates.add(path.join(directory, "node_modules", "npm", "bin", "npm-cli.js"));
    candidates.add(path.join(directory, "..", "node_modules", "npm", "bin", "npm-cli.js"));
    for (const name of process.platform === "win32" ? ["npm.cmd", "npm"] : ["npm"]) {
      const npmPath = path.join(directory, name);
      if (!existsSync(npmPath)) continue;
      try {
        const resolved = realpathSync(npmPath);
        if (resolved.endsWith(".js")) candidates.add(resolved);
        candidates.add(path.join(path.dirname(resolved), "npm-cli.js"));
      } catch {
        if (name.endsWith(".cmd")) {
          const content = readFileSync(npmPath, "utf8");
          const match = content.match(/["']?([^"'\r\n]*npm-cli\.js)["']?/i);
          if (match) candidates.add(match[1]);
        }
      }
    }
  }

  return [...candidates].find((candidate) => existsSync(candidate));
}

function run(command, args, { cwd, env = process.env, stdio = "inherit" } = {}) {
  return spawnSync(command, args, { cwd, env, stdio, windowsHide: true });
}

function pythonCommand(env = process.env) {
  const candidates = process.platform === "win32" ? [["python"], ["py", "-3"]] : [["python3"], ["python"]];
  const detected = [];
  for (const [command, ...prefix] of candidates) {
    const result = run(command, [...prefix, "--version"], { stdio: "pipe", env });
    if (result.status !== 0) continue;
    const text = `${result.stdout || ""}${result.stderr || ""}`;
    const match = text.match(/Python\s+(\d+)\.(\d+)/i);
    if (!match) continue;
    const item = {
      command,
      prefix,
      version: `${match[1]}.${match[2]}`,
      major: Number(match[1]),
      minor: Number(match[2]),
    };
    detected.push(item);
    if (item.major > 3 || (item.major === 3 && item.minor >= 10)) return item;
  }
  return detected.sort((left, right) => right.major - left.major || right.minor - left.minor)[0];
}

// Retorna { path, onPath }. Também procura nos destinos padrão do instalador oficial,
// porque o PATH do processo atual não é atualizado logo após instalar uv.
export function findUv(env = process.env, home = os.homedir()) {
  const names = process.platform === "win32" ? ["uv.exe", "uv.cmd", "uv"] : ["uv"];
  const find = (directories) => {
    for (const directory of directories) {
      for (const name of names) {
        const candidate = path.join(directory, name);
        if (existsSync(candidate)) return candidate;
      }
    }
    return undefined;
  };
  const onPath = find((env.PATH || "").split(path.delimiter).filter(Boolean));
  if (onPath) return { path: onPath, onPath: true };
  const installed = find(
    [env.UV_INSTALL_DIR, env.XDG_BIN_HOME, path.join(home, ".local", "bin"), path.join(home, ".cargo", "bin")].filter(Boolean),
  );
  return installed ? { path: installed, onPath: false } : undefined;
}

function gitAvailable(env = process.env) {
  return run("git", ["--version"], { stdio: "pipe", env }).status === 0;
}

export function findRepositoryRoot(target) {
  let current = target;
  while (true) {
    if (existsSync(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

export function missingBmadTools(info, tools) {
  if (info.tools.length === 0) return [];
  return tools.filter((tool) => !info.tools.includes(tool));
}

function projectWarnings(target, tools, bmadExists) {
  const warnings = [];
  const repositoryRoot = findRepositoryRoot(target);
  if (repositoryRoot && repositoryRoot !== target) {
    warnings.push(
      `O destino está dentro do repositório Git ${repositoryRoot}, mas não é a raiz. As IDEs costumam ler skills a partir da pasta aberta como workspace; confirme se é este o diretório desejado ou use --target.`,
    );
  }
  if (bmadExists) {
    const missing = missingBmadTools(inspectBmadInstallation(target), tools);
    if (missing.length > 0) {
      warnings.push(
        `O BMAD existente não registra integração para: ${missing.join(", ")}. Kent e Alethe serão copiados, mas as skills BMAD não aparecerão nessa(s) ferramenta(s). Para adicioná-las, execute o instalador oficial interativo (npx bmad-method@${BMAD_VERSION} install) no projeto e selecione as ferramentas; --update-bmad não altera a lista de ferramentas.`,
      );
    }
  }
  return warnings;
}

async function askYesNo(question, input = process.stdin, output = process.stdout) {
  if (!input.isTTY) return false;
  const readline = createInterface({ input, output });
  try {
    const answer = (await readline.question(`${question} [s/N] `)).trim().toLowerCase();
    return answer === "s" || answer === "sim" || answer === "y" || answer === "yes";
  } finally {
    readline.close();
  }
}

async function installUv(python, env = process.env) {
  const url =
    process.platform === "win32"
      ? "https://astral.sh/uv/install.ps1"
      : "https://astral.sh/uv/install.sh";
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Download do instalador oficial de uv falhou (HTTP ${response.status}).`);
  const temporaryDirectory = path.join(os.tmpdir(), `setup-agentic-stack-uv-${randomUUID()}`);
  mkdirSync(temporaryDirectory);
  const installer = path.join(temporaryDirectory, process.platform === "win32" ? "install-uv.ps1" : "install-uv.sh");
  try {
    writeFileSync(installer, Buffer.from(await response.arrayBuffer()), { mode: 0o700 });
    const result =
      process.platform === "win32"
        ? run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installer], { env })
        : run("sh", [installer], { env });
    return result.status === 0;
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function printCopyResult(label, result, out = OUTPUT.out) {
  if (result.blocked) {
    out(`${label}: não atualizado, para não misturar versões; nenhum arquivo do componente foi alterado.`);
  } else {
    if (result.copied.length) out(`${label}: ${result.copied.length} arquivo(s) copiado(s).`);
    if (result.upgraded?.length) {
      out(`${label}: ${result.upgraded.length} arquivo(s) atualizado(s) para a versão nova (não editados desde a instalação).`);
    }
  }
  if (result.unchanged.length) out(`${label}: ${result.unchanged.length} arquivo(s) já estavam iguais.`);
  if (result.conflicts.length) {
    out(`${label}: arquivos editados ou sem registro preservados (use --force para substituí-los):`);
    for (const file of result.conflicts) out(`  - ${file}`);
  }
  if (result.sidecars?.length) {
    out(`${label}: versão nova gravada ao lado para comparação:`);
    for (const file of result.sidecars) out(`  - ${file}`);
  }
  if (result.unsafe.length) {
    out(`${label}: caminhos simbólicos ou incompatíveis foram preservados por segurança:`);
    for (const file of result.unsafe) out(`  - ${file}`);
  }
}

function describeRegistry(registry) {
  if (!registry.exists) {
    return "ausente — arquivos de template divergentes serão tratados como editados e preservados";
  }
  if (!registry.valid) return "inválido — arquivos de template divergentes serão tratados como editados e preservados";
  return `template ${registry.templateVersion ?? "desconhecido"}, ${Object.keys(registry.files).length} arquivo(s) rastreado(s); este comando: ${VERSION}`;
}

// Liga as cópias de template ao registro do projeto: atualiza arquivos não
// editados, preserva os editados e acumula os hashes a gravar no final.
function createTemplateSync(target, options, out, dryRun) {
  const registry = readRegistry(target);
  const files = { ...registry.files };
  const obsolete = new Set();
  let unregisteredConflicts = false;

  function sync(label, source, destination, { atomic }) {
    const result = copyTreeSafe(source, destination, {
      force: options.force,
      dryRun,
      root: target,
      atomic,
      sidecar: true,
      installedHash: (file) => registry.files[registryKey(target, file)],
    });
    printCopyResult(dryRun ? `Previsto — ${label}` : label, result, out);
    if (result.conflicts.some((file) => !registry.files[registryKey(target, file)])) unregisteredConflicts = true;
    if (result.unsafe.length > 0) return result;

    const applied = result.blocked || dryRun ? [] : [...result.copied, ...result.upgraded];
    for (const file of [...result.unchanged, ...applied]) files[registryKey(target, file)] = result.files.get(file);
    const produced = new Set([...result.files.keys()].map((file) => registryKey(target, file)));
    const prefix = `${registryKey(target, destination)}/`;
    for (const key of Object.keys(registry.files)) {
      if (!key.startsWith(prefix) || produced.has(key)) continue;
      const file = registryFile(target, key);
      if (existsSync(file)) obsolete.add(file);
      else delete files[key];
    }
    return result;
  }

  // Bloco gerenciado em AGENTS.md/CLAUDE.md (spec §11). O registro guarda o hash
  // do bloco, não do arquivo, porque o restante do arquivo pertence ao projeto.
  function syncInstructions(tools, { alethe }) {
    const block = instructionBlock({ alethe });
    const results = [];
    for (const name of instructionFiles(tools)) {
      const file = path.join(target, name);
      const key = `${registryKey(target, file)}${BLOCK_REGISTRY_SUFFIX}`;
      const real = resolveProjectFile(target, file);
      if (!real) {
        results.push({ file, action: "unsafe" });
        continue;
      }
      const existing = existsSync(real) ? readFileSync(real, "utf8") : undefined;
      const plan = planInstructionFile({ existing, block, recordedHash: registry.files[key], force: options.force });
      const result = { file, action: plan.action };
      results.push(result);
      if (dryRun) continue;

      if (plan.text !== undefined && plan.text !== existing) writeTextAtomic(real, plan.text);
      if (plan.text !== undefined) files[key] = blockHash(block);

      const sidecar = `${file}.new`;
      const realSidecar = resolveProjectFile(target, sidecar);
      if (plan.sidecar !== undefined) {
        if (!realSidecar) result.action = "unsafe";
        else if (!existsSync(realSidecar) || readFileSync(realSidecar, "utf8") !== plan.sidecar) {
          writeTextAtomic(realSidecar, plan.sidecar);
        }
      } else if (plan.text !== undefined && realSidecar && existsSync(realSidecar) && readFileSync(realSidecar, "utf8") === plan.text) {
        // Remove apenas o `.new` que ficou idêntico ao arquivo já resolvido.
        rmSync(realSidecar);
      }
    }
    return results;
  }

  function warnings() {
    const list = [];
    if (registry.exists && !registry.valid) {
      list.push(`O registro ${registryPath(target)} é inválido; arquivos divergentes foram tratados como editados.`);
    }
    if (unregisteredConflicts) {
      list.push(
        "Arquivos de template divergentes sem registro de instalação (instalação antiga, manual ou registro perdido) foram tratados como editados. Compare com os arquivos *.new e, se quiser a versão nova, substitua-os manualmente ou repita com --force.",
      );
    }
    if (obsolete.size > 0) {
      list.push(
        `Arquivo(s) que não fazem mais parte do template foram mantidos; remova-os manualmente se não forem usados:\n${[...obsolete].map((file) => `    - ${file}`).join("\n")}`,
      );
    }
    return list;
  }

  function save({ aletheInstalled }) {
    return writeRegistry(target, {
      templateVersion: VERSION,
      aletheCommit: aletheInstalled ? ALETHE_COMMIT : registry.aletheCommit,
      files,
    });
  }

  return { registry, sync, syncInstructions, warnings, save };
}

const INSTRUCTION_MESSAGES = {
  create: ["criado com o bloco BMAD + Alethe", "será criado com o bloco BMAD + Alethe"],
  append: ["bloco acrescentado ao final; conteúdo existente preservado", "bloco será acrescentado ao final; conteúdo existente preservado"],
  update: ["bloco atualizado para a versão nova", "bloco será atualizado para a versão nova"],
  unchanged: ["bloco já estava atualizado", "bloco já está atualizado"],
  edited: [
    "bloco editado preservado; versão nova gravada em .new (use --force para substituir só o bloco)",
    "bloco editado será preservado; versão nova irá para .new (use --force para substituir só o bloco)",
  ],
  removed: [
    "bloco removido anteriormente; não foi readicionado (use --force para readicionar)",
    "bloco removido anteriormente; não será readicionado (use --force para readicionar)",
  ],
  malformed: [
    "marcadores agentic-stack incompletos ou duplicados; arquivo não alterado, corrija-os manualmente",
    "marcadores agentic-stack incompletos ou duplicados; arquivo não será alterado",
  ],
  unsafe: [
    "link para fora do projeto ou caminho incompatível; não alterado por segurança",
    "link para fora do projeto ou caminho incompatível; não será alterado",
  ],
};

const INSTRUCTION_LABELS = {
  create: "criado",
  append: "bloco acrescentado",
  update: "bloco atualizado",
  unchanged: "sem mudança",
  edited: "bloco editado preservado (.new)",
  removed: "bloco removido, não readicionado",
  malformed: "marcadores inválidos, não alterado",
  unsafe: "caminho inseguro, não alterado",
};

function printInstructionResults(results, dryRun, out = OUTPUT.out) {
  for (const { file, action } of results) {
    out(`${dryRun ? "Previsto — " : ""}Instruções de projeto ${file}: ${INSTRUCTION_MESSAGES[action][dryRun ? 1 : 0]}.`);
  }
}

function assertFreshBmadPaths(target, tools) {
  const possibleDirs = new Set(
    tools.flatMap((tool) => {
      const skillDirectory = path.join(target, TOOL_SKILL_DIRS[tool]);
      const result = [skillDirectory];
      if (tool === "github-copilot") result.push(path.join(target, ".github", "agents"));
      return result;
    }),
  );
  const conflicts = [];
  for (const directory of possibleDirs) {
    if (!existsSync(directory)) continue;
    if (!isSafeDirectory(target, directory)) {
      conflicts.push(directory);
      continue;
    }
    let entries;
    try {
      entries = readdirSync(directory);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (/^bmad-/i.test(entry)) conflicts.push(path.join(directory, entry));
    }
  }
  if (conflicts.length > 0) {
    throw new Error(
      `Há saídas BMAD que podem ser substituídas pelo instalador oficial. Resolva os conflitos manualmente antes de instalar:\n${conflicts.map((item) => `  - ${item}`).join("\n")}`,
    );
  }
}

function assertBmadDirectoriesSafe(target, tools) {
  const directories = new Set([
    path.join(target, "_bmad"),
    ...tools.flatMap((tool) => {
      const skillDirectory = path.join(target, TOOL_SKILL_DIRS[tool]);
      return tool === "github-copilot"
        ? [skillDirectory, path.join(target, ".github", "agents")]
        : [skillDirectory];
    }),
  ]);
  const unsafe = [];
  for (const directory of directories) {
    const relative = path.relative(target, directory);
    let current = target;
    for (const segment of relative.split(path.sep).filter(Boolean)) {
      current = path.join(current, segment);
      if (!existsSync(current)) continue;
      if (!isSafeDirectory(target, current)) {
        unsafe.push(current);
        break;
      }
    }
  }
  if (unsafe.length > 0) {
    throw new Error(
      `Instalação BMAD bloqueada por diretório simbólico ou incompatível:\n${[...new Set(unsafe)].map((item) => `  - ${item}`).join("\n")}`,
    );
  }
}

function runBmad(target, tools, update, out = OUTPUT.out) {
  const npmCli = findNpmCli();
  if (!npmCli) throw new Error("Não encontrei o CLI npm para executar BMAD sem passar argumentos por um shell.");
  const args = buildBmadArgs({ target, tools, update });
  out(update ? "Atualizando BMAD existente pela ação oficial..." : "Instalando BMAD bmm em português...");
  const result = run(process.execPath, [npmCli, ...args], { cwd: target });
  if (result.status !== 0) {
    throw new Error(`O instalador BMAD terminou com código ${result.status ?? "desconhecido"}.`);
  }
}

function cloneAlethe(temporaryDirectory) {
  const checkout = path.join(temporaryDirectory, "alethe");
  let result = run("git", ["clone", "--quiet", "--no-checkout", "--filter=blob:none", "--no-tags", ALETHE_REPOSITORY, checkout]);
  if (result.error?.code === "ENOENT") throw new Error("Git não foi encontrado no PATH; instale o Git para baixar Alethe ou use --skip-alethe.");
  if (result.status !== 0) throw new Error("Não foi possível clonar o repositório público de Alethe.");
  result = run("git", ["-C", checkout, "fetch", "--quiet", "--depth", "1", "origin", ALETHE_COMMIT]);
  if (result.status !== 0) throw new Error("Não foi possível obter a revisão pinada de Alethe.");
  result = run("git", ["-C", checkout, "checkout", "--quiet", "--detach", "FETCH_HEAD"]);
  if (result.status !== 0) throw new Error("Não foi possível selecionar a revisão pinada de Alethe.");
  const skill = path.join(checkout, "skills", "alethe");
  if (!existsSync(path.join(skill, "SKILL.md")) || !existsSync(path.join(skill, "scripts", "orchestrate.py"))) {
    throw new Error("A revisão pinada de Alethe não contém os arquivos de skill esperados.");
  }
  return skill;
}

function enableAlethe(skillPath, python, out = OUTPUT.out, env = process.env) {
  if (!python || python.major < 3 || (python.major === 3 && python.minor < 9)) {
    throw new Error("A ativação global de Alethe requer Python 3.9 ou superior.");
  }
  out("Ativando Alethe globalmente e adicionando a regra BMAD aprovada...");
  const result = run(
    python.command,
    [
      ...python.prefix,
      path.join(skillPath, "scripts", "orchestrate.py"),
      "mode",
      "on",
      "--everywhere",
      "--rule",
      ALETHE_RULE,
    ],
    { stdio: "pipe", env },
  );
  if (result.status !== 0) {
    throw new Error(
      `Alethe não confirmou a ativação global (código ${result.status ?? "desconhecido"}). Nenhuma regra existente foi removida; confira o limite de regras e use a CLI documentada do Alethe.`,
    );
  }
}

function manualAletheCommand(target, tool, python) {
  const scriptPath = path.join(target, TOOL_SKILL_DIRS[tool], "alethe", "scripts", "orchestrate.py");
  const quotePath =
    process.platform === "win32"
      ? `"${scriptPath}"`
      : `'${scriptPath.replaceAll("'", "'\\''")}'`;
  const quoteRule =
    process.platform === "win32"
      ? `"${ALETHE_RULE}"`
      : `'${ALETHE_RULE.replaceAll("'", "'\\''")}'`;
  const interpreter = python
    ? [python.command, ...python.prefix].join(" ")
    : process.platform === "win32"
      ? "python"
      : "python3";
  return `${interpreter} ${quotePath} mode on --everywhere --rule ${quoteRule}`;
}

function printPrerequisites(bmadExists, options, env, home, out = OUTPUT.out) {
  const bmadActionRequired = !bmadExists || options.updateBmad;
  const python = pythonCommand(env);
  const pythonOk = python && (python.major > 3 || (python.major === 3 && python.minor >= 10));
  const uv = findUv(env, home);
  out("Pré-requisitos detectados:");
  out(`  Node.js: ${process.versions.node}`);
  out(`  npm: ${findNpmCli(env) ? "encontrado" : "não encontrado"}${bmadActionRequired ? " (necessário para BMAD)" : ""}`);
  out(
    `  Python: ${python ? python.version : "não encontrado"}${
      bmadActionRequired && !pythonOk ? " — BMAD requer 3.10+; a instalação real falhará nessa etapa" : ""
    }`,
  );
  out(
    `  uv: ${
      uv ? (uv.onPath ? "encontrado" : `encontrado em ${uv.path}, fora do PATH atual`) : "não encontrado (será solicitado consentimento ou use --install-uv)"
    }`,
  );
  if (!options.skipAlethe) {
    out(`  Git: ${gitAvailable(env) ? "encontrado" : "não encontrado — necessário para baixar Alethe"}`);
  }
}

function printDryRun(target, tools, bmadExists, options, dependencies, out = OUTPUT.out) {
  out(`Modo dry-run — nenhum arquivo, download ou configuração global será alterado.`);
  out(`Projeto-alvo: ${target}`);
  out(`Ferramentas: ${tools.join(", ")}`);
  printPrerequisites(bmadExists, options, dependencies.env, dependencies.home, out);
  out(
    bmadExists
      ? options.updateBmad
        ? `BMAD: executar update oficial ${BMAD_VERSION}; ferramentas/módulos não serão redefinidos.`
        : `BMAD: preservar instalação existente${formatBmadInfo(inspectBmadInstallation(target))}; nenhum update será executado.`
      : `BMAD: instalação inicial ${BMAD_VERSION}, módulo bmm, em português.`,
  );
  let templateWarnings = [];
  if (bmadExists) {
    const templates = createTemplateSync(target, options, out, true);
    out(`Registro de instalação: ${describeRegistry(templates.registry)}.`);
    if (templates.registry.templateVersion && templates.registry.templateVersion !== VERSION) {
      out(`Atualização ${templates.registry.templateVersion} → ${VERSION}: veja "Atualizar projetos que já usam o template" no README.`);
    }
    syncKentAndCustom(templates, target, tools);
    if (!options.skipAgentInstructions) {
      printInstructionResults(templates.syncInstructions(tools, { alethe: !options.skipAlethe }), true, out);
    }
    templateWarnings = templates.warnings();
  } else {
    out(`Templates: _bmad/custom e skill Kent nos diretórios compatíveis, após instalar BMAD.`);
    if (!options.skipAgentInstructions) {
      out(`Instruções de projeto: bloco BMAD + Alethe em ${instructionFiles(tools).join(", ")}, após instalar BMAD.`);
    }
  }
  if (!options.skipAlethe) {
    const destinations = [...new Set(tools.map((tool) => path.join(target, TOOL_SKILL_DIRS[tool], "alethe")))];
    out(`Alethe: baixar commit ${ALETHE_COMMIT.slice(0, 12)} e copiar apenas skills/alethe para:`);
    for (const destination of destinations) out(`  - ${destination}`);
    out(
      options.enableAletheEverywhere
        ? "Alethe global: ativar por autorização explícita da flag."
        : "Alethe global: solicitar consentimento separado; nenhuma alteração no dry-run.",
    );
  }
  if (options.force) out("--force: arquivos de template editados serão substituídos.");
  for (const warning of [...projectWarnings(target, tools, bmadExists), ...templateWarnings]) out(`Aviso: ${warning}`);
}

function syncKentAndCustom(templates, target, tools) {
  const results = [
    templates.sync("Customizações BMAD", path.join(TEMPLATE_DIR, "custom"), path.join(target, "_bmad", "custom"), {
      atomic: false,
    }),
  ];
  const skillTargets = [...new Set(tools.map((tool) => path.join(target, TOOL_SKILL_DIRS[tool], "bmad-agent-tdd")))];
  for (const skillTarget of skillTargets) {
    results.push(
      templates.sync(`Kent em ${skillTarget}`, path.join(TEMPLATE_DIR, "skills", "bmad-agent-tdd"), skillTarget, {
        atomic: true,
      }),
    );
  }
  return results;
}

function formatBmadInfo(info) {
  const parts = [];
  if (info.version) parts.push(`versão ${info.version}`);
  if (info.modules.length) parts.push(`módulos ${info.modules.join(", ")}`);
  if (info.tools.length) parts.push(`ferramentas ${info.tools.join(", ")}`);
  return parts.length ? ` (${parts.join("; ")})` : " (manifesto não encontrado ou sem dados reconhecíveis)";
}

async function performSetup(options, dependencies = {}) {
  const out = dependencies.out || OUTPUT.out;
  const error = dependencies.error || OUTPUT.error;
  const env = dependencies.env || process.env;
  const home = dependencies.home || os.homedir();
  const target = resolveTarget(options.target, dependencies.cwd || process.cwd());
  const tools = options.tools || detectTools(target, home, env);
  if (tools.length === 0) {
    throw new Error(
      `Nenhuma ferramenta compatível foi detectada. Use --tools ${ALLOWED_TOOLS.join(",")} ou instale uma ferramenta suportada.`,
    );
  }

  const bmadDirectory = path.join(target, "_bmad");
  const bmadExists = existsSync(bmadDirectory);
  if (bmadExists && (lstatSync(bmadDirectory).isSymbolicLink() || !lstatSync(bmadDirectory).isDirectory())) {
    throw new Error(`O caminho BMAD não é um diretório: ${bmadDirectory}`);
  }

  if (options.dryRun) {
    printDryRun(target, tools, bmadExists, options, { env, home }, out);
    return { status: 0, target, tools, dryRun: true };
  }

  const releaseLock = createProjectLock(target);
  const summary = {
    target,
    tools,
    bmad: "não executado",
    kent: "não instalado",
    instructions: "não aplicadas",
    alethe: options.skipAlethe ? "ignorado por opção" : "não instalado",
    aletheGlobal: "não alterado",
    warnings: projectWarnings(target, tools, bmadExists),
    failures: [],
  };
  let aletheSource;
  let temporaryDirectory;

  try {
    const python = pythonCommand(env);
    const bmadActionRequired = !bmadExists || options.updateBmad;
    let uv = findUv(env, home);
    if (bmadActionRequired && (!python || python.major < 3 || (python.major === 3 && python.minor < 10))) {
      summary.failures.push("BMAD requer Python 3.10 ou superior. Instale-o manualmente e execute novamente.");
    }
    if (!uv) {
      const canInstallUv = summary.failures.length === 0;
      const consent = canInstallUv && (
        options.installUv ||
        (python
          ? await (dependencies.askYesNo || askYesNo)(
              "uv está ausente. Deseja executar o instalador oficial de uv no ambiente do usuário?",
            )
          : false)
      );
      if (consent) {
        try {
          const installed = await installUv(python, env);
          uv = installed ? findUv(env, home) : undefined;
          if (!uv) summary.warnings.push("A instalação de uv não foi confirmada; algumas skills/scripts Python BMAD podem não funcionar.");
        } catch (installError) {
          summary.warnings.push(`Não foi possível instalar uv: ${installError.message}. Algumas skills/scripts Python BMAD podem não funcionar.`);
        }
      } else {
        summary.warnings.push("uv não está disponível; algumas skills/scripts Python do BMAD podem não funcionar.");
      }
    }
    if (uv && !uv.onPath) {
      summary.warnings.push(`uv está em ${uv.path}, mas essa pasta não está no PATH deste terminal; reabra o terminal ou adicione-a ao PATH.`);
    }

    if (summary.failures.length === 0) {
      try {
        if (bmadExists) {
          if (options.updateBmad) {
            assertBmadDirectoriesSafe(target, tools);
            runBmad(target, tools, true, out);
            summary.bmad = `atualizado pela ação oficial ${BMAD_VERSION}`;
          } else {
            const info = inspectBmadInstallation(target);
            summary.bmad = `preservado${formatBmadInfo(info)}; use --update-bmad para solicitar o update oficial`;
            out(`BMAD existente preservado em ${bmadDirectory}${formatBmadInfo(info)}.`);
          }
        } else {
          assertBmadDirectoriesSafe(target, tools);
          assertFreshBmadPaths(target, tools);
          runBmad(target, tools, false, out);
          summary.bmad = `instalado ${BMAD_VERSION} (bmm)`;
        }
      } catch (bmadError) {
        summary.failures.push(`BMAD: ${bmadError.message}`);
      }
    } else {
      summary.bmad = "não executado por pré-requisito ausente";
    }

    const templates = createTemplateSync(target, options, out, false);
    if (templates.registry.templateVersion && templates.registry.templateVersion !== VERSION) {
      out(`Projeto registrado com o template ${templates.registry.templateVersion}; aplicando a versão ${VERSION}.`);
    }
    if (existsSync(bmadDirectory) && statSync(bmadDirectory).isDirectory()) {
      const [customResult, ...kentResults] = syncKentAndCustom(templates, target, tools);
      if (customResult.unsafe.length > 0) summary.failures.push("Há caminhos incompatíveis/simbólicos em _bmad/custom; os arquivos não foram alterados.");
      for (const result of kentResults) {
        if (result.unsafe.length > 0) summary.failures.push("O destino Kent contém caminhos simbólicos/incompatíveis; veja os caminhos acima.");
      }
      summary.kent = kentResults.some((result) => result.blocked)
        ? "não atualizado em algum destino: arquivos editados preservados (versão nova em *.new)"
        : `instalado/atualizado (template ${VERSION})`;
    } else {
      summary.kent = "não instalado porque _bmad/ não está disponível";
    }

    if (options.skipAgentInstructions) {
      summary.instructions = "ignoradas por opção";
    } else if (existsSync(bmadDirectory) && statSync(bmadDirectory).isDirectory()) {
      const results = templates.syncInstructions(tools, { alethe: !options.skipAlethe });
      printInstructionResults(results, false, out);
      if (results.some((result) => result.action === "unsafe")) {
        summary.failures.push("Há arquivo de instruções em link para fora do projeto ou caminho incompatível; veja acima.");
      }
      if (results.some((result) => result.action === "malformed")) {
        summary.warnings.push(
          "Marcadores agentic-stack incompletos ou duplicados em arquivo de instruções; deixe um único par begin/end (ou remova ambos) e execute novamente.",
        );
      }
      summary.instructions = results.map(({ file, action }) => `${path.basename(file)} ${INSTRUCTION_LABELS[action]}`).join("; ");
    } else {
      summary.instructions = "não aplicadas porque _bmad/ não está disponível";
    }

    let aletheInstalled = false;
    if (!options.skipAlethe) {
      try {
        temporaryDirectory = path.join(os.tmpdir(), `setup-agentic-stack-alethe-${randomUUID()}`);
        mkdirSync(temporaryDirectory);
        aletheSource = cloneAlethe(temporaryDirectory);
        let allCopied = true;
        const aletheTargets = [...new Set(tools.map((tool) => path.join(target, TOOL_SKILL_DIRS[tool], "alethe")))];
        for (const destination of aletheTargets) {
          const result = templates.sync(`Alethe em ${destination}`, aletheSource, destination, { atomic: true });
          if (result.unsafe.length > 0) {
            allCopied = false;
            summary.failures.push(`O destino Alethe contém caminhos simbólicos/incompatíveis: ${destination}`);
          }
          if (result.conflicts.length > 0) allCopied = false;
        }
        aletheInstalled = allCopied;

        if (!allCopied) {
          summary.alethe = "não atualizado em algum destino: arquivos editados preservados (versão nova em *.new)";
          if (options.enableAletheEverywhere) {
            summary.failures.push("Alethe global não foi ativado porque a cópia da skill no projeto está incompleta.");
          }
        } else {
          summary.alethe = `instalado no commit ${ALETHE_COMMIT.slice(0, 12)}`;
          const globalConsent =
            options.enableAletheEverywhere ||
            (await (dependencies.askYesNo || askYesNo)(
              "Deseja ativar Alethe globalmente em todos os projetos e adicionar a regra BMAD? Isso não expira. A regra global só chega ao agente em ferramentas com hook do Alethe; neste projeto, o bloco em AGENTS.md/CLAUDE.md já cumpre esse papel.",
            ));
          if (globalConsent) {
            try {
              enableAlethe(aletheSource, python, out, env);
              summary.aletheGlobal = "ativado com a regra BMAD";
            } catch (modeError) {
              summary.failures.push(`Alethe global: ${modeError.message}`);
              summary.aletheGlobal = "não confirmado";
            }
          } else {
            summary.aletheGlobal = "não ativado (consentimento recusado)";
            out(`Para ativar depois, execute: ${manualAletheCommand(target, tools[0], python)}`);
          }
        }
      } catch (aletheError) {
        summary.failures.push(`Alethe: ${aletheError.message}`);
        summary.alethe = "falhou";
      }
    }

    summary.warnings.push(...templates.warnings());
    summary.registry = templates.save({ aletheInstalled })
      ? `gravado em ${registryPath(target)}`
      : "não gravado (_bmad/_config indisponível); na próxima execução, arquivos divergentes serão tratados como editados";
  } finally {
    if (temporaryDirectory && existsSync(temporaryDirectory)) rmSync(temporaryDirectory, { recursive: true, force: true });
    releaseLock();
  }

  out("\nResumo:");
  out(`  Projeto: ${summary.target}`);
  out(`  Ferramentas: ${summary.tools.join(", ")}`);
  out(`  BMAD: ${summary.bmad}`);
  out(`  Kent: ${summary.kent}`);
  out(`  Instruções de projeto: ${summary.instructions}`);
  out(`  Alethe: ${summary.alethe}`);
  out(`  Alethe global: ${summary.aletheGlobal}`);
  if (summary.registry) out(`  Registro: ${summary.registry}`);
  for (const warning of summary.warnings) out(`  Aviso: ${warning}`);
  for (const failure of summary.failures) error(`  Falha: ${failure}`);

  if (summary.failures.length > 0) return { status: 1, ...summary };
  return { status: 0, ...summary };
}

export async function runSetup(argv, dependencies = {}) {
  const out = dependencies.out || OUTPUT.out;
  const error = dependencies.error || OUTPUT.error;
  try {
    const options = parseArgs(argv);
    if (options.help) {
      out(helpText());
      return 0;
    }
    const [major, minor] = process.versions.node.split(".").map(Number);
    if (major < 20 || (major === 20 && minor < 12)) {
      throw new Error("Node.js 20.12 ou superior é necessário.");
    }
    const result = await performSetup(options, dependencies);
    return result.status;
  } catch (setupError) {
    error(`Erro: ${setupError.message}`);
    return 2;
  }
}

export function templateRoot() {
  return TEMPLATE_DIR;
}
