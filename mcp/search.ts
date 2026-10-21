import { initialConversations, type Conversation } from '../src/lib/inbox.js'

export interface ProductSearchMatch {
  course: string
  instructor: string
  status: Conversation['status']
  resolved: boolean
  preview: string
  matchedFields: Array<'course' | 'instructor' | 'message'>
  matchingMessages: Array<{
    author: string
    text: string
    time: string
  }>
}

export interface ProductSearchResult {
  query: string
  count: number
  matches: ProductSearchMatch[]
  message?: string
}

export function searchProductItems(
  query: string,
  conversations: Conversation[] = initialConversations,
): ProductSearchResult {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) {
    return { query, count: 0, matches: [], message: 'Enter a search phrase.' }
  }

  const matches = conversations.flatMap((conversation) => {
    const matchingMessages = conversation.messages
      .filter((message) => message.body.toLocaleLowerCase().includes(normalizedQuery))
      .map(({ author, body, time }) => ({ author, text: body, time }))
    const matchedFields: ProductSearchMatch['matchedFields'] = []

    if (conversation.course.toLocaleLowerCase().includes(normalizedQuery)) matchedFields.push('course')
    if (conversation.instructor.toLocaleLowerCase().includes(normalizedQuery)) matchedFields.push('instructor')
    if (matchingMessages.length) matchedFields.push('message')
    if (!matchedFields.length) return []

    return [{
      course: conversation.course,
      instructor: conversation.instructor,
      status: conversation.status,
      resolved: conversation.resolved,
      preview: conversation.preview,
      matchedFields,
      matchingMessages,
    }]
  })

  return {
    query,
    count: matches.length,
    matches,
    ...(matches.length ? {} : { message: 'No matching conversations found.' }),
  }
}
