import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import {
  calculateEarnedTC,
  calculateSpentTC,
  calculateTcExpiry,
  checkPrivateMarketEligibility,
  getRateByCategory,
  TC_RATES,
  tcToKrw,
  krwToTC,
} from '../../src/lib/tc-calculator'

describe('getRateByCategory', () => {
  it('전문직(법률상담)은 1.5 반환', () => {
    expect(getRateByCategory('LEGAL_CONSULT')).toBe(TC_RATES.PROFESSIONAL_SKILL)
  })
  it('교육은 1.2 반환', () => {
    expect(getRateByCategory('EDUCATION')).toBe(TC_RATES.EDUCATION_GIVE)
  })
  it('일반(장보기)은 1.0 반환', () => {
    expect(getRateByCategory('SHOPPING')).toBe(TC_RATES.BASE)
  })
})

describe('calculateEarnedTC', () => {
  it('60분 일반 서비스 = 1.00 TC', () => {
    const result = calculateEarnedTC({
      durationMinutes: 60,
      category: 'SHOPPING',
      txType: 'PEER_TO_PEER',
    })
    expect(result.totalTC.equals(new Decimal('1.00'))).toBe(true)
  })

  it('90분 교육 서비스 = 1.80 TC', () => {
    const result = calculateEarnedTC({
      durationMinutes: 90,
      category: 'EDUCATION',
      txType: 'PEER_TO_PEER',
    })
    expect(result.totalTC.equals(new Decimal('1.80'))).toBe(true)
  })

  it('60분 법률상담 = 1.50 TC', () => {
    const result = calculateEarnedTC({
      durationMinutes: 60,
      category: 'LEGAL_CONSULT',
      txType: 'PEER_TO_PEER',
    })
    expect(result.totalTC.equals(new Decimal('1.50'))).toBe(true)
  })

  it('집단 활동: 60분 × 4명 = 2.00 TC', () => {
    const result = calculateEarnedTC({
      durationMinutes: 60,
      category: 'COMMUNITY_EVENT',
      txType: 'PEER_TO_PEER',
      participantCount: 4,
    })
    // 1h × 0.5 × 4 = 2.00
    expect(result.totalTC.equals(new Decimal('2.00'))).toBe(true)
  })

  it('공동체 교육 보너스: 60분 기본 TC + 20% 보너스', () => {
    const result = calculateEarnedTC({
      durationMinutes: 60,
      category: 'SHOPPING',
      txType: 'COMMUNITY_BONUS',
    })
    // base 1.0 + bonus 0.2 = 1.2
    expect(result.totalTC.equals(new Decimal('1.20'))).toBe(true)
    expect(result.bonusTC.equals(new Decimal('0.20'))).toBe(true)
  })

  it('대가 있는 활동 — 최저시급의 50% 지급 시 부족분 50% 보전', () => {
    const result = calculateEarnedTC({
      durationMinutes: 60,
      category: 'ADMINISTRATIVE',
      txType: 'WAGE_SUPPLEMENT',
      existingWageKrw: 5015, // 최저시급의 약 50%
    })
    // deficitRatio ≈ 0.5 → 0.5 TC
    expect(result.totalTC.toNumber()).toBeCloseTo(0.5, 1)
  })

  it('대가가 최저시급 이상이면 0 TC', () => {
    const result = calculateEarnedTC({
      durationMinutes: 60,
      category: 'ADMINISTRATIVE',
      txType: 'WAGE_SUPPLEMENT',
      existingWageKrw: 15000,
    })
    expect(result.totalTC.equals(new Decimal('0.00'))).toBe(true)
  })
})

describe('calculateSpentTC', () => {
  it('60분 일반 = 1.00 TC 지불', () => {
    const result = calculateSpentTC({ durationMinutes: 60, txType: 'PEER_TO_PEER' })
    expect(result.equals(new Decimal('1.00'))).toBe(true)
  })

  it('60분 단체 서비스 = 0.80 TC (할인)', () => {
    const result = calculateSpentTC({
      durationMinutes: 60,
      txType: 'ORG_TO_INDIVIDUAL',
      isOrgService: true,
    })
    expect(result.equals(new Decimal('0.80'))).toBe(true)
  })
})

describe('tcToKrw / krwToTC', () => {
  it('1 TC = 10030원', () => {
    expect(tcToKrw(new Decimal(1))).toBe(10030)
  })

  it('10030원 = 1 TC', () => {
    expect(krwToTC(10030).equals(new Decimal('1.00'))).toBe(true)
  })
})

describe('calculateTcExpiry', () => {
  const base = new Date('2024-01-01')

  it('일반 회원 — 5년 후 만료', () => {
    const expiry = calculateTcExpiry({
      registrationDate: base,
      isSenior: false,
      isDisabled: false,
      isVulnerable: false,
    })
    expect(expiry?.getFullYear()).toBe(2029)
  })

  it('65세 이상 — 10년 후 만료', () => {
    const expiry = calculateTcExpiry({
      registrationDate: base,
      isSenior: true,
      isDisabled: false,
      isVulnerable: false,
    })
    expect(expiry?.getFullYear()).toBe(2034)
  })

  it('취약계층 — 만료 없음(null)', () => {
    const expiry = calculateTcExpiry({
      registrationDate: base,
      isSenior: false,
      isDisabled: false,
      isVulnerable: true,
    })
    expect(expiry).toBeNull()
  })

  it('장애인 — 만료 없음(null)', () => {
    const expiry = calculateTcExpiry({
      registrationDate: base,
      isSenior: false,
      isDisabled: true,
      isVulnerable: false,
    })
    expect(expiry).toBeNull()
  })
})

describe('checkPrivateMarketEligibility', () => {
  it('잔액 부족 시 거부', () => {
    const result = checkPrivateMarketEligibility({
      memberTcBalance: new Decimal(5),
      requestedTC: new Decimal(10),
      monthlyUsedTC: new Decimal(0),
      isVulnerable: false,
    })
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('TC 잔액 부족')
  })

  it('월 한도(20 TC) 초과 시 거부', () => {
    const result = checkPrivateMarketEligibility({
      memberTcBalance: new Decimal(100),
      requestedTC: new Decimal(5),
      monthlyUsedTC: new Decimal(18),
      isVulnerable: false,
    })
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('월 한도 초과')
  })

  it('취약계층은 월 한도 2배(40 TC)', () => {
    const result = checkPrivateMarketEligibility({
      memberTcBalance: new Decimal(100),
      requestedTC: new Decimal(5),
      monthlyUsedTC: new Decimal(30),
      isVulnerable: true,
    })
    expect(result.eligible).toBe(true)
    expect(result.remainingMonthlyLimit.equals(new Decimal('10'))).toBe(true)
  })

  it('조건 충족 시 승인', () => {
    const result = checkPrivateMarketEligibility({
      memberTcBalance: new Decimal(20),
      requestedTC: new Decimal(5),
      monthlyUsedTC: new Decimal(10),
      isVulnerable: false,
    })
    expect(result.eligible).toBe(true)
  })
})
