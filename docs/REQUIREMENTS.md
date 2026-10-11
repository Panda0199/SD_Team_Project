# Requirements

## Functional requirements
FR1. ...
FR2. ...

## Non-functional requirements
- Performance: first screen usable within 2 s on a 4G phone
- Accessibility: keyboard navigation works, axe reports no serious issues
- Security: if the app has a database, Row Level Security is on for every table and one test user cannot see another user's private records. If the app has no database, write why this check does not apply.
- Privacy: no real personal data in the database or the repository; usability testers give consent
- Availability: the dev URL is up during class hours; a failed deploy is rolled back the same day

## User stories
Write at least eight. Each one has acceptance criteria the agent can turn into a Playwright test.

### S1 · [Title]
As a [persona], I want [action], so that [benefit].

Acceptance criteria
- Given [starting state], when [action], then [observable result]
- Given ..., when ..., then ...

Status: todo · PR: [link]

### S2 · ...

## Events (from event storming)
Past-tense events in order, with the command that triggers each and the external systems involved.

## Milestones
Five milestones. Each one becomes an epic on your board. Change the dates only if you agree it with the teacher.

| # | Date | What is true on that date |
|---|---|---|
| 1 | 28.09.2026, session 4 | The start page is live on the dev URL |
| 2 | 12.10.2026, session 6 | The first story works on the dev URL |
| 3 | 19.10.2026, session 7 | One user task has an automated test |
| 4 | 09.11.2026, session 10 | v1 demo to the class |
| 5 | before 23.11.2026, session 12 | v2 with changes from client feedback |
