import { PrismaClient, Role, MemberType, OrgType, ServiceCategory } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

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
      name: '\uAD00\uB9AC\uC790',
      birthDate: '19800101',
      dong: '\uCE58\uD3C9\uB3D9',
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
      name: '\uAE40\ucf54\ub514',
      birthDate: '19750101',
      dong: '\uC0C1\uBB34\u0031\uB3D9',
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
      name: '\uc774\ucf54\ub514',
      birthDate: '19780101',
      dong: '\ud48d\uc554\ub3d9',
      roles: [Role.COORDINATOR],
      tcBalance: 0,
    },
  })

  // General members - providers
  const provider1 = await prisma.member.upsert({
    where: { phone: '010-1111-0001' },
    update: {},
    create: {
      phone: '010-1111-0001',
      email: 'provider1@timebank.kr',
      passwordHash,
      name: '\uBC15\uC81C\uACF5',
      birthDate: '19680101',
      dong: '\uC0C1\uBB34\u0031\uB3D9',
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
      name: '\uCD5C\uB3C4\uC6C0',
      birthDate: '19720101',
      dong: '\ud48d\uc554\ub3d9',
      roles: [Role.PROVIDER],
      tcBalance: 8,
      lifetimeEarned: 8,
      lifetimeSpent: 0,
      tcExpiresAt: new Date('2029-06-01'),
    },
  })

  // General members - receivers
  const receiver1 = await prisma.member.upsert({
    where: { phone: '010-2222-0001' },
    update: {},
    create: {
      phone: '010-2222-0001',
      email: 'receiver1@timebank.kr',
      passwordHash,
      name: '\uAE40\uC218\uD61C',
      birthDate: '19450101',
      dong: '\uC0C1\uBB34\u0031\uB3D9',
      roles: [Role.RECEIVER],
      isVulnerable: true,
      tcBalance: 20,
      lifetimeEarned: 30,
      lifetimeSpent: 10,
      tcExpiresAt: null,
    },
  })

  const receiver2 = await prisma.member.upsert({
    where: { phone: '010-2222-0002' },
    update: {},
    create: {
      phone: '010-2222-0002',
      email: 'receiver2@timebank.kr',
      passwordHash,
      name: '\uC774\uB178\uC778',
      birthDate: '19500101',
      dong: '\ud48d\uc554\ub3d9',
      roles: [Role.RECEIVER],
      tcBalance: 5,
      lifetimeEarned: 5,
      lifetimeSpent: 0,
      tcExpiresAt: new Date('2034-01-01'),
    },
  })

  // Organization
  await prisma.organization.upsert({
    where: { id: 'org-seed-001' },
    update: {},
    create: {
      id: 'org-seed-001',
      name: '\uC0C1\uBB34\u0031\uB3D9 \uC8FC\uBBFC\uC790\uCE58\uD68C',
      orgType: OrgType.COMMUNITY_COUNCIL,
      dong: '\uC0C1\uBB34\u0031\uB3D9',
      tcBalance: 50,
      tcExpiresAt: new Date('2027-01-01'),
    },
  })

  // Service listings
  await prisma.serviceListing.upsert({
    where: { id: 'listing-seed-001' },
    update: {},
    create: {
      id: 'listing-seed-001',
      providerId: provider1.id,
      title: '\uc7a5\ubcf4\uae30 \ub3c4\uc6c0',
      description: '\uc2dc\uc7a5 \uc7a5\ubcf4\uae30 \ub300\ud589 \uc11c\ube44\uc2a4',
      category: ServiceCategory.SHOPPING,
      tcPerHour: 1.0,
      availableDong: ['\uC0C1\uBB34\u0031\uB3D9', '\uC0C1\uBB34\u0032\uB3D9'],
      availableDays: ['MON', 'WED', 'FRI'],
      availableTimeFrom: '09:00',
      availableTimeTo: '17:00',
    },
  })

  await prisma.serviceListing.upsert({
    where: { id: 'listing-seed-002' },
    update: {},
    create: {
      id: 'listing-seed-002',
      providerId: provider2.id,
      title: '\ub9d0\ubc97 \uc11c\ube44\uc2a4',
      category: ServiceCategory.COMPANION,
      tcPerHour: 1.0,
      availableDong: ['\ud48d\uc554\ub3d9'],
      availableDays: ['TUE', 'THU', 'SAT'],
      availableTimeFrom: '10:00',
      availableTimeTo: '16:00',
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
      description: '\uAD11\uC8FC\uC11C\uAD6C\uCCAD \uCD08\uAE30 \uAE30\uAE08 \uCD9C\uC5F0',
      approvedBy: [admin.id],
    },
  })

  console.log('Seed complete.')
  console.log(`  Admin: ${admin.email} / password123!`)
  console.log(`  Coordinator: ${coordinator.email} / password123!`)
  console.log(`  Provider: ${provider1.email} / password123!`)
  console.log(`  Receiver: ${receiver1.email} / password123!`)

  // suppress unused variable warnings
  void coordinator2
  void provider2
  void receiver2
  void fundTx
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
