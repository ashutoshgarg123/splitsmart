import type { Tables } from '../lib/database.types'
import { formatCents } from '../lib/money'
import { EmptyState } from './EmptyState'

export type ExpenseWithSplits = Tables<'expenses'> & {
  expense_splits: { member_id: string }[]
}

type Props = {
  expenses: ExpenseWithSplits[]
  members: Tables<'members'>[]
}

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

export function ExpenseList({ expenses, members }: Props) {
  const nameById = new Map(members.map((m) => [m.id, m.name]))
  const total = expenses.reduce((sum, e) => sum + e.amount_cents, 0)

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Expenses</h2>
        {expenses.length > 0 && <span className="text-sm text-slate-500">Total {formatCents(total)}</span>}
      </div>

      {expenses.length === 0 ? (
        <div className="mt-3">
          <EmptyState icon="🧾" title="No expenses yet" text="Add the first one above. It’ll show up here, newest first." />
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {expenses.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium break-words">{e.description}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {nameById.get(e.paid_by) ?? 'Someone'} paid &middot; split {e.expense_splits.length} ways
                  &middot; {dateFormat.format(new Date(e.created_at))}
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums">{formatCents(e.amount_cents)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
