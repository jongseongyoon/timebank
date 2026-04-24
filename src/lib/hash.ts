import crypto from 'crypto'

export function computeTxHash(params: {
  id: string
  createdAt: Date
  providerId: string | null
  receiverId: string | null
  tcAmount: string
  prevTxHash: string | null
}): string {
  const payload = [
    params.id,
    params.createdAt.toISOString(),
    params.providerId ?? 'NULL',
    params.receiverId ?? 'NULL',
    params.tcAmount,
    params.prevTxHash ?? 'GENESIS',
  ].join('|')

  return crypto.createHash('sha256').update(payload).digest('hex')
}

export async function verifyLedgerIntegrity(
  transactions: Array<{ txHash: string; prevTxHash: string | null; [key: string]: unknown }>
): Promise<{ valid: boolean; brokenAt?: string }> {
  for (let i = 1; i < transactions.length; i++) {
    if (transactions[i].prevTxHash !== transactions[i - 1].txHash) {
      return { valid: false, brokenAt: transactions[i].txHash }
    }
  }
  return { valid: true }
}
