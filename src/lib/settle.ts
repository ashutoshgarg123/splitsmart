// Works out the fewest payments that clear every balance in a group.
//
// The minimum number of payments is (people with a non-zero balance) minus (the
// most groups they can be split into whose balances each sum to zero), because
// each zero-sum group of k people can always be settled in k - 1 payments. We
// find that best split exactly with a bitmask search, then settle each group
// greedily. For very large groups the exact search gets slow, so we fall back
// to plain greedy, which is close to optimal in practice.

export type Net = { id: string; cents: number }
export type Transfer = { from: string; to: string; cents: number }

const EXACT_LIMIT = 16

export function settleUp(nets: Net[]): Transfer[] {
  // Payments can only clear every debt if the balances cancel out exactly.
  const sum = nets.reduce((acc, n) => acc + n.cents, 0)
  if (sum !== 0) throw new Error(`Balances sum to ${sum} paise, not 0, so they can't be settled`)

  const people = nets.filter((n) => n.cents !== 0)
  const groups = people.length <= EXACT_LIMIT ? zeroSumGroups(people) : [people]
  return groups.flatMap(greedySettle)
}

function zeroSumGroups(people: Net[]): Net[][] {
  const n = people.length
  const full = (1 << n) - 1
  const sum = new Array<number>(full + 1).fill(0)
  const best = new Array<number>(full + 1).fill(0)
  const pick = new Array<number>(full + 1).fill(0)

  for (let mask = 1; mask <= full; mask++) {
    const low = mask & -mask
    sum[mask] = sum[mask ^ low] + people[31 - Math.clz32(low)].cents

    // best[mask]: most zero-sum groups we can peel off `mask` one person at a time.
    let top = -1
    for (let i = 0; i < n; i++) {
      const bit = 1 << i
      if (mask & bit && best[mask ^ bit] > top) {
        top = best[mask ^ bit]
        pick[mask] = i
      }
    }
    best[mask] = top + (sum[mask] === 0 ? 1 : 0)
  }

  // Walk back down the chosen path; every zero-sum point closes a group.
  const groups: Net[][] = []
  let current: Net[] = []
  for (let mask = full; mask; ) {
    const i = pick[mask]
    current.push(people[i])
    mask ^= 1 << i
    if (sum[mask] === 0) {
      groups.push(current)
      current = []
    }
  }
  return groups
}

function greedySettle(group: Net[]): Transfer[] {
  const byAmount = (a: Net, b: Net) => b.cents - a.cents || a.id.localeCompare(b.id)
  const debtors = group.filter((p) => p.cents < 0).map((p) => ({ id: p.id, cents: -p.cents }))
  const creditors = group.filter((p) => p.cents > 0).map((p) => ({ ...p }))
  const transfers: Transfer[] = []

  while (debtors.length && creditors.length) {
    debtors.sort(byAmount)
    creditors.sort(byAmount)
    const debtor = debtors[0]
    const creditor = creditors[0]
    const cents = Math.min(debtor.cents, creditor.cents)
    transfers.push({ from: debtor.id, to: creditor.id, cents })
    debtor.cents -= cents
    creditor.cents -= cents
    if (debtor.cents === 0) debtors.shift()
    if (creditor.cents === 0) creditors.shift()
  }
  return transfers
}
