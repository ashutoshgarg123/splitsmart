import { checkLedger, type LedgerCheck } from '../lib/ledger'
import { formatCents } from '../lib/money'
import { settleUp } from '../lib/settle'
import { EmptyState } from './EmptyState'
import { primaryButtonClass } from './ui'

export type Balance = { memberId: string; name: string; paidCents: number; shareCents: number; netCents: number }

type Props = {
  balances: Balance[]
  hasExpenses: boolean
  expensesTotalCents: number
  onAddExpense: () => void
  onAddMembers: () => void
}

export function BalancesView({ balances, hasExpenses, expensesTotalCents, onAddExpense, onAddMembers }: Props) {
  if (balances.length === 0) {
    return (
      <EmptyState
        icon="👥"
        title="Step 1: add your people"
        text="Add everyone who’s sharing costs. Then log what each person paid, and balances appear here."
        action={{ label: 'Add people', onClick: onAddMembers }}
      />
    )
  }

  if (!hasExpenses) {
    return (
      <EmptyState
        icon="🧾"
        title="Step 2: log the first expense"
        text="Add something someone paid for. We’ll split it equally and show who owes whom right here."
        action={{ label: 'Add an expense', onClick: onAddExpense }}
      />
    )
  }

  const nameById = new Map(balances.map((b) => [b.memberId, b.name]))
  const ledger = checkLedger(balances, expensesTotalCents)
  // Never suggest payments from books that don't balance; they'd be wrong.
  const transfers = ledger.ok ? settleUp(balances.map((b) => ({ id: b.memberId, cents: b.netCents }))) : []
  const sorted = [...balances].sort((a, b) => b.netCents - a.netCents || a.name.localeCompare(b.name))

  return (
    <div className="flex flex-col gap-8">
      <button type="button" onClick={onAddExpense} className={primaryButtonClass}>
        + Add an expense
      </button>

      <section aria-labelledby="settle-heading">
        <h2 id="settle-heading" className="text-lg font-semibold">
          Settle up
        </h2>
        {!ledger.ok ? (
          <div role="alert" className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-800">Settle-up is paused: the numbers don’t add up</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
              {ledger.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ) : transfers.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="text-3xl" aria-hidden>
              🎉
            </p>
            <p className="mt-2 text-xl font-semibold text-emerald-800">All settled up</p>
            <p className="mt-1 text-sm text-emerald-700">Nobody owes anybody anything.</p>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">
              {transfers.length === 1 ? 'One payment clears' : `These ${transfers.length} payments clear`} every
              debt.
            </p>
            <ol className="mt-3 flex flex-col gap-3">
              {transfers.map((t) => (
                <li
                  key={`${t.from}-${t.to}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-lg leading-snug text-slate-700">
                    <span className="font-semibold text-red-700">{nameById.get(t.from)}</span> pays{' '}
                    <span className="font-semibold text-emerald-700">{nameById.get(t.to)}</span>
                  </p>
                  <p className="mt-1 text-4xl font-bold tracking-tight break-all tabular-nums text-slate-900">
                    {formatCents(t.cents)}
                  </p>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <section aria-labelledby="balances-heading">
        <h2 id="balances-heading" className="text-lg font-semibold">
          Balances
        </h2>
        <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {sorted.map((b) => (
            <BalanceRow key={b.memberId} balance={b} />
          ))}
        </ul>
      </section>

      <LedgerSummary ledger={ledger} />
    </div>
  )
}

function LedgerSummary({ ledger }: { ledger: LedgerCheck }) {
  const rows = [
    { label: 'Total spent', cents: ledger.totalSpentCents },
    { label: 'Everyone’s shares added up', cents: ledger.totalSharesCents },
    { label: 'All balances added up', cents: ledger.netSumCents },
  ]

  return (
    <section
      aria-labelledby="ledger-heading"
      className={`rounded-2xl border p-4 ${ledger.ok ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50'}`}
    >
      <h2 id="ledger-heading" className={`font-semibold ${ledger.ok ? 'text-emerald-700' : 'text-red-800'}`}>
        {ledger.ok ? '✓ Every rupee accounted for' : '✗ These numbers don’t add up'}
      </h2>
      <dl className="mt-3 flex flex-col gap-1.5 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4">
            <dt className="text-slate-600">{r.label}</dt>
            <dd className="font-medium tabular-nums">{formatCents(r.cents)}</dd>
          </div>
        ))}
      </dl>
      {ledger.ok && ledger.changesHandsCents > 0 && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">
          Only {formatCents(ledger.changesHandsCents)} needs to change hands. That’s less than the total spent
          because each payer’s own share stays with them.
        </p>
      )}
    </section>
  )
}

function BalanceRow({ balance }: { balance: Balance }) {
  const { name, netCents } = balance
  const tone =
    netCents > 0
      ? { bar: 'bg-emerald-500', amount: 'text-emerald-600', label: 'text-emerald-700', text: 'gets back' }
      : netCents < 0
        ? { bar: 'bg-red-500', amount: 'text-red-600', label: 'text-red-700', text: 'owes' }
        : { bar: 'bg-slate-300', amount: 'text-slate-400', label: 'text-slate-500', text: 'settled up' }
  const sign = netCents > 0 ? '+' : netCents < 0 ? '−' : ''

  return (
    <li className="relative flex items-center justify-between gap-4 py-4 pr-4 pl-5">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${tone.bar}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-lg font-medium break-words">{name}</p>
        <p className={`text-sm font-medium ${tone.label}`}>{tone.text}</p>
      </div>
      <p className={`shrink-0 text-2xl font-bold tracking-tight tabular-nums min-[400px]:text-3xl ${tone.amount}`}>
        {sign}
        {formatCents(Math.abs(netCents))}
      </p>
    </li>
  )
}
