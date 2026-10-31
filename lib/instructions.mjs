import { hashBytes } from "./registry.mjs";

// Bloco gerenciado em AGENTS.md/CLAUDE.md (spec §11): é o único mecanismo lido
// por todas as ferramentas para aplicar a regra BMAD + Alethe sem hooks.
export const BLOCK_BEGIN = "<!-- agentic-stack:begin — gerenciado por setup-agentic-stack; edite fora deste bloco -->";
export const BLOCK_END = "<!-- agentic-stack:end -->";
const BEGIN_PREFIX = "<!-- agentic-stack:begin";
export const BLOCK_REGISTRY_SUFFIX = "#agentic-stack";

const TOOL_INSTRUCTION_FILES = {
  "antigravity-cli": "AGENTS.md",
  "claude-code": "CLAUDE.md",
  codex: "AGENTS.md",
  cursor: "AGENTS.md",
  "github-copilot": "AGENTS.md",
};

export function instructionFiles(tools) {
  return [...new Set(tools.map((tool) => TOOL_INSTRUCTION_FILES[tool]))].sort();
}

export function instructionBlock({ alethe }) {
  const lines = [BLOCK_BEGIN, "## Stack agêntica (BMAD + Alethe)", ""];
  if (alethe) {
    lines.push(
      "- Atue como líder com a skill `alethe`: escolha entre trabalhar diretamente ou",
      "  delegar unidades independentes a workers CLI, conforme o tamanho e a",
      "  decomposição da tarefa. Não delegue toda tarefa.",
    );
  }
  lines.push(
    "- Este projeto tem BMAD (`_bmad/`): use os fluxos e personas BMAD relevantes",
    "  (produto, arquitetura, desenvolvimento) sem exigir que a pessoa os nomeie.",
    "  Não invoque personas em todos os pedidos.",
    "- Para testes, siga a skill `bmad-agent-tdd` (Kent), respeitando o runner e as",
    "  convenções já existentes no projeto.",
    BLOCK_END,
  );
  return lines.join("\n");
}

// O hash ignora LF/CRLF para que a conversão de quebras de linha pelo Git ou
// pelo editor não seja tratada como edição do bloco.
export function blockHash(block) {
  return hashBytes(Buffer.from(block.replace(/\r\n/g, "\n"), "utf8"));
}

function eolOf(text) {
  const crlf = (text.match(/\r\n/g) || []).length;
  const lf = (text.match(/\n/g) || []).length - crlf;
  return crlf > lf ? "\r\n" : "\n";
}

function count(text, marker) {
  return text.split(marker).length - 1;
}

export function findBlock(text) {
  const begins = count(text, BEGIN_PREFIX);
  const ends = count(text, BLOCK_END);
  if (begins === 0 && ends === 0) return { state: "absent" };
  if (begins !== 1 || ends !== 1) return { state: "malformed" };
  const start = text.indexOf(BEGIN_PREFIX);
  const endMarker = text.indexOf(BLOCK_END);
  if (endMarker < start) return { state: "malformed" };
  const end = endMarker + BLOCK_END.length;
  return { state: "present", start, end, content: text.slice(start, end) };
}

/**
 * Decide o que fazer com um arquivo de instruções, sem tocar no disco.
 *
 * - existing: conteúdo atual (undefined se o arquivo não existe).
 * - recordedHash: hash do bloco registrado na última instalação.
 *
 * Retorna { action, text?, sidecar? }. `text` é o arquivo a gravar; `sidecar`
 * é o conteúdo de `<arquivo>.new` quando o bloco foi editado pela pessoa.
 */
export function planInstructionFile({ existing, block, recordedHash, force = false }) {
  if (existing === undefined) return { action: "create", text: `${block}\n` };

  const eol = eolOf(existing);
  const localBlock = block.replace(/\n/g, eol);
  const found = findBlock(existing);
  if (found.state === "malformed") return { action: "malformed" };

  if (found.state === "absent") {
    if (recordedHash && !force) return { action: "removed" };
    if (existing.trim() === "") return { action: "append", text: `${localBlock}${eol}` };
    const separator = existing.endsWith(eol) ? eol : `${eol}${eol}`;
    return { action: "append", text: `${existing}${separator}${localBlock}${eol}` };
  }

  const replaced = `${existing.slice(0, found.start)}${localBlock}${existing.slice(found.end)}`;
  const current = blockHash(found.content);
  if (current === blockHash(block)) return { action: "unchanged", text: existing };
  if (force || current === recordedHash) return { action: "update", text: replaced };
  return { action: "edited", sidecar: replaced };
}
