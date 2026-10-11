# Requirements.md

## Context
When a university student is waiting on an instructor's answer to a course
question but replies on Moodle or email take around 12 hours, our
AI-assisted communication channel summarizes long questions, converts
between text and voice so either side can reply however is easiest, and lets
the instructor see and answer without opening email or logging into Moodle,
so that average response time goes from 12 hours to 2 hours.

Out of scope for now: no voice or video calls, ever — students and
instructors keep using other platforms for that; only AI-generated voice
memos are supported, never a live call. Also out of scope: grading/gradebook
and assignment submission, and course content/file hosting.

Scope: universities first. A later schools phase would add child-privacy and
parental-consent requirements, not covered here.

Stack: Supabase (database), Netlify (hosting/dev URL), open-source AI
models/tools only for now (provider and cost undecided). Languages: English
and Estonian.

---

## 1. Functional requirements

1. A student or instructor logs in with a university-issued ID and password
   before accessing any course conversation.
2. A student can compose and send a message tagged to a specific course (and
   optionally an assignment) to the course instructor.
3. An instructor receives an in-app notification when a new message arrives,
   without needing email or Moodle.
4. A message thread shows status: sent, seen, replied.
5. A student is notified when the instructor replies.
6. An instructor can mark a thread as resolved.
7. A teaching assistant can be looped into a thread, turning it into a group
   chat with the student and instructor; the TA gets student-level
   permissions in that chat.
8. An instructor can set an availability status (available/away), visible to
   students before they send a message.
9. A student can search past message threads by course or keyword.
10. If a message goes unanswered for 2 hours, the student can flag it as
    urgent.
11. A long student message is condensed by AI into a short note for the
    instructor; the original message stays visible beside the note.
12. A student or instructor can send a voice memo: a typed message can be
    delivered as an AI-generated voice memo, and a recorded voice memo is
    delivered as AI-generated text. Raw audio is never sent directly between
    users and is discarded immediately after transcription.
13. A short text or voice reply from an instructor is described in more
    detail by AI for the student; the description is saved in the
    conversation next to the original reply.
14. Every AI-generated summary, transcript, or description is visibly
    labeled as AI and shown beside the original it was derived from.
15. The app's interface and core tasks work in both English and Estonian.
16. Each institution has two admin accounts. An admin can create teacher
    profiles, student profiles, and course groups.

AI only summarizes, transcribes, and converts format — it never composes or
sends a reply on anyone's behalf. Automatic summaries, transcripts, and
descriptions may post without manual confirmation.

---

## 2. Non-functional requirements

| Category | Target | How we will check it |
|---|---|---|
| Performance | First screen (inbox) usable within 2 seconds on 4G. | Chrome DevTools "Fast 4G" throttling profile, tested on a team laptop against the Netlify dev URL; record Time to Interactive from Lighthouse, with device/browser and date. AI summaries/transcripts load asynchronously after the first screen and are not part of this target. |
| Accessibility | Main tasks (login, compose/send a message, read inbox) work by keyboard only; axe reports 0 serious issues. | Tab through each task with no mouse on both the English and Estonian interface; run axe DevTools on each page; record page, task, language, keyboard result, axe serious-issue count, and date. |
| Security | Row Level Security enabled on every Supabase table; a test user cannot access another user's private records. Login uses university-issued IDs/passwords checked against Supabase Auth. | For each table, sign in as Test User A and attempt to read/write Test User B's records; confirm 0 rows / permission denied. Record table name, RLS status, test result, date. |
| Privacy | 0 real personal-data fields in client records used for the app, prompts, or repository. | Fields stored: name, student ID, course name (see justification below), plus two AI-related items: voice-memo audio (temporary, deleted immediately after transcription) and a derived writing-style profile (backend-only, never shown to users; the raw chat data used to derive it is deleted once the style is extracted). All seed/test data is fictional. Grep the repo for real names/emails before each commit and demo. |
| Availability | Dev URL works during all class hours (every Monday); same-day rollback after a failed deployment. | Visit the dev URL at the start of each Monday class; log status and timestamp. If a deploy breaks the app, roll back to the last working Netlify deploy the same day and log the incident and resolution time. |

Personal-data fields and why the app needs them:
- **Name** — identifies sender/recipient in a thread.
- **Student ID** — matches a message to a course roster/enrollment record.
- **Course name** — routes and tags the message to the right class and instructor.

---

## 3. User stories

### Story 1 — University login
As a student or instructor, I want to log in with my university-issued ID
and password, so that only verified members of my university can access
course conversations.

- Given a student or instructor has university-issued login credentials,
  when they enter their ID and password on the login screen,
  then they are authenticated and taken to their inbox; an incorrect
  ID/password shows an error and does not grant access.

### Story 2 — Ask a tagged question
As a student, I want to send a message tagged to a specific course, so that
my question has context and reaches the right instructor quickly.

- Given a student is enrolled in a course and viewing it in the app,
  when they compose a message and tag it to that course,
  then the message is delivered to the instructor's inbox with the course
  reference attached, and the student sees a "sent" status.

### Story 3 — Instant instructor notification
As an instructor, I want an instant notification when a student messages me,
so that I can respond without checking email or Moodle.

- Given an instructor has notifications enabled in the app,
  when a student sends them a new message,
  then the instructor receives a notification within 10 seconds containing
  sender name, course, and a message preview, with no email or Moodle step
  required.

### Story 4 — Message status visibility
As a student, I want to see whether my message has been read or replied to,
so that I know whether to expect an answer or should follow up.

- Given a student has sent a message to an instructor,
  when the instructor opens and reads it,
  then the student's thread updates to a "seen" state within 10 seconds, and
  if there is no reply after 2 hours, the student is offered an option to
  flag the message as urgent.

### Story 5 — Mark thread resolved
As an instructor, I want to mark a thread resolved, so my inbox only shows
conversations still needing a response.

- Given an instructor is viewing an open thread with a student,
  when the instructor marks the thread as resolved,
  then the thread moves out of the active inbox into a resolved list, and the
  student can still see the full history.

### Story 6 — Reply notification
As a student, I want a notification when my instructor replies, so I don't
have to keep re-checking the app.

- Given a student has an open thread with an instructor,
  when the instructor sends a reply,
  then the student receives a notification within 10 seconds naming the
  course and a preview of the reply.

### Story 7 — Teaching assistant looped in
As an instructor, I want to loop a TA into a thread, so the TA can help
answer without getting full instructor permissions.

- Given an instructor is viewing a thread with a student,
  when the instructor adds a TA to that thread,
  then the thread becomes a group chat with the student, instructor, and TA;
  the TA can view and send messages like a student can, but cannot mark the
  thread resolved or change the instructor's availability status.

### Story 8 — Availability status
As an instructor, I want to set an "available" / "away" status, so students
know whether to expect a fast or delayed reply.

- Given an instructor opens their status control,
  when they set their status to "away",
  then students composing a new message to that instructor see an
  "away, replies may be delayed" notice before sending.

### Story 9 — Search past threads
As a student, I want to search past threads by course or keyword, so I can
find an answer without re-asking.

- Given a student has one or more past message threads,
  when they enter a course name or keyword into the search bar,
  then matching threads are listed, ranked by relevance/recency, within
  2 seconds.

### Story 10 — AI message summary
As an instructor, I want a short AI summary of a long student message, so
that I can get to the point without reading everything.

- Given a student sends a message longer than a short threshold,
  when the instructor opens the thread,
  then the instructor sees a short AI-generated note above the full message,
  labeled as AI, with the original message still visible in full below it.

### Story 11 — Voice memo conversion
As a student or instructor, I want to send a voice memo that the other
person receives as text, or a text message the other person receives as a
voice memo, so that I can communicate however is easiest for me.

- Given a user records a voice memo, or writes a text message and chooses to
  send it as voice,
  when the message is sent,
  then the recipient receives an AI-generated text transcript (or
  AI-generated voice memo) labeled as AI, and the original recording is
  discarded immediately after transcription — no raw audio is ever delivered
  to the other party.

### Story 12 — Teacher reply description
As a student, I want my instructor's short reply described in a bit more
detail by AI, so that a terse text or voice reply is still clear to me.

- Given an instructor sends a short text or voice reply,
  when the message is delivered,
  then an AI-generated description of the reply is saved in the thread next
  to the original reply, labeled as AI.

### Story 13 — AI content labeled
As a student or instructor, I want every AI-generated summary, transcript,
or description to be clearly labeled, so that I always know what a real
person wrote versus what AI produced.

- Given a thread contains any AI-generated content,
  when a user views that thread,
  then each AI-generated item is visually labeled "AI" and displayed next to
  the original message it was derived from.

### Story 14 — Admin account management
As an institution admin, I want to create teacher profiles, student
profiles, and course groups, so that the right people can log in and are
placed in the right courses.

- Given an institution has two admin accounts and an admin is logged in,
  when the admin creates a teacher profile, a student profile, or a course
  group and assigns people to it,
  then the new profile or group is saved, the people can log in and see only
  the course groups they belong to, and a non-admin user cannot access the
  admin screens.

---

## 4. Events

Client task: a student asks a question and gets a timely instructor reply.

1. Command: Create profiles and course group (admin) → Event: Profiles and course group were created.
2. Command: Log in (student or instructor) → Event: User was authenticated.
3. Command: Compose message (student) → Event: Message was composed.
4. Command: Send message (student) → Event: Message was sent.
5. Command: Summarize message (system, on message sent) → Event: Message was summarized.
6. Command: Deliver notification (system, on message sent) → Event: Instructor was notified.
7. Command: Open thread (instructor) → Event: Message was read.
8. Command: Send reply (instructor) → Event: Reply was sent.
9. Command: Describe reply (system, on reply sent) → Event: Reply was described.
10. Command: Deliver notification (system, on reply sent) → Event: Student was notified.
11. Command: Open thread (student) → Event: Reply was read.
12. Command: Mark thread resolved (instructor) → Event: Thread was resolved.

---

## 5. Milestones

1. Requirements gate (G2) closed: functional/non-functional requirements,
   fourteen user stories, events and milestones finalized and posted to
   Moodle.
2. Core messaging live: student-to-instructor tagged messaging, university
   login, and admin account management deployed to the Netlify dev URL with
   Row Level Security enabled on all Supabase tables.
3. AI layer live: message summarization, voice-memo conversion, and reply
   description shipped using open-source models, with all AI content
   labeled; keyboard and axe accessibility checks pass on core pages in both
   English and Estonian.
4. Automated coverage (G3 prep): Playwright tests written for all fourteen
   stories and passing.
5. Pilot-ready release: privacy check passed (fictional data only; voice
   audio discarded after transcription; derived style data backend-only),
   dated availability logs show no unresolved downtime across class hours,
   ready to pilot with a real course section.
