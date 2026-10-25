# Design: agentic-stack-template

Date: 2026-10-25

## Goal

Create a public, portable repository that lets a developer install a reusable
agentic development stack into an existing project with one command. The
repository is a standalone project under
`C:\Users\johnn.JOHNNYPESSOLI\Documents\Projetos\agentic-stack-template`; it
does not change the NF Simplifica application or its documentation.

The repository will be published publicly as
`JohnnyPessoli/agentic-stack-template` under the MIT License. The primary
documentation will be in Brazilian Portuguese, with a corresponding English
guide.

## Alternatives considered

1. **GitHub repository with cross-platform installers (selected):** users clone
   the repository, install a small global command, then invoke
   `setup-agentic-stack` in each target project. This keeps the distribution
   source on GitHub and avoids maintaining a separate package registry.
2. **npm package invoked with `npx`:** shorter first-time setup, but adds
   package publication and release maintenance.
3. **Copyable project template:** simplest implementation, but does not provide
   the requested reusable global command.

## Repository contents

- Cross-platform setup and installation entrypoints for PowerShell, CMD, Git
  Bash, macOS and Linux.
- Generic BMAD customizations for Winston (architecture), Amelia (development),
  John (product management), and Kent (TDD), adapted from the user's templates.
- Portuguese and English documentation, an MIT license, attribution, and
  automated validation.
- No Vendox-specific business rules, project-specific test counts, local
  `config.user.toml`, credentials, personal security policies, or vendored
  Alethe files.

BMAD and Alethe remain external projects. The template will install the stable
`bmad-method` version `6.12.4` and the Alethe skill from
`Kc1t/alethe-orchestrate-skill`. Their respective upstream licenses and
attribution will be documented separately from this repository's license.
The Alethe source repository declares MIT. The exact BMAD command flags and
the Alethe installer behavior must be verified against the pinned versions
before the setup command is finalized.

## User flows

### Install the global command

1. Install the documented prerequisites, including Git and a supported Node.js
   version.
2. Clone `JohnnyPessoli/agentic-stack-template`.
3. Run the operating-system-specific installer.
4. The installer places the command and its required template files in the
   user's local installation directory. It asks before changing the user's
   PATH; if declined, it prints shell-specific manual instructions.
5. Run `setup-agentic-stack` from any target project, or pass an explicit
   project directory.

Installation warns about existing files and preserves them by default. An
explicit force option is required to replace conflicting files. Re-running an
installation should be safe and should not create duplicate configuration.

### Configure a target project

1. Detect supported IDE integrations already present in the project or user
   environment. Configure detected integrations only; allow explicit tool
   selection through `--tools`.
2. Check for `uv`. Ask before invoking its official installer; non-interactive
   runs require `--install-uv`. Do not request administrator privileges.
3. Run the BMAD stable installer at version `6.12.4`, with Portuguese as the
   default communication and document language.
4. Apply the generic persona customizations and Kent TDD skill without
   overwriting existing files unless the user supplies the force option.
5. Install Alethe by default from its upstream public repository. Support
   `--skip-alethe` for users who do not want it.
6. Report completed steps, skipped steps, and failures separately. A failed
   external installation must not be reported as a successful setup.

The setup command will support a dry run that lists intended filesystem
changes without installing tools or changing files.

## Documentation requirements

The documentation must be actionable for a developer who has never used this
repository. It will include:

- A prerequisite checklist and a first-time installation walkthrough for
  PowerShell, CMD, Git Bash, macOS and Linux.
- Exact clone, install, PATH-consent, update and uninstall instructions.
- A complete reference for command options, defaults, tool detection,
  overrides, dry run, conflict handling, `--force`, `--install-uv` and
  `--skip-alethe`.
- A worked use case: prepare an existing application repository, use the
  architecture/product/development personas to refine a change, use Kent to
  discover and follow the project's existing test conventions, and optionally
  ask Alethe to orchestrate suitable independent work. The example must use
  synthetic project details and must distinguish upstream tool behavior from
  this template's behavior.
- Troubleshooting for missing prerequisites, unsupported IDE detection,
  PATH configuration, network/package installation failures, existing files,
  and removal or upgrade.
- Clear statements that external tools have their own licenses, version
  lifecycles and capabilities, and that the template does not guarantee
  security, correctness, or a fixed number of BMAD skills.

## Safety and error handling

- Keep all installations in the invoking user's context; do not elevate
  privileges.
- Do not collect or transmit secrets. Do not read or copy user credentials,
  project `.env` files, or local personal customization files.
- Identify external sources and pinned versions before invoking their
  installers.
- Preserve conflicts by default; provide `--dry-run` and an explicit
  replacement option.
- Propagate non-zero status for failed required steps and show remediation
  instructions in Portuguese by default.
- Do not alter the user's existing global scripts or template during repository
  creation. Installation into the user's home directory is a separate,
  explicit user action.

## Validation strategy

- Add automated tests for option parsing, target resolution, tool selection,
  conflict handling, dry-run behavior, and failure reporting. Unit tests must
  not invoke external installers.
- Add GitHub Actions checks on Windows, macOS and Linux. Use temporary fixture
  projects and verify generated files and exit statuses.
- Run a controlled end-to-end smoke test on the available Windows environment.
  Verify cross-platform support only through passing CI on each supported
  operating system.
- Check documentation links, command examples, license/attribution, and
  absence of Vendox-specific content or secrets before publication.

## Acceptance criteria

1. A fresh public clone can install the global command using the documented
   path for each supported OS.
2. The command targets the current working directory by default and accepts an
   explicit target directory.
3. BMAD uses the pinned stable version and Portuguese defaults; detected tools
   are configured, with a documented manual override.
4. Alethe is installed from upstream by default and can be skipped; its source
   files are not vendored in this repository.
5. Existing project files are preserved unless the user explicitly requests
   replacement.
6. Missing `uv` causes a consent prompt or a clear non-interactive error unless
   `--install-uv` is passed.
7. Portuguese and English documentation include the complete step-by-step
   walkthrough and a realistic, synthetic worked example.
8. Automated checks pass on Windows, macOS and Linux before the repository
   claims support for those systems.
9. No Vendox-specific rules, personal policies, local overrides, or secrets
   are present in the public repository.

## Decisions that remain to verify during implementation

- The exact language and tool-selection flags supported by
  `bmad-method@6.12.4`.
- The exact non-interactive install syntax and target paths supported by the
  upstream skills installer for the Alethe skill.
- Cross-platform detection signals for each BMAD-supported tool, especially
  integrations without a command-line executable.
