# Quickly

When a university student is waiting on an instructor's answer to a course question but replies on Moodle or email take around 12 hours, Quickly summarizes long questions, converts between text and voice, and lets the instructor answer without opening email or Moodle, so that average response time goes from 12 hours to 2 hours.

| | |
|---|---|
| Team | Anik Joy, Delivery Lead · Tanzirul, Product and Quality Lead |
| Dev URL | https://quickly-mainor.netlify.app/ |
| Board | https://github.com/users/Panda0199/projects/2 |
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
1. date to be agreed: Requirements gate (G2) closed
2. date to be agreed: Core messaging live
3. date to be agreed: AI layer live
4. date to be agreed: Automated coverage (G3 prep)
5. date to be agreed: Pilot-ready release

## Agent-ready
The product exposes one MCP tool in `mcp/server.ts`. Register it in your agent with `.vscode/mcp.json` (Copilot) or `.mcp.json` (Claude Code). Cline stores MCP servers per machine, so add it once in the Cline settings panel.

## Gates
Run the prompt in `docs/GATE-REPORT-PROMPT.md` with your agent before every Moodle submission. The output is `docs/GATE-REPORT.md`.
