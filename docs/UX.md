# UX specification

## Prototype

- Prototype tool: deployed Quickly web application.
- Prototype link: https://quickly-mainor.netlify.app
- Quickly is a mobile-first web application designed primarily for use in a mobile browser, with a responsive layout for larger screens.
- The current prototype uses fictional in-memory demo data. It has no real sign-in, backend persistence, or secure role permissions.
- The role selector switches between Student, Instructor, Teaching Assistant, and Admin demo views. It is a demonstration control, not authentication.

## Current v1 screens

### Student inbox

- Shows course-based conversations with the instructor, latest message preview, time, and status labels such as Sent, Seen, Replied, and Resolved.
- Search filters conversations by course, instructor, or message text.
- Active and Resolved filters separate open conversations from resolved history.
- A Demo account selector chooses the fictional student account and its assigned course conversations.
- The inbox can be used independently from the conversation pane; selecting a course opens its thread.

### Student conversation

- The header shows the course, instructor, instructor availability, and an Away notice when replies may be delayed.
- The message history keeps student and instructor/TA messages visible with status information.
- The composer is tagged to the selected course and sends the student's question to that course thread.
- For an unanswered conversation waiting over two hours, the student can flag it as urgent; an Urgent label indicates the follow-up.
- A sufficiently long student message can have a separate deterministic local summary labeled “AI summary · Demo”; the original message remains visible.
- “Explain simply” can show a separate local explanation labeled “AI explanation · Demo” for an instructor or TA reply.
- “Voice message demo” displays a fictional transcript labeled “Transcript · Demo”. No real audio is recorded or uploaded, and the preview does not send a message.

### Instructor inbox and conversation

- The inbox lists assigned student conversations with the student, course, latest message preview, and conversation status. New student questions appear as unread/new conversation notifications in the demo.
- Opening a thread marks the student message as seen in the shared demo state.
- The conversation shows the student, course, and message history. The instructor can reply; the reply appears in the same thread and the student view shows the reply state.
- Long student messages may show a separate local “AI summary · Demo”; the full original message remains available. AI does not compose or send replies.
- The instructor can mark an active conversation as resolved. Its history remains readable under the Resolved filter.
- Instructor availability is shown to students in the conversation header as Available or Away. Away indicates that replies may be delayed.
- The voice-message preview is demo-only and does not record, upload, or send audio.

### Teaching Assistant view

- The TA inbox shows only course conversations assigned to that fictional TA. The interface explains that other course conversations are unavailable in this demo.
- The TA can open an allowed conversation, read its history, and reply; the sender is identified in the thread.
- This is a local demonstration of expected course scoping, not real authentication or security enforcement.

### Admin view

- The separate Admin demo view lists fictional Student, Instructor, and Teaching Assistant profiles.
- The profile form creates a fictional profile from a display name, fictional demo ID, and profile type.
- The course group form creates a course and assigns an Instructor and Students, with an optional Teaching Assistant.
- Created course groups appear in the Admin list and are reflected in assigned demo views during the current app session.
- Admin management is shown only in the Admin demo view. These controls and assignments do not create real accounts, permissions, or persistent records.

### English and Estonian

- The EN / ET language switch is available across the demo roles and changes the main interface labels.
- User-created names, course names, and message content remain as entered; they are not automatically translated.

## Main flow

1. Student selects a course conversation from the Student inbox.
2. Student reads the existing messages in the conversation.
3. Student writes a course-related question in the course-tagged composer.
4. Student sends the question.
5. The conversation shows Sent.
6. Instructor sees the student message, course, and message preview as a notification in the Instructor inbox.
7. Instructor opens the conversation; the message is marked Seen, and the instructor replies.
8. Student sees the instructor reply and the Replied status.
9. Conversation may later be resolved; its history remains available in the Resolved view.

## Usability test plan

Use the deployed prototype for each task. Ask participants to think aloud and record only what they do and say without recording their names. Results below record the two anonymous tests completed.

### Consent script

Read this before starting each test:

“I am testing the design of our course project. You cannot do anything wrong. I will write down what you do and say, but I will not write your name. You can stop at any time. Is that OK?”

### Tasks

1. Open Research Methods and find the existing conversation.
2. Send a short academic question to the instructor.
3. Find a resolved conversation and switch the interface language between English and Estonian.

## Participant A

- Consent: Yes
- Task 1 result: Opened Research Methods and found the conversation successfully.
- Task 2 result: Asked a question to the instructor successfully.
- Task 3 result: Opened a recently resolved conversation and changed the interface from English to Estonian successfully.
- Observed difficulty: None reported. The participant said the flow was smooth and nothing felt confusing.
- Quote (only with consent): “Nothing felt confusing.”
- Possible change: No necessary change was suggested. The participant said the prototype felt good overall.

## Participant B

- Consent: Yes
- Task 1 result: Not provided in the test notes.
- Task 2 result: Not provided in the test notes.
- Task 3 result: Not provided in the test notes.
- Observed difficulty: The participant was unsure whether the system was processing, waiting for the instructor, or had stopped working while waiting for a response. They also suggested selectable Course, Teacher, and Instructor options rather than requiring users to type these terms manually, and wanted clearer feedback when a reply arrives. Actual network or backend latency was not tested.
- Quote (only with consent): “The delay in response creates uncertainty about whether the system froze, crashed, or was still processing your request.”
- Possible change: Show clearer waiting and reply status, provide selectable Course / Teacher / Instructor options, and make new replies more noticeable.

## Changes after testing

1. Added a visible “Waiting for reply” status after a student sends a question. The note says this is demo status only and no server request is processing. This responds to Participant B's uncertainty about whether the app was still working or waiting for an instructor.
2. Added a “Search by” selector for All fields, Course, and Teacher / Instructor while keeping text search. This responds to Participant B's request for selectable Course, Teacher, and Instructor options rather than typing the category manually.
3. Made the Student inbox “New reply” badge more noticeable and clear it when the student opens the conversation. This responds to Participant B's request for clearer feedback when a reply arrives and less uncertainty while waiting.
