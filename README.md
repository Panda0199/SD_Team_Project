# [Product name]

[One-sentence product statement from docs/PRODUCT.md]

| | |
|---|---|
| Team | [Name, role] · [Name, role] · [Name, role] |
| Dev URL | [https://...] |
| Board | [https://...] |
| Course | PR-520 Software Development Team Project, EEK, 2026/27 |

**First time here? Follow [docs/SETUP.md](docs/SETUP.md) step by step.**

## Run locally
```bash
npm install                     # once, and after anyone adds a package
npm run dev                     # open http://localhost:5173
npm test                        # unit tests
npx playwright install chromium # once, before the first browser test
npm run e2e                     # browser tests
npm run a11y                    # accessibility check (session 9)
```

## Milestones
Copy these from docs/REQUIREMENTS.md. Each milestone is one epic on your board.
1. 28.09 (session 4): the start page is live on the dev URL
2. 12.10 (session 6): the first story works on the dev URL
3. 19.10 (session 7): one user task has an automated test
4. 09.11 (session 10): v1 demo to the class
5. Before 23.11 (session 12): v2 with changes from client feedback

## Agent-ready
The product exposes one MCP tool in `mcp/server.ts`. Register it in your agent with `.vscode/mcp.json` (Copilot) or `.mcp.json` (Claude Code). Cline stores MCP servers per machine, so add it once in the Cline settings panel.

## Gates
Run the prompt in `docs/GATE-REPORT-PROMPT.md` with your agent before every Moodle submission. The output is `docs/GATE-REPORT.md`.
