import { z } from 'zod'

export const registerSchema = z.object({
  phone: z.string().regex(/^010-\d{4}-\d{4}$/, '전화번호 형식: 010-0000-0000'),
  password: z.string().min(8, '비밀번호 최소 8자'),
  name: z.string().min(2).max(20),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
  dong: z.string().min(1),
  address: z.string().optional(),
  email: z.string().email().optional(),
  isVulnerable: z.boolean().default(false),
  isDisabled: z.boolean().default(false),
  roles: z.array(z.enum(['RECEIVER', 'PROVIDER'])).min(1),
})

export type RegisterInput = z.infer<typeof registerSchema>
