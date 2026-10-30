# Decisions

Append one entry per decision that changes the stack, the scope or the process.

## 2026-09-28 · Stack
Kept the template default (Vite, React, TypeScript, Supabase, Vercel). Reason: deploys in one session, no card needed.

## 12.10.2026 · Hosting and tooling
Tools chosen are VS Code, GitHub Copilot as the coding agent, GitHub, and Netlify for hosting instead of the template's Vercel, because the team chose Netlify. Supabase was added later; see the 2026-10-21 entry.

## 2026-10-21 · Supabase backend MVP
Added Supabase Auth and Postgres persistence because student/instructor conversations, course assignments, and roles need to persist across accounts and sessions. The browser uses only the public publishable key; RLS enforces user/course access. Email/password accounts are created in Supabase Auth, and an Admin adds profile metadata for an existing Auth user. No service-role key or Edge Function is used.
