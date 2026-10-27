import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

// Registro do que o template copiou para o projeto: guarda somente caminhos
// relativos e hashes, nunca conteúdo. Permite distinguir um arquivo apenas
// desatualizado (pode ser atualizado) de um arquivo editado (é preservado).
export const REGISTRY_FORMAT = 1;
const REGISTRY_SEGMENTS = ["_bmad", "_config", "agentic-stack.json"];
const MAX_REGISTRY_BYTES = 2_000_000;

export function hashBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function registryPath(target) {
  return path.join(target, ...REGISTRY_SEGMENTS);
}

export function registryKey(target, file) {
  return path.relative(target, file).split(path.sep).join("/");
}

export function registryFile(target, key) {
  return path.join(target, ...key.split("/"));
}

function validKey(key) {
  const segments = key.split("/");
  return key.length > 0 && !path.isAbsolute(key) && !segments.includes("..") && !segments.includes("");
}

export function readRegistry(target) {
  const empty = { exists: false, valid: true, templateVersion: undefined, aletheCommit: undefined, files: {} };
  const file = registryPath(target);
  if (!existsSync(file)) return empty;
  try {
    const info = lstatSync(file);
    if (!info.isFile() || info.size > MAX_REGISTRY_BYTES) return { ...empty, exists: true, valid: false };
    const data = JSON.parse(readFileSync(file, "utf8"));
    const files = {};
    for (const [key, value] of Object.entries(data?.files ?? {})) {
      if (typeof value === "string" && /^[a-f0-9]{64}$/.test(value) && validKey(key)) files[key] = value;
    }
    return {
      exists: true,
      valid: data?.format === REGISTRY_FORMAT,
      templateVersion: typeof data?.templateVersion === "string" ? data.templateVersion : undefined,
      aletheCommit: typeof data?.aletheCommit === "string" ? data.aletheCommit : undefined,
      files,
    };
  } catch {
    return { ...empty, exists: true, valid: false };
  }
}

export function writeRegistry(target, { templateVersion, aletheCommit, files }) {
  const file = registryPath(target);
  const directory = path.dirname(file);
  if (!existsSync(directory)) return false;
  const info = lstatSync(directory);
  if (info.isSymbolicLink() || !info.isDirectory()) return false;
  if (existsSync(file) && !lstatSync(file).isFile()) return false;

  const sorted = Object.fromEntries(Object.entries(files).sort(([left], [right]) => left.localeCompare(right)));
  const content = `${JSON.stringify(
    { format: REGISTRY_FORMAT, templateVersion, aletheCommit, files: sorted },
    null,
    2,
  )}\n`;
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, content);
    renameSync(temporary, file);
  } finally {
    if (existsSync(temporary)) rmSync(temporary);
  }
  return true;
}
