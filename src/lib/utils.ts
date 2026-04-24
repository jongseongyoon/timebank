import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTC(amount: number | string): string {
  return `${Number(amount).toFixed(2)} TC`
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date))
}

export function maskName(name: string): string {
  if (name.length <= 2) return name[0] + '*'
  return name[0] + name[1] + '*'.repeat(name.length - 2)
}
