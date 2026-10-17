import { useState, type FormEvent } from 'react'
import type { Tables } from '../lib/database.types'
import { describeShares, parseAmountToCents, splitEqually, type Share } from '../lib/money'
import { supabase } from '../lib/supabase'
import { EmptyState } from './EmptyState'
import type { ExpenseWithSplits } from './ExpenseList'
import { inputClass, primaryButtonClass } from './ui'

type Props = {
  groupId: string
  members: Tables<'members'>[]
  onAdded: (expense: ExpenseWithSplits) => void
}

export function AddExpenseForm({ groupId, members, onAdded }: Props) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cents = parseAmountToCents(amount)
  const canSubmit = description.trim() !== '' && cents !== null && paidBy !== '' && !saving

  if (members.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold">Add an expense</h2>
        <div className="mt-3">
          <EmptyState icon="👥" title="Add people first" text="Expenses are split between the people in the group. Add them on the People tab." />
        </div>
      </section>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || cents === null) return

    // Work out the split before saving anything. splitEqually throws if the
    // shares don't add up to the total, so a bad split never reaches the database.
    let shares: Share[]
    try {
      shares = splitEqually(
        cents,
        members.map((m) => m.id),
        paidBy,
      )
    } catch (err) {
      setError(`Couldn't split this expense: ${(err as Error).message}`)
      return
    }

    setSaving(true)
    setError(null)

    const expenseRes = await supabase
      .from('expenses')
      .insert({ group_id: groupId, paid_by: paidBy, amount_cents: cents, description: description.trim() })
      .select('*')
      .single()
    if (expenseRes.error) {
      setSaving(false)
      setError(`Couldn't save the expense: ${expenseRes.error.message}`)
      return
    }

    const expense = expenseRes.data
    const splitsRes = await supabase
      .from('expense_splits')
      .insert(shares.map((s) => ({ expense_id: expense.id, member_id: s.memberId, amount_cents: s.cents })))
      .select('member_id')
    setSaving(false)

    if (splitsRes.error) {
      // The expense row exists but has no splits, so balances will be off for it.
      setError(
        `The expense was saved, but splitting it failed: ${splitsRes.error.message}. Balances won’t include it correctly.`,
      )
      return
    }

    onAdded({ ...expense, expense_splits: splitsRes.data })
    setDescription('')
    setAmount('')
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Add an expense</h2>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <div>
          <label htmlFor="expense-description" className="mb-1 block text-sm font-medium text-slate-700">
            What was it for?
          </label>
          <input
            id="expense-description"
            className={inputClass}
            placeholder="e.g. Dinner, cab to airport, groceries"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
            autoComplete="off"
          />
        </div>

        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="expense-amount" className="mb-1 block text-sm font-medium text-slate-700">
              Amount
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500" aria-hidden>
                ₹
              </span>
              <input
                id="expense-amount"
                className={`${inputClass} pl-8 tabular-nums`}
                placeholder="0"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoComplete="off"
                aria-invalid={amount !== '' && cents === null}
                aria-describedby="expense-amount-hint"
                enterKeyHint="next"
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="expense-paid-by" className="mb-1 block text-sm font-medium text-slate-700">
              Paid by
            </label>
            <select
              id="expense-paid-by"
              className={inputClass}
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              <option value="" disabled>
                Choose…
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {amount !== '' && cents === null ? (
          <p id="expense-amount-hint" className="text-sm text-red-600">Enter an amount in rupees greater than 0, like 250 or 99.50.</p>
        ) : (
          cents !== null && (
            <p id="expense-amount-hint" className="text-sm text-slate-500">
              Split equally between {members.length} {members.length === 1 ? 'person' : 'people'}
              {members.length > 1 && (
                <>
                  : {describeShares(splitEqually(cents, members.map((m) => m.id), paidBy || undefined))}
                </>
              )}
            </p>
          )
        )}

        <button type="submit" className={primaryButtonClass} disabled={!canSubmit}>
          {saving ? 'Saving…' : 'Add expense'}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
