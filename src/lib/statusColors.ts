import type { FollowUpStatus } from '@/types'

export const statusColor: Record<FollowUpStatus, string> = {
  Pending: 'bg-gold-dim text-gold',
  Done: 'bg-success-dim text-success',
  Overdue: 'bg-danger-dim text-danger',
}
