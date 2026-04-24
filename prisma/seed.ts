import { PrismaClient, Role, MemberType, MemberStatus, OrgType, ServiceCategory } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // System config
  await prisma.systemConfig.upsert({
    where: { key: 'MINIMUM_WAGE_PER_HOUR' },
    update: {},
    create: { key: 'MINIMUM_WAGE_PER_HOUR', value: '10030', updatedBy: 'system' },
  })
  await prisma.systemConfig.upsert({
    where: { key: 'FUND_RESERVE_RATIO_WARNING' },
    update: {},
    create: { key: 'FUND_RESERVE_RATIO_WARNING', value: '0.15', updatedBy: 'system' },
  })
  await prisma.systemConfig.upsert({
    where: { key: 'FUND_RESERVE_RATIO_CRITICAL' },
    update: {},
    create: { key: 'FUND_RESERVE_RATIO_CRITICAL', value: '0.10', updatedBy: 'system' },
  })

  const passwordHash = await bcrypt.hash('password123!', 12)

  // Admin
  const admin = await prisma.member.upsert({
    where: { phone: '010-0000-0001' },
    update: {},
    create: {
      phone: '010-0000-0001',
      email: 'admin@timebank.kr',
      passwordHash,
      name: '관리자',
      birthYear: 1980,
      dong: '치평동',
      memberType: MemberType.PUBLIC,
      roles: [Role.ADMIN, Role.COORDINATOR],
      tcBalance: 0,
    },
  })

  // Coordinator
  const coordinator = await prisma.member.upsert({
    where: { phone: '010-0000-0002' },
    update: {},
    create: {
      phone: '010-0000-0002',
      email: 'coord1@timebank.kr',
      passwordHash,
      name: '김코디',
      birthYear: 1975,
      dong: '상무1동',
      roles: [Role.COORDINATOR],
      tcBalance: 0,
    },
  })

  const coordinator2 = await prisma.member.upsert({
    where: { phone: '010-0000-0003' },
    update: {},
    create: {
      phone: '010-0000-0003',
      email: 'coord2@timebank.kr',
      passwordHash,
      name: '이코디',
      birthYear: 1978,
      dong: '풍암동',
      roles: [Role.COORDINATOR],
      tcBalance: 0,
    },
  })

  // General members — providers
  const provider1 = await prisma.member.upsert({
    where: { phone: '010-1111-0001' },
    update: {},
    create: {
      phone: '010-1111-0001',
      email: 'provider1@timebank.kr',
      passwordHash,
      name: '박제공',
      birthYear: 1968,
      dong: '상무1동',
      roles: [Role.PROVIDER, Role.RECEIVER],
      tcBalance: 15,
      lifetimeEarned: 25,
      lifetimeSpent: 10,
      tcExpiresAt: new Date('2029-01-01'),
    },
  })

  const provider2 = await prisma.member.upsert({
    where: { phone: '010-1111-0002' },
    update: {},
    create: {
      phone: '010-1111-0002',
      email: 'provider2@timebank.kr',
      passwordHash,
      name: '최도우',
      birthYear: 1972,
      dong: '풍암동',
      roles: [Role.PROVIDER],
      tcBalance: 8,
      lifetimeEarned: 8,
      lifetimeSpent: 0,
      tcExpiresAt: new Date('2029-06-01'),
    },
  })

  // General members — receivers (취약계층)
  const receiver1 = await prisma.member.upsert({
    where: { phone: '010-2222-0001' },
    update: {},
    create: {
      phone: '010-2222-0001',
      email: 'receiver1@timebank.kr',
      passwordHash,
      name: '홍수요',
      birthYear: 1945,
      dong: '상무1동',
      roles: [Role.RECEIVER],
      isVulnerable: true,
      tcBalance: 20,
      lifetimeEarned: 30,
      lifetimeSpent: 10,
      tcExpiresAt: null, // 취약계층 — 만료 없음
    },
  })

  const receiver2 = await prisma.member.upsert({
    where: { phone: '010-2222-0002' },
    update: {},
    create: {
      phone: '010-2222-0002',
      email: 'receiver2@timebank.kr',
      passwordHash,
      name: '정노인',
      birthYear: 1950,
      dong: '풍암동',
      roles: [Role.RECEIVER],
      tcBalance: 5,
      lifetimeEarned: 5,
      lifetimeSpent: 0,
      tcExpiresAt: new Date('2034-01-01'), // 65세 이상 — 10년
    },
  })

  // Organization
  const org = await prisma.organization.upsert({
    where: { id: 'org-seed-001' },
    update: {},
    create: {
      id: 'org-seed-001',
      name: '상무1동 주민자치회',
      orgType: OrgType.COMMUNITY_COUNCIL,
      dong: '상무1동',
      tcBalance: 50,
      tcExpiresAt: new Date('2027-01-01'),
    },
  })

  // Service listings
  const listing1 = await prisma.serviceListing.upsert({
    where: { id: 'listing-seed-001' },
    update: {},
    create: {
      id: 'listing-seed-001',
      providerId: provider1.id,
      title: '장보기 도우미',
      description: '마트 장보기, 배달 도움',
      category: ServiceCategory.SHOPPING,
      tcPerHour: 1.0,
      availableDong: ['상무1동', '상무2동'],
      availableDays: ['MON', 'WED', 'FRI'],
      availableTimeFrom: '09:00',
      availableTimeTo: '17:00',
    },
  })

  const listing2 = await prisma.serviceListing.upsert({
    where: { id: 'listing-seed-002' },
    update: {},
    create: {
      id: 'listing-seed-002',
      providerId: provider2.id,
      title: '말벗 서비스',
      description: '어르신 대화 상대, 산책 동행',
      category: ServiceCategory.COMPANION,
      tcPerHour: 1.0,
      availableDong: ['풍암동'],
      availableDays: ['TUE', 'THU', 'SAT'],
      availableTimeFrom: '10:00',
      availableTimeTo: '16:00',
    },
  })

  const listing3 = await prisma.serviceListing.upsert({
    where: { id: 'listing-seed-003' },
    update: {},
    create: {
      id: 'listing-seed-003',
      providerId: provider1.id,
      title: '디지털 기기 도움',
      description: '스마트폰, 키오스크 사용 교육',
      category: ServiceCategory.DIGITAL_HELP,
      tcPerHour: 1.0,
      availableDong: ['상무1동', '풍암동', '치평동'],
      availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      availableTimeFrom: '13:00',
      availableTimeTo: '18:00',
    },
  })

  // Service requests
  await prisma.serviceRequest.upsert({
    where: { id: 'req-seed-001' },
    update: {},
    create: {
      id: 'req-seed-001',
      requesterId: receiver1.id,
      category: ServiceCategory.SHOPPING,
      description: '이번 주 토요일 마트 장보기 부탁드립니다.',
      requestedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      durationMinutes: 90,
      dong: '상무1동',
      urgency: 'NORMAL',
    },
  })

  await prisma.serviceRequest.upsert({
    where: { id: 'req-seed-002' },
    update: {},
    create: {
      id: 'req-seed-002',
      requesterId: receiver2.id,
      category: ServiceCategory.MEDICAL_ESCORT,
      description: '내일 병원 동행이 급하게 필요합니다.',
      requestedDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      durationMinutes: 120,
      dong: '풍암동',
      urgency: 'EMERGENCY',
    },
  })

  // Fund transaction (initial contribution)
  const fundTx = await prisma.fundTransaction.upsert({
    where: { id: 'fund-seed-001' },
    update: {},
    create: {
      id: 'fund-seed-001',
      fundTxType: 'CONTRIBUTION',
      tcEquivalent: 10000,
      cashAmount: 100300000,
      description: '구청 초기 기금 출연',
      approvedBy: [admin.id],
    },
  })

  console.log('✅ Seed complete.')
  console.log(`   관리자: ${admin.email} / password123!`)
  console.log(`   코디네이터: ${coordinator.email} / password123!`)
  console.log(`   제공자: ${provider1.email} / password123!`)
  console.log(`   수요자: ${receiver1.email} / password123!`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
