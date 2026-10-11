// Tells the start page whether the team has connected a database.
// A database is optional in this course. Most teams add one later, when a story needs to save data.
export type DatabaseStatus = 'connected' | 'not-connected'

export function databaseStatus(url: string | undefined, key: string | undefined): DatabaseStatus {
  const filled = (value: string | undefined) =>
    Boolean(value && value.trim() !== '' && !value.includes('your-'))
  return filled(url) && filled(key) ? 'connected' : 'not-connected'
}
