/**
 * tc-calculator.ts
 * 모든 TC 적립/소진 계산의 단일 진실 원천 (Single Source of Truth)
 * 주의: @prisma/client를 직접 import하지 않음 → Client Component에서도 안전하게 사용 가능
 */

// @prisma/client 대신 로컬 타입 정의 (브라우저 번들 호환)
export type ServiceCategory =
  | 'TRANSPORT' | 'SHOPPING' | 'COMPANION' | 'MEAL' | 'HOUSEKEEPING'
  | 'MEDICAL_ESCORT' | 'EDUCATION' | 'DIGITAL_HELP' | 'REPAIR' | 'CHILDCARE'
  | 'LEGAL_CONSULT' | 'HEALTH_CONSULT' | 'ADMINISTRATIVE' | 'COMMUNITY_EVENT' | 'OTHER'

export type TxType =
  | 'PEER_TO_PEER' | 'INDIVIDUAL_TO_ORG' | 'ORG_TO_INDIVIDUAL' | 'PUBLIC_SERVICE'
  | 'PRIVATE_MARKET' | 'FREE_ALLOCATION' | 'WAGE_SUPPLEMENT' | 'COMMUNITY_BONUS'
  | 'EXPIRY_DONATION' | 'COMMUNITY_FUND_GIFT'

import Decimal from 'decimal.js-light'
export { Decimal }

const MINIMUM_WAGE = Number(process.env.MINIMUM_WAGE_PER_HOUR) || 10030

export const TC_RATES = {
  BASE: 1.0,
  PEER_DIRECT: 1.0,
  GROUP_PER_PERSON: 0.5,
  EDUCATION_GIVE: 1.2,
  EDUCATION_RECEIVE: 0.2,
  PROFESSIONAL_SKILL: 1.5,
  ADMIN_SUPPORT: 1.0,
  ORG_SERVICE_DISCOUNT: 0.8,
} as const

export function getRateByCategory(category: ServiceCategory): number {
  const professionalCategories: ServiceCategory[] = ['LEGAL_CONSULT', 'HEALTH_CONSULT']
  const educationCategories: ServiceCategory[] = ['EDUCATION']

  if (professionalCategories.includes(category)) return TC_RATES.PROFESSIONAL_SKILL
  if (educationCategories.includes(category)) return TC_RATES.EDUCATION_GIVE
  return TC_RATES.BASE
}

export function calculateEarnedTC(params: {
  durationMinutes: number
  category: ServiceCategory
  txType: TxType
  participantCount?: number
  existingWageKrw?: number
}): {
  baseTC: Decimal
  bonusTC: Decimal
  totalTC: Decimal
  rateApplied: number
} {
  const hours = params.durationMinutes / 60
  const rate = getRateByCategory(params.category)

  let baseTC = new Decimal(hours * rate)
  let bonusTC = new Decimal(0)

  if (params.participantCount && params.participantCount > 1) {
    baseTC = new Decimal(hours * TC_RATES.GROUP_PER_PERSON * params.participantCount)
  }

  if (params.txType === 'COMMUNITY_BONUS') {
    bonusTC = baseTC.mul(0.2)
  }

  if (params.txType === 'WAGE_SUPPLEMENT' && params.existingWageKrw !== undefined) {
    const deficitRatio = Math.max(0, (MINIMUM_WAGE - params.existingWageKrw) / MINIMUM_WAGE)
    baseTC = new Decimal(hours * deficitRatio)
    bonusTC = new Decimal(0)
  }

  const totalTC = baseTC.plus(bonusTC).toDecimalPlaces(2)

  return {
    baseTC: baseTC.toDecimalPlaces(2),
    bonusTC: bonusTC.toDecimalPlaces(2),
    totalTC,
    rateApplied: rate,
  }
}

export function calculateSpentTC(params: {
  durationMinutes: number
  txType: TxType
  isOrgService?: boolean
}): Decimal {
  const hours = params.durationMinutes / 60
  const rate = params.isOrgService ? TC_RATES.ORG_SERVICE_DISCOUNT : TC_RATES.BASE
  return new Decimal(hours * rate).toDecimalPlaces(2)
}

export function tcToKrw(tcAmount: Decimal): number {
  return tcAmount.mul(MINIMUM_WAGE).toNumber()
}

export function krwToTC(krwAmount: number): Decimal {
  return new Decimal(krwAmount / MINIMUM_WAGE).toDecimalPlaces(2)
}

export function calculateTcExpiry(params: {
  registrationDate: Date
  isSenior: boolean
  isDisabled: boolean
  isVulnerable: boolean
}): Date | null {
  if (params.isDisabled || params.isVulnerable) return null

  const expiry = new Date(params.registrationDate)
  expiry.setFullYear(expiry.getFullYear() + (params.isSenior ? 10 : 5))
  return expiry
}

export function checkPrivateMarketEligibility(params: {
  memberTcBalance: Decimal
  requestedTC: Decimal
  monthlyUsedTC: Decimal
  isVulnerable: boolean
}): { eligible: boolean; reason?: string; remainingMonthlyLimit: Decimal } {
  const baseLimit = Number(process.env.FUND_MAX_MONTHLY_PRIVATE_TC_PER_MEMBER) || 20
  const monthlyLimit = new Decimal(params.isVulnerable ? baseLimit * 2 : baseLimit)
  const remaining = monthlyLimit.minus(params.monthlyUsedTC)

  if (params.memberTcBalance.lessThan(params.requestedTC)) {
    return { eligible: false, reason: 'TC 잔액 부족', remainingMonthlyLimit: remaining }
  }
  if (remaining.lessThan(params.requestedTC)) {
    return { eligible: false, reason: '월 한도 초과', remainingMonthlyLimit: remaining }
  }

  return { eligible: true, remainingMonthlyLimit: remaining }
}
