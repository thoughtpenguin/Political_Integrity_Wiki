import { type BadgeStatus, type Proposal, type Badge } from '@/lib/types'
import BadgeVotingItem from './BadgeVotingItem'

export default function BadgeSection({ 
  candidateId, 
  badgeData, 
  hasUnkeptBadge 
}: { 
  candidateId: string
  badgeData: { badge: Omit<Badge, 'status'>, proposals: Proposal[], topStatus: BadgeStatus }[]
  hasUnkeptBadge: boolean
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 0.5rem' }}>
      {badgeData.map(({ badge, proposals, topStatus }) => {
        const effectiveStatus: BadgeStatus = hasUnkeptBadge && topStatus !== 'unkept'
          ? 'unknown'
          : topStatus
        
        return (
          <BadgeVotingItem
            key={badge.id}
            candidateId={candidateId}
            badge={badge}
            currentStatus={effectiveStatus}
            proposals={proposals}
          />
        )
      })}
    </div>
  )
}
