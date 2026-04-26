import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(6),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // Vercel 등 프록시/CDN 환경에서 X-Forwarded-Host 검증 통과
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        phone: { label: '전화번호', type: 'tel' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { phone, password } = parsed.data
        const member = await prisma.member.findUnique({ where: { phone } })
        if (!member?.passwordHash) return null

        const valid = await bcrypt.compare(password, member.passwordHash)
        if (!valid) return null

        if (member.status === 'SUSPENDED' || member.status === 'WITHDRAWN') return null

        return {
          id: member.id,
          name: member.name,
          email: member.email ?? undefined,
          roles: member.roles,
          dong: member.dong,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.roles = (user as any).roles
        token.dong = (user as any).dong
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.roles = token.roles as string[]
        session.user.dong = token.dong as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
})
