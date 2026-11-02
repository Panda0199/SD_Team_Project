# Validation

## Usability test with the client (session 9)
Participant role, date, three tasks, outcome per task, three quotes, three changes.

## Non-functional report
| Check | Tool | Result | Fix |
|---|---|---|---|
| Performance | Lighthouse | | |
| Accessibility | axe (@axe-core/playwright) | | |
| Dependencies | npm audit | | |
| Data protection | Supabase RLS review | | |

## Cross-user RLS validation

Tested against the live Supabase project using fictional users. Authenticated as Jordan Doe (student), the test attempted to read unrelated data belonging to fictional student Test Two. Temporary test data was created and removed during the SQL test; temporary fixture data was cleaned up after the test.

| Check | Visible rows |
|---|---:|
| Profiles — other student | 0 |
| Courses — unrelated course | 0 |
| Course enrollments — other student | 0 |
| Conversations — other student | 0 |
| Messages — other student | 0 |
| Institutions — other institution | 0 |
| Positive control — own profile | 1 |
| Positive control — own institution | 1 |

**Conclusion:** RLS prevented access to unrelated cross-user data across all tested tables while allowing the authenticated student to access their own permitted data.
