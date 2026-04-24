import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      roles: string[]
      dong: string
    } & DefaultSession['user']
  }
}
