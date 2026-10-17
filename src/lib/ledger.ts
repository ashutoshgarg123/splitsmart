// Safety check that a group's books balance to the paisa before we show anyone
// what to pay. Three things must hold:
//   1. Everything paid adds up to the sum of all expenses.
//   2. Everyone's shares add up to the same total (no paisa lost in splitting).
//   3. Therefore every balance (paid - share) sums to exactly zero.

export type LedgerEntry = { paidCents: number; shareCents: number; netCents: number }

export type LedgerCheck = {
  ok: boolean
  totalSpentCents: number
  totalPaidCents: number
  totalSharesCents: number
  netSumCents: number
  /** Money that actually changes hands: the sum of what everyone in credit is owed. */
  changesHandsCents: number
  problems: string[]
}

export function checkLedger(entries: LedgerEntry[], expensesTotalCents: number): LedgerCheck {
  const totalPaidCents = entries.reduce((sum, e) => sum + e.paidCents, 0)
  const totalSharesCents = entries.reduce((sum, e) => sum + e.shareCents, 0)
  const netSumCents = entries.reduce((sum, e) => sum + e.netCents, 0)
  const changesHandsCents = entries.reduce((sum, e) => sum + Math.max(0, e.netCents), 0)

  const problems: string[] = []
  if (totalPaidCents !== expensesTotalCents) {
    problems.push(`Payments total ${totalPaidCents} paise but expenses total ${expensesTotalCents} paise.`)
  }
  if (totalSharesCents !== expensesTotalCents) {
    problems.push(
      `Shares total ${totalSharesCents} paise but expenses total ${expensesTotalCents} paise. An expense may be missing its split.`,
    )
  }
  if (netSumCents !== 0) {
    problems.push(`Balances sum to ${netSumCents} paise instead of exactly 0.`)
  }

  return {
    ok: problems.length === 0,
    totalSpentCents: expensesTotalCents,
    totalPaidCents,
    totalSharesCents,
    netSumCents,
    changesHandsCents,
    problems,
  }
}
