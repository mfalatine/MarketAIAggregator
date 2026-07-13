# Local CLI execution design

## Objective

Allow a user to choose, per profile or per run, between the existing cloud API providers and a DAI-style local server that invokes already-authenticated Codex or Claude CLIs.

## User contract

| Method | Authentication | Where it works | Billing display |
|---|---|---|---|
| Cloud APIs | Provider API key or OpenAI relay token | Local and hosted | Estimated API cost |
| Local CLI server | Existing Codex or Claude CLI login | Local server only | Active plan usage |

There is no silent fallback between methods. History records `transport`, `modelId`, and the CLI authentication method used for the run. Regeneration preserves the original transport.

## Runtime flow

```text
Browser profile/run switch
        |
        +-- api --> js/providers.js --> provider API / OpenAI relay
        |
        +-- cli --> POST /local/cli/generate
                         |
                         +-- allowlisted model lookup
                         +-- executable and login check
                         +-- isolated temporary workspace
                         +-- strict output schema
                         +-- prompt over stdin
                         +-- Codex or Claude subprocess
                         +-- validated briefing + source URLs
                         +-- existing client normalization/history
```

## DAI patterns reused

- Resolve the real executable instead of assuming the PowerShell shim will launch.
- Prefer `codex.cmd` on Windows and invoke `.cmd`/`.bat` through the command shell.
- Send the complete prompt through stdin so quoting and long structured prompts remain reliable.
- Use stateless, short-lived subprocesses and capture stdout/stderr.
- Keep a registry of selectable models outside the process-launch logic.

The DAI runner/reviewer state machine is not reused because this application is a research generator, not a coding controller. Codex deliberately reuses DAI's `--full-auto` invocation so both projects share the same proven launch path; isolation comes from the empty temporary workspace, not from a read-only sandbox.

## Safety controls

- Server binds to `127.0.0.1`.
- Cross-origin browser generation requests are rejected.
- Browser input cannot specify executables, arguments, working directories, or tools.
- Model IDs come from `js/cli-models.js` only.
- Prompts are size-limited and sent only through stdin.
- Codex uses DAI-style `exec --full-auto --skip-git-repo-check` in an empty temporary workspace; any writes are confined to that workspace, which is deleted in `finally` cleanup.
- Claude uses `--no-session-persistence` with only `WebSearch,WebFetch`.
- Each engine permits one active generation at a time.
- Cancellation kills the process tree.
- Runtime, stdout, and stderr limits fail closed.
- Temporary workspaces are removed in `finally` cleanup.
- Only sanitized authentication summaries are returned; credentials and account identifiers never reach the browser.
- Confirmed CLI claims without a valid retrieved URL are downgraded to low-confidence interpretation.

## Verification contract

- Static semantic/accessibility checks.
- Unit coverage for both CLI command builders and output parsers.
- Tests proving prompts use stdin and no arbitrary argument can be injected.
- Tests for unsafe URL rejection and unsupported-claim downgrade.
- Provider-level test proving CLI mode does not send an API credential.
- DOM integration test proving a CLI profile can generate and persist history.
- Live status check for installed/authenticated Codex and Claude.
- HTTP tests for the application shell, status route, and cross-origin rejection.
- One real structured generation through each installed CLI.
- Browser interaction test for the switch, model list, status language, billing language, and Connections screen.
