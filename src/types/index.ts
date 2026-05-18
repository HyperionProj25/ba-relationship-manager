export type ContactCategory = string

export type InteractionType = 'Call' | 'Email' | 'Meeting' | 'Text' | 'LinkedIn' | 'In-Person'

export type FollowUpStatus = 'Pending' | 'Done' | 'Overdue'

export type TouchType = 'Direct' | 'Indirect'

export type Priority = 'High' | 'Medium' | 'Low'

export interface Contact {
  id: string
  name: string
  organization: string | null
  role: string | null
  email: string | null
  phone: string | null
  category: ContactCategory
  linkedin: string | null
  notes: string | null
  relationship_owner: string | null
  touch_type: TouchType | null
  priority: Priority | null
  created_at: string
  updated_at: string
}

export interface Interaction {
  id: string
  contact_id: string
  summary: string
  date: string
  type: InteractionType
  details: string | null
  follow_up_needed: boolean
  follow_up_date: string | null
  follow_up_action: string | null
  status: FollowUpStatus
  created_at: string
}

export interface InteractionWithContact extends Interaction {
  contacts: Pick<Contact, 'id' | 'name' | 'organization'>
}

export interface ContactWithCadence extends Contact {
  daysSinceLastInteraction: number
  lastInteractionDate: string | null
  lastInteractionType: InteractionType | null
}

export interface CopilotChat {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface CopilotMessage {
  id: string
  chat_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
