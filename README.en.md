# Agentic Stack Template

Install a reusable combination of **BMAD**, **Kent (TDD)**, and **Alethe** in
an existing project. Installers are provided for Windows, macOS, and Linux;
you do not need to copy scripts into every project manually.

**Português:** [Leia em português](README.md).

> Alethe is the project's default entry point: setup writes an instruction
> block to `AGENTS.md`/`CLAUDE.md`, which every supported tool reads. Describe
> work in natural language without naming a BMAD persona. Alethe selects
> relevant BMAD workflows/personas when useful, decides whether to work
> directly, and may delegate independent units to CLI workers. It does not
> delegate every task or invoke a BMAD persona for every request.

## How BMAD, Kent, Alethe, and workers fit together

| Component | Role | What it does not mean |
| --- | --- | --- |
| **Alethe** | Default lead/orchestrator through the project instruction block. Understands the request, selects relevant guidance, and chooses direct work or delegation. | It is not a BMAD persona and does not require parallel work for every task. |
| **BMAD** | Method, workflows, and specialist personas for architecture, development, product, and related work. | It is not this stack's CLI-worker orchestrator. |
| **Kent** | TDD persona that discovers and respects the project's existing test runner and conventions. | It does not install Vitest/Jest/pytest or impose directories or coverage thresholds. |
| **CLI worker** | External tool that may execute a unit delegated by Alethe. | A worker is not automatically a BMAD persona or workflow. |

The installer places the Alethe skill in the selected IDE skill directories and
writes the project instruction block that ties Alethe, BMAD, and Kent together.
With separate consent, it also enables Alethe's official global mode with the
same rule; global mode applies to all your projects and has no expiry, but it
only reaches the agent in tools that run Alethe's hook. Actual behavior
depends on the IDE and agent in use.

## Prerequisites

- Git.
- Node.js 20.12 or newer and npm (included with the standard Node.js installer).
- Python 3.10 or newer for BMAD installation/update.
- `uv` for BMAD workflows and scripts that execute Python. If missing, the
  installer asks before running uv's official installer; without consent it
  continues setup and warns about the limitation. For a non-interactive run,
  pass `--install-uv` to authorize installation.
- At least one tool recognized by BMAD 6.12.4.

Node.js and Python are not installed automatically. No step requires elevated
privileges.

## Install through your AI agent

An alternative to sections 1 and 2: open the project in your tool, in agent
mode (allowed to run terminal commands), and paste the prompt below, replacing
`<ID>` with the ID from the table. The agent runs the same installers this
README describes and asks for your confirmation on the important decisions.

| Tool | Where to paste | `<ID>` |
| --- | --- | --- |
| Claude Code (CLI, VS Code, desktop) | Claude Code chat | `claude-code` |
| Codex (CLI or extension) | Codex chat; approve network access for `git`/`npm` if the sandbox blocks it | `codex` |
| GitHub Copilot (VS Code) | Chat in **Agent** mode | `github-copilot` |
| Cursor | Chat in **Agent** mode | `cursor` |
| Antigravity | Agent chat | `antigravity-cli` |

Using more than one tool in the same project? Separate the IDs with commas,
for example `claude-code,codex`.

```text
Install agentic-stack-template (BMAD + Kent + Alethe) in this project,
following these rules:

1. Prerequisites: show the versions of git, Node.js (20.12+), npm, Python
   (3.10+), and uv. Do not install Node.js or Python; if missing, stop and
   tell me what to install.
2. Global command: ask whether I already have a clone of the template. If so,
   run git pull in it; if not, clone
   https://github.com/JohnnyPessoli/agentic-stack-template.git into a folder
   outside this project. In the clone, run "node scripts/install.mjs --dry-run"
   and then "node scripts/install.mjs". If there are conflicts, show them and
   do not use --force without my confirmation.
3. Project: at the root of this project, run
   node ~/.agentic-stack-template/bin/setup-agentic-stack.mjs --dry-run --tools <ID>
   (in PowerShell, replace ~ with $HOME; do not rely on PATH). Show the result
   and wait for my confirmation. Then run the same command without --dry-run.
4. Do not use --force, --install-uv, --update-bmad, or
   --enable-alethe-everywhere without asking me first. Do not read .env or
   credential files.
5. At the end, show the command summary, git status, and anything I must do
   manually (for example, restarting the session so the skills show up).
```

After installing, **restart the tool's session/window**: new skills load only
when a session starts. When run by an agent, the installer does not change PATH
or enable Alethe's global mode; if you want the `setup-agentic-stack` command
in your terminal, run the global installer yourself (section 1).

To **update** a project that already uses the template, paste:

```text
Update agentic-stack-template in this project: ask me where my clone of the
template is (if I have none, clone
https://github.com/JohnnyPessoli/agentic-stack-template.git outside this
project), run git pull in it, and run "node scripts/install.mjs". Then, at the
root of this project, run
node ~/.agentic-stack-template/bin/setup-agentic-stack.mjs --dry-run
(in PowerShell, replace ~ with $HOME). If it does not detect the tools, use
--tools with the IDs listed under "ides:" in _bmad/_config/manifest.yaml. Show
the result, wait for my confirmation, and run it without --dry-run. Do not use
--force or other authorization flags without asking me. At the end, show the
summary and git status.
```

## 1. Install the global command

Clone this repository and use the installer for your terminal:

```sh
git clone https://github.com/JohnnyPessoli/agentic-stack-template.git
cd agentic-stack-template
```

### PowerShell

```powershell
.\install.ps1
```

If your local execution policy blocks the script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

### Command Prompt (CMD)

```bat
install.cmd
```

### Git Bash, macOS, or Linux

```sh
./install.sh
```

On Git Bash, you can also run `bash ./install.sh`.

The installer copies managed files to `~/.agentic-stack-template` and command
wrappers to `~/.local/bin` (under your Windows user profile on Windows). It
asks before adding that directory to your `PATH`. If you decline, the wrappers
remain installed and the installer prints shell-specific manual instructions.
Reopen your terminal after accepting a PATH change.

Global installer options:

```text
--dry-run   List operations without writing files or changing PATH
--force     Replace conflicts only in template-managed files
--help      Show help
```

Repeated installs preserve differing files by default. To update managed files
after obtaining a newer repository version:

```sh
git pull
```

Then run the installer again. If it reports conflicts, review them and use
`--force` only when you want to replace those managed files. Unknown files are
not deleted.

## 2. Set up a project

It works for both new projects (an empty folder, with or without Git) and
projects already in progress. Change to the project root, the same folder you
open in your IDE, and run a dry-run first:

```sh
cd path/to/your/project
setup-agentic-stack --dry-run
```

The dry-run shows the detected prerequisites (Node.js, npm, Python, `uv`, Git),
the planned actions, and project warnings. For example, it warns when the
folder is a subdirectory of a Git repository or when the existing BMAD install
has no integration for a selected tool.

Then run setup:

```sh
setup-agentic-stack
```

If no supported tool is detected, select one explicitly:

```sh
setup-agentic-stack --tools codex
setup-agentic-stack --target "C:\Projects\my app" --tools claude-code,github-copilot
```

Accepted IDs: `antigravity-cli`, `claude-code`, `codex`, `cursor`, and
`github-copilot`. Detection checks limited signals in the project and user
profile:

| Tool | Detection signals |
| --- | --- |
| Antigravity CLI | `agy`/`antigravity` executable or `~/.gemini/antigravity` |
| Claude Code | `claude` executable or `.claude` directory in the project/profile |
| Codex | `codex` executable or `.codex` directory in the project/profile |
| Cursor | `cursor` executable, `.cursor`, or `.cursorrules` |
| GitHub Copilot | `.github/copilot-instructions.md`, `.github/agents`, detected VS Code Copilot extension, or extension reference in `.vscode/extensions.json` |

If these signals do not match your setup, pass `--tools` explicitly. This
overrides detection; it does not install an IDE.

### What setup does

1. **BMAD:** on a fresh project, installs stable `bmad-method@6.12.4`, module
   `bmm`, with Portuguese communication and document defaults. The skill count
   depends on the version and tool; no fixed count is promised.
2. **Existing BMAD:** `_bmad/` is preserved without an update by default. The
   summary reports the version, modules, and tools in its manifest when
   available. To explicitly request the official update:

   ```sh
   setup-agentic-stack --update-bmad
   ```

   This uses BMAD 6.12.4's official `update --yes` action without supplying a
   replacement module or tool list. BMAD applies its upstream policy to
   installed modules; review its output. `--force` does not update BMAD.

   If you select a tool that the existing BMAD manifest does not list, Kent
   and Alethe are copied for it, but BMAD skills are not. The command warns
   and points to the official interactive installer
   (`npx bmad-method@6.12.4 install`) to add the integration, because
   `--update-bmad` keeps the tool list unchanged.
3. **Customizations:** copies generic Winston, Amelia, and John overrides to
   `_bmad/custom/`, plus the Kent skill to the selected tool's skill directory.
   Conflicts are preserved by default. `--force` replaces only conflicting
   template files and does not delete extra files.
4. **Alethe:** fetches the pinned revision from its public repository and
   copies only `skills/alethe` into the selected tool directories. Alethe
   source files are not vendored in this repository.
5. **Global Alethe mode:** after installing the skill, the command asks for
   separate consent to enable Alethe in every project and add the BMAD rule.
   Declining keeps the local skill installation and leaves global settings
   unchanged.
6. **Project instructions:** writes the BMAD + Alethe block to `AGENTS.md`
   (Codex, Cursor, GitHub Copilot, Antigravity) and/or `CLAUDE.md` (Claude
   Code). See [Alethe as the default entry point](#alethe-as-the-default-entry-point).

## Command options

```text
--target <directory>          Use an explicit project target
--tools <list>                Override detection; comma-separated tool IDs
--dry-run                     List operations without downloads, writes, or global changes
--force                       Replace conflicts in template files
--install-uv                  Authorize the official uv installer without a prompt
--update-bmad                 Update existing BMAD through the pinned official action
--skip-alethe                 Do not install Alethe or change its global mode
--enable-alethe-everywhere    Authorize global activation without a prompt
--skip-agent-instructions     Do not create or change the block in AGENTS.md/CLAUDE.md
--help                        Show help
```

`--skip-alethe` and `--enable-alethe-everywhere` cannot be used together.
Non-interactive runs do not imply consent to install `uv` or enable global
Alethe mode. `--install-uv` and `--enable-alethe-everywhere` are explicit
authorization for those actions.

The target must exist, be a directory, and must not be a filesystem/volume
root. The command does not read `.env`, credentials, or personal customization
files. Template writes preserve conflicts. Symbolic links and junctions are
accepted only when they point to a directory inside the project itself, such
as `.claude/skills` → `.agents/skills`; links leaving the project and
incompatible paths are rejected for safety. Concurrent setup runs against the
same project are serialized with a temporary lock. A lock left by an
interrupted run is reclaimed automatically once its owning process is gone.

## Alethe as the default entry point

### Project instruction block

Alethe and BMAD are tied together by a managed block written at the project
root, in the file each tool always reads:

| Tool | File |
| --- | --- |
| Codex, Cursor, GitHub Copilot, Antigravity | `AGENTS.md` |
| Claude Code | `CLAUDE.md` |

The block content is in Portuguese (the stack's configured language); see the
[Portuguese README](README.md#bloco-de-instruções-do-projeto) for the exact
text. In short: act as lead with the `alethe` skill and choose direct work or
delegation; use relevant BMAD workflows/personas without requiring the person
to name them; follow Kent (`bmad-agent-tdd`) for tests.

- A missing file is created with only the block; an existing file gets the
  block appended, and nothing outside the markers changes. LF/CRLF is kept.
- `--skip-alethe` writes the block without the Alethe line.
  `--skip-agent-instructions` leaves these files untouched.
- Updates follow the same rules as other template files: an unedited block is
  updated automatically; an edited block is preserved and the new version goes
  to `AGENTS.md.new`/`CLAUDE.md.new`; `--force` replaces only the block.
- If you delete the block, later runs do not add it back (use `--force` if you
  change your mind).
- Commit `AGENTS.md`/`CLAUDE.md` with the project.

The block is an instruction for the model, not a guarantee. To invoke Alethe
explicitly: `/alethe <task>` in Claude Code, Copilot, and Cursor;
`$alethe <task>` in Codex; or, in any tool, “use the alethe skill to …”.

### Global mode (optional)

Alethe's global mode is applied only by tools that run Alethe's hook on every
prompt; this template installs no hooks. The project block is therefore the
primary mechanism. After you opt in, the command uses Alethe's documented
interface equivalent to:

```text
mode on --everywhere --rule "<conditional BMAD instruction>"
```

The rule tells Alethe to use relevant BMAD workflows/personas without requiring
you to name them. For a small or tightly coupled task, Alethe may work directly.
For work that splits into independent units, it may delegate to available CLI
workers and review the results. The rule does not turn workers into BMAD
personas or force a persona to run for every request.

If you decline the prompt, the command prints the complete activation command
using the installed skill path. Run that command with Python 3.9 or newer to
enable Alethe manually.

To disable Alethe only in the current project, use the skill's official CLI:

```text
python "<skill-path>/scripts/orchestrate.py" mode off
```

This disables Alethe only in that project; the global default remains active
elsewhere. The pinned Alethe CLI **cannot remove a single rule**.
`mode off --everywhere` disables the global default by removing the entire
global mode object, including all saved global rules and preferences. Use it
only if you intend to clear that whole state. The installer never runs this
command, never uses `--clear-rules`, and does not edit undocumented global
files. Existing rules are preserved when adding the BMAD rule. If Alethe's
upstream rule limit prevents adding it, setup reports the limitation and does
not clear preferences.

## Worked example

Suppose an existing repository contains a book catalog. After setting it up,
ask:

> I want to export to CSV the books shown after applying the page filters.
> Before implementation, identify the contract decisions and how this project
> tests similar features.

A possible flow—not guaranteed across every IDE/agent—is:

1. Alethe acts as the default lead and reads the task context.
2. If product or architecture decisions are involved, it selects relevant BMAD
   workflows/personas without requiring “John,” “Winston,” or “Amelia” by name.
3. For testable code, Kent discovers the project's runner and existing test
   conventions. Kent does not assume a framework or directory.
4. Alethe decides whether to do the work itself or delegate independent parts
   to available CLI workers. A worker is not treated as a BMAD persona.
5. The lead reviews the result and reports changed files, executed tests,
   decisions, and open questions. Review the changes and commands before
   integrating them.

## Update and removal

### Update the global command

In the template clone:

```sh
git pull
```

Run `install.ps1`, `install.cmd`, or `install.sh` again. The installer plans
every copy before writing: if there is any conflict, no file is changed, so an
install never mixes files from different versions. Review conflicts and use
`--force` only when you want to replace template-managed files. The installer
does not delete unknown files.

If `~/.local/bin` already holds `setup-agentic-stack*` wrappers from another
source, such as earlier personal scripts, they show up as conflicts. Back them
up before using `--force`.

### Update an already configured project

After updating the global command, run it again from the project root:

```sh
setup-agentic-stack --dry-run   # shows what will be updated
setup-agentic-stack
```

Each run writes the template version and the hash of every copied file (Kent,
`_bmad/custom`, and Alethe) to `_bmad/_config/agentic-stack.json`, with no file
contents. Commit that file with the project. On the next run, each file is
handled like this:

| File state in the project | What happens |
| --- | --- |
| Same as the new version | Nothing to do |
| Same as what was installed (not edited) | Updated automatically, no `--force` needed |
| Different from both (edited) | Preserved; the new version is written next to it as `<file>.new` |
| Removed in the new version | Kept and listed in the summary for manual removal |

Kent and Alethe are updated as a whole or not at all: if any file of one of
them was edited, no file in that component changes, so a skill never ends up
half in each version. `_bmad/custom` overrides are independent and are updated
one by one.

To resolve a conflict, compare the file with its `.new`, merge what you want,
and run the command again; the `.new` is removed automatically once the file
matches the new version. To discard your edits and accept everything, use
`--force`.

Projects configured before the registry existed (version 1.0.0 or manual
scripts) have no history: differing files are treated as edited and preserved,
with a `.new` next to them. After you review them once, the registry exists and
later updates are automatic.

### Update projects already using the template

Version 1.2.0 adds the [project instruction block](#project-instruction-block)
that makes Alethe lead and use BMAD without you naming personas. Projects set up
with earlier versions (1.0.0, 1.1.0, or manual scripts) get this change through
the same command, without losing anything (or let your agent do it with the
[update prompt](#install-through-your-ai-agent)):

1. **Update the global command** (once per machine):

   ```sh
   cd path/to/agentic-stack-template
   git pull
   ./install.sh        # or .\install.ps1 / install.cmd
   ```

2. **In each project**, at its root, review and apply:

   ```sh
   setup-agentic-stack --dry-run
   setup-agentic-stack
   ```

   The dry-run prints `Atualização 1.1.0 → 1.2.0` and what will happen to
   `AGENTS.md`/`CLAUDE.md`. If detection does not find the same tools as
   before, pass them with `--tools`; the installed list is under `ides:` in
   `_bmad/_config/manifest.yaml`.

3. **Review and commit** `AGENTS.md`, `CLAUDE.md`, and
   `_bmad/_config/agentic-stack.json` together.

What this update does:

| Project state | Result |
| --- | --- |
| No `AGENTS.md`/`CLAUDE.md` | File created with only the block |
| `AGENTS.md`/`CLAUDE.md` with your own content | Block appended; your content stays intact |
| You already wrote similar guidance | Review the dry-run; use `--skip-agent-instructions` or delete the block afterwards (it will not come back) |
| Kent, `_bmad/custom`, Alethe | Follow the table in the previous section |
| Global Alethe mode already enabled | Unchanged; the rule is not duplicated |

For several projects in a row, run the dry-run first, review the output, then
repeat without `--dry-run`:

```powershell
# PowerShell
foreach ($p in "C:\Projects\app-a", "C:\Projects\app-b") {
  setup-agentic-stack --target $p --dry-run
}
```

```sh
# Git Bash, macOS, or Linux
for p in ~/projects/app-a ~/projects/app-b; do
  setup-agentic-stack --target "$p" --dry-run
done
```

Without `--dry-run`, each project still asks about `uv` and global mode in the
terminal; if global mode is already enabled, just answer “no”. Non-interactive
runs do none of this without the explicit flags.

### Remove the global command

There is no automatic uninstall command that deletes directories without
review. After inspecting/backing up anything you added to the managed folders,
remove only the `setup-agentic-stack*` wrappers from `~/.local/bin` and the
`~/.agentic-stack-template` directory. Also remove the corresponding user
`PATH` entry or shell startup line.

Disabling Alethe in the current project is separate; see above. Do not run
`mode off --everywhere` unless you understand it clears all global mode rules
and preferences, not just the BMAD rule.

### Remove project configuration

There is no automatic project uninstall because BMAD, Alethe, or their
customizations may have been edited after setup. Review and remove only managed
files you recognize, including `_bmad/_config/agentic-stack.json`. The script does not delete `_bmad/`, skill directories,
customizations, or project data. In `AGENTS.md`/`CLAUDE.md`, delete only the
lines from `<!-- agentic-stack:begin` through `<!-- agentic-stack:end -->`
(inclusive), and the file itself if it only held the block.

## Troubleshooting

- **Node/npm missing:** install Node.js 20.12+ from its official distribution
  and reopen the terminal.
- **Python missing or older than 3.10:** BMAD is not reported as installed;
  install a supported version and retry.
- **`uv` missing:** accept the prompt or pass `--install-uv` in a
  non-interactive run. If it is not installed, BMAD may still install, but
  Python-backed BMAD skills/scripts that need `uv` will not work.
- **`uv` installed but not on PATH:** the command also checks the official
  installer's default locations (`~/.local/bin`, `~/.cargo/bin`) and asks you
  to reopen the terminal.
- **Git missing:** Alethe cannot be downloaded; install Git or pass
  `--skip-alethe`.
- **No tool detected:** pass `--tools` with accepted IDs.
- **Alethe already exists:** differing files are preserved. Review them and
  retry with `--force` only if you want to replace skill files.
- **BMAD did not update:** `_bmad/` is not updated without `--update-bmad`.
- **Incomplete or duplicated `agentic-stack` markers:** the instruction file
  is not changed, not even with `--force`. Keep a single begin/end pair (or
  remove both) and run again.
- **The agent ignores the block:** make sure the project root is the open
  workspace and invoke Alethe explicitly with `/alethe` or `$alethe`.
- **Conflict or symbolic path:** the command reports the path and will not
  follow symlinks out of the project. Junctions between the project's own
  skill folders are accepted.
- **Existing lock:** another setup is running. Locks from interrupted runs are
  released automatically; if the error persists, confirm no setup is active
  before removing the file named in the error.
- **Repository subdirectory:** the warning means IDEs may not read skills from
  that folder; run from the workspace root or pass `--target`.
- **Alethe already has eight rules:** upstream limits the count to eight. This
  template does not clear or replace rules; resolve the limit through Alethe's
  documented interface before retrying.
- **Command not found after install:** open a new terminal or add `~/.local/bin`
  to `PATH` using the installer instructions.

## Limits, privacy, and licenses

- BMAD, Alethe, and `uv` are independent dependencies with their own licenses
  and release cycles. See [third-party notices](THIRD_PARTY_NOTICES.md).
- Alethe is fetched at setup from a pinned commit. BMAD runs as the pinned npm
  package `6.12.4`; the template does not update it without `--update-bmad`.
- CLI workers may use external services and incur usage/quota according to your
  account and configuration. Check the provider before delegating sensitive
  work.
- The installer collects no telemetry, does not read `.env`, and does not copy
  credentials, personal policies, private settings, or project content.
- Tool detection, persona availability, and skill loading vary by IDE. This
  template does not guarantee security, correctness, result quality, upstream
  endorsement, or a fixed number of skills.
- This is an independent project and is not affiliated with or endorsed by the
  BMAD, Alethe, or uv maintainers. Their names belong to their respective
  owners.

## Development and validation

This repository uses only built-in Node.js APIs:

```sh
npm test
npm run check
```

Unit tests do not run external installers. CI runs on Windows, macOS, and Linux;
support for each platform is claimed only when its corresponding job passes.

## License

The template is [MIT licensed](LICENSE). This does not replace the licenses of
external dependencies.
