'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { functions } from '@/lib/firebase-client'
import { httpsCallable } from 'firebase/functions'

export interface PointsConfig {
  newUserPoints: number
  createCandidateCost: number
  addPeriodManualCost: number
  submitProposalCost: number
  submitBadgeProposalCost: number
  pinProposalAuthorReward: number
  pinProposalUpvoterReward: number
  reportPeriodCost: number
  reportPeriodApproveReward: number
  reportProposalCost: number
  reportProposalApproveReward: number
  minUpvoterCombinedPoints: number
  voteAgeDaysForDailyPoints: number
  dailyPointsCap: number
}

export const DEFAULT_CONFIG: PointsConfig = {
  newUserPoints: 100,
  createCandidateCost: 1000,
  addPeriodManualCost: 1000,
  submitProposalCost: 10,
  submitBadgeProposalCost: 10,
  pinProposalAuthorReward: 200,
  pinProposalUpvoterReward: 150,
  reportPeriodCost: 200,
  reportPeriodApproveReward: 400,
  reportProposalCost: 5,
  reportProposalApproveReward: 15,
  minUpvoterCombinedPoints: 500,
  voteAgeDaysForDailyPoints: 3,
  dailyPointsCap: 10,
}

const PointsConfigContext = createContext<PointsConfig>(DEFAULT_CONFIG)

export function PointsConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PointsConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const getPointsConfigFn = httpsCallable<undefined, PointsConfig>(functions, 'get_points_config')
        const result = await getPointsConfigFn()
        setConfig(result.data)
      } catch (err) {
        console.error('Failed to fetch points configuration from Cloud Functions:', err)
      }
    }
    fetchConfig()
  }, [])

  return (
    <PointsConfigContext.Provider value={config}>
      {children}
    </PointsConfigContext.Provider>
  )
}

export function usePointsConfig() {
  return useContext(PointsConfigContext)
}
