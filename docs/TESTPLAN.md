# Test plan

## Current automated evidence

- Latest successful main CI run: [GitHub Actions run 39587965224](https://github.com/Panda0199/SD_Team_Project/actions/runs/39587965224)
- CI result: `main` branch, successful, Playwright Chromium, 12 tests passed.
- Unit result: `npm test`, 14 tests passed.
- [End-to-end test folder](https://github.com/Panda0199/SD_Team_Project/tree/main/tests/e2e)

| Story | End-to-end test file | Unit tests | Status |
|---|---|---|---|
| Student opens a course conversation and sends a course-tagged question | `tests/e2e/student-messaging.spec.ts` — “student opens a course conversation and sends a tagged question” | `src/lib/inbox.test.ts` — “creates a course-tagged student message in Sent state” | Passed in CI |
| Student can see Sent, Seen, and Replied conversation states | `tests/e2e/student-messaging.spec.ts` — “student can see Sent, Seen, and Replied conversation states” | `src/lib/inbox.test.ts` — “provides fictional course conversations with visible message statuses”; “shares messages between demo roles and limits the TA to assigned courses” | Passed in CI |
| Student message becomes an instructor notification and the instructor reply returns to the student | `tests/e2e/student-messaging.spec.ts` — “student message becomes an instructor notification and reply returns to the student” | `src/lib/inbox.test.ts` — “shares messages between demo roles and limits the TA to assigned courses” | Passed in CI |
| Availability, urgent flag, resolution, filters, search, and mobile composer | `tests/e2e/student-messaging.spec.ts` — “away availability and the two-hour urgent flag are visible to students”; “conversation can be resolved with its history still readable”; “changing conversation filters clears a selection that may not match”; “student can search by course, instructor, or message keyword”; “mobile composer and send action remain within the viewport” | `src/lib/inbox.test.ts` — “flags an unanswered conversation only after two hours”; “resolves a conversation without removing its message history”; “filters by active or resolved and searches course, instructor, and message text” | Passed in CI |
| Admin demo profiles/course groups, role assignment, and EN/ET labels | `tests/e2e/student-messaging.spec.ts` — “admin-only demo controls create fictional profiles and assigned course groups”; “main interface labels switch between English and Estonian” | `src/lib/inbox.test.ts` — “validates fictional profile/course creation and translates interface labels”; “creates empty per-student course threads and scopes them to assigned demo accounts” | Passed in CI |
| Local AI summary/explanation and voice demo | `tests/e2e/student-messaging.spec.ts` — “local AI demo summaries and explanations preserve human messages and never send automatically” | `src/lib/inbox.test.ts` — “creates local AI demo derivations without changing or sending human messages”; “extracts the question and problem details instead of truncating a long message opening” | Passed in CI |

## How tests are run

- Unit tests: `npm test`
- Playwright Chromium E2E tests: `npm run e2e`
- CI runs on pull requests; the latest successful main run is linked above.

## Scope note

The results above are automated test evidence. They do not claim additional manual testing.
