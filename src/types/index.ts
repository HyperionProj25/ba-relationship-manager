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

export type TaskType = 'quick_todo' | 'talk_about' | 'reach_out_now'

export type TaskPriority = 'low' | 'medium' | 'high'

export type TaskStatus = 'open' | 'done'

export interface Task {
  id: string
  title: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  contact_id: string | null
  notes: string | null
  due_date: string | null
  created_at: string
  completed_at: string | null
}

export interface TaskWithContact extends Task {
  contacts: Pick<Contact, 'id' | 'name'> | null
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

export type BrainNodeType =
  | 'person'
  | 'company'
  | 'strategy'
  | 'decision'
  | 'research'
  | 'idea'
  | 'event'
  | 'technology'
  | 'term'
  | 'milestone'

export interface BrainNode {
  id: string
  type: BrainNodeType
  title: string
  body: string | null
  tags: string[]
  source: string | null
  contact_id: string | null
  created_at: string
  updated_at: string
}

export interface BrainEdge {
  id: string
  source_node_id: string
  target_node_id: string
  relationship: string
  strength: number
  notes: string | null
  created_at: string
}
