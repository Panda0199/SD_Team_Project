export function toSignInEmail(input: string, domain = 'quickly.test'): string {
  const trimmedInput = input.trim()
  if (!trimmedInput) return ''
  if (trimmedInput.includes('@')) return trimmedInput
  return `${trimmedInput.toLowerCase()}@${domain}`
}
