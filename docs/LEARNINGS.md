# Learnings

Append three lines at the end of every session. Never rewrite earlier entries.

## Session 1 · 7 Sep
- What worked:
- What did not:
- What we change next week:

## Session · 21 Oct 2026
- What worked: deterministic local AI-demo outputs can be shown separately without changing conversation messages.
- What did not: derived content needs explicit demo labels and separate tests to prevent confusion with human messages.
- What we change next week: assess real AI and audio requirements separately before selecting any provider or service.

## Session · 21 Oct 2026 · Summary quality
- What worked: extracting question clauses and understood context gives a more useful local summary than an opening excerpt.
- What did not: relative clauses can resemble question clauses, so deterministic extraction needs sentence-context checks.
- What we change next week: test summary phrasing against a broader set of fictional student questions.

## Session · 21 Oct 2026 · G7 browser finding
- What worked: Playwright browser testing found a bug in the instructor read flow for a conversation with multiple student questions; expected behavior is that every unanswered question becomes Seen.
- What did not: reproducing two student questions and opening the thread as Instructor showed only the latest message became Seen; earlier unanswered messages stayed Sent.
- What we changed: `markConversationSeen` now marks all Sent student messages Seen. Regression coverage is in `src/lib/inbox.test.ts` and `tests/e2e/student-messaging.spec.ts`.
