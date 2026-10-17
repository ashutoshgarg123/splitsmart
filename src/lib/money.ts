// All money is handled as integer cents to avoid floating-point rounding errors.

const AMOUNT_RE = /^(\d{0,9})(?:\.(\d{0,2}))?$/

/** Parses user input like "12", "12.5", "1,250.75" into cents. Returns null if invalid or not > 0. */
export function parseAmountToCents(input: string): number | null {
  const match = AMOUNT_RE.exec(input.replace(/[,\s]/g, ''))
  if (!match) return null
  const [, whole, fraction = ''] = match
  if (!whole && !fraction) return null
  const cents = Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'))
  return cents > 0 ? cents : null
}

const amountFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

/** Formats cents as rupees, e.g. 125075 -> "₹1,250.75". */
export function formatCents(cents: number): string {
  return amountFormat.format(cents / 100)
}

export type Share = { memberId: string; cents: number }

/**
 * Splits a total into equal shares that always add up to exactly the total.
 * When it doesn't divide evenly, the leftover paise go one each to the payer
 * first and then to the next people in order, so the person who paid absorbs
 * the rounding instead of the same people being charged extra on every bill.
 */
export function splitEqually(totalCents: number, memberIds: string[], payerId?: string): Share[] {
  const n = memberIds.length
  if (n === 0) throw new Error('Cannot split an expense between zero people')
  const base = Math.floor(totalCents / n)
  const remainder = totalCents % n
  const start = payerId ? Math.max(0, memberIds.indexOf(payerId)) : 0
  const shares = memberIds.map((memberId, i) => ({
    memberId,
    cents: base + ((i - start + n) % n < remainder ? 1 : 0),
  }))
  assertSharesMatch(totalCents, shares)
  return shares
}

/** Safety check: throws unless the shares add up to exactly the total. */
export function assertSharesMatch(totalCents: number, shares: Share[]): void {
  const sum = shares.reduce((acc, s) => acc + s.cents, 0)
  if (sum !== totalCents) {
    throw new Error(`Split shares add up to ${sum} paise, not ${totalCents}`)
  }
}

/** Describes equal shares exactly, e.g. "₹6,572.17 × 4 and ₹6,572.16 × 2". */
export function describeShares(shares: Share[]): string {
  const counts = new Map<number, number>()
  for (const s of shares) counts.set(s.cents, (counts.get(s.cents) ?? 0) + 1)
  return [...counts]
    .sort(([a], [b]) => b - a)
    .map(([cents, count]) => (counts.size === 1 ? `${formatCents(cents)} each` : `${formatCents(cents)} × ${count}`))
    .join(' and ')
}
