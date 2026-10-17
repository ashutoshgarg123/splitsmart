import { useEffect, useState } from 'react'
import type { Tables } from '../lib/database.types'
import { isUuid } from '../lib/groupUrl'
import { supabase } from '../lib/supabase'
import { AddExpenseForm } from './AddExpenseForm'
import { BalancesView, type Balance } from './BalancesView'
import { ExpenseList, type ExpenseWithSplits } from './ExpenseList'
import { MemberList } from './MemberList'
import { ShareLink } from './ShareLink'
import { primaryButtonClass } from './ui'

type Group = Tables<'groups'>
type Member = Tables<'members'>
type Tab = 'balances' | 'expenses' | 'members'

type Props = {
  groupId: string
  onStartOver: () => void
}

type LoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; group: Group }

const byName = (a: Member, b: Member) => a.name.localeCompare(b.name)

function fetchBalances(groupId: string) {
  return supabase
    .from('balances')
    .select('member_id, name, total_paid_cents, total_share_cents, net_cents')
    .eq('group_id', groupId)
}

type BalanceRows = NonNullable<Awaited<ReturnType<typeof fetchBalances>>['data']>

// The view's columns come back typed as nullable; drop anything incomplete.
function toBalances(rows: BalanceRows): Balance[] {
  return rows.flatMap((r) =>
    r.member_id && r.name != null && r.total_paid_cents != null && r.total_share_cents != null && r.net_cents != null
      ? [
          {
            memberId: r.member_id,
            name: r.name,
            paidCents: r.total_paid_cents,
            shareCents: r.total_share_cents,
            netCents: r.net_cents,
          },
        ]
      : [],
  )
}

export function GroupScreen({ groupId, onStartOver }: Props) {
  // A malformed id can never match a group, so skip the request entirely.
  const [state, setState] = useState<LoadState>(() =>
    isUuid(groupId) ? { status: 'loading' } : { status: 'not-found' },
  )
  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('balances')

  useEffect(() => {
    if (!isUuid(groupId)) return

    let cancelled = false
    async function load() {
      const [groupRes, membersRes, expensesRes, balancesRes] = await Promise.all([
        supabase.from('groups').select('*').eq('id', groupId).maybeSingle(),
        supabase.from('members').select('*').eq('group_id', groupId),
        supabase
          .from('expenses')
          .select('*, expense_splits(member_id)')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false }),
        fetchBalances(groupId),
      ])
      if (cancelled) return

      const error = groupRes.error ?? membersRes.error ?? expensesRes.error ?? balancesRes.error
      if (error) setState({ status: 'error', message: error.message })
      else if (!groupRes.data) setState({ status: 'not-found' })
      else {
        const loadedMembers = [...(membersRes.data ?? [])].sort(byName)
        setMembers(loadedMembers)
        setExpenses(expensesRes.data ?? [])
        setBalances(toBalances(balancesRes.data ?? []))
        // A brand-new group has nothing to balance yet, so start where the work is.
        if (loadedMembers.length === 0) setTab('members')
        setState({ status: 'ready', group: groupRes.data })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [groupId])

  // Balances come from the database view, so re-read it after anything changes.
  async function refreshBalances() {
    const { data, error } = await fetchBalances(groupId)
    if (error) setBalanceError(`Couldn't refresh balances: ${error.message}`)
    else {
      setBalanceError(null)
      setBalances(toBalances(data))
    }
  }

  if (state.status === 'loading') {
    return <GroupSkeleton />
  }

  if (state.status === 'not-found' || state.status === 'error') {
    return (
      <section className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-xl font-semibold">
          {state.status === 'not-found' ? 'Group not found' : 'Something went wrong'}
        </h1>
        <p className="mt-2 max-w-xs text-slate-600">
          {state.status === 'not-found'
            ? 'This link doesn’t match any group. Check the link, or start a new group.'
            : state.message}
        </p>
        <button type="button" onClick={onStartOver} className={`mt-6 ${primaryButtonClass}`}>
          Start a new group
        </button>
      </section>
    )
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'balances', label: 'Balances' },
    { id: 'expenses', label: 'Expenses', count: expenses.length },
    { id: 'members', label: 'People', count: members.length },
  ]

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight break-words">{state.group.name}</h1>

      <div role="tablist" aria-label="Group sections" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`h-10 rounded-lg text-sm font-medium transition ${
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
            {t.count ? <span className="ml-1 text-slate-400">{t.count}</span> : null}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex flex-col gap-6">
        {balanceError && (
          <p role="alert" className="text-sm text-red-600">
            {balanceError}
          </p>
        )}

        {tab === 'balances' && (
          <BalancesView
            balances={balances}
            hasExpenses={expenses.length > 0}
            expensesTotalCents={expenses.reduce((sum, e) => sum + e.amount_cents, 0)}
            onAddExpense={() => setTab('expenses')}
            onAddMembers={() => setTab('members')}
          />
        )}

        {tab === 'expenses' && (
          <>
            <AddExpenseForm
              groupId={groupId}
              members={members}
              onAdded={(e) => {
                setExpenses((prev) => [e, ...prev])
                refreshBalances()
              }}
            />
            <ExpenseList expenses={expenses} members={members} />
          </>
        )}

        {tab === 'members' && (
          <>
            <MemberList
              groupId={groupId}
              members={members}
              onAdded={(m) => {
                setMembers((prev) => [...prev, m].sort(byName))
                refreshBalances()
              }}
            />
            {members.length > 0 && (
              <button type="button" onClick={() => setTab('expenses')} className={primaryButtonClass}>
                Next: add an expense →
              </button>
            )}
            <ShareLink groupId={groupId} groupName={state.group.name} />
          </>
        )}
      </div>
    </div>
  )
}

function GroupSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5" role="status" aria-label="Loading group">
      <div className="h-8 w-2/3 rounded-lg bg-slate-200" />
      <div className="h-12 rounded-xl bg-slate-200" />
      <div className="h-12 rounded-xl bg-slate-200" />
      <div className="h-32 rounded-2xl bg-slate-200" />
      <div className="h-40 rounded-2xl bg-slate-200" />
    </div>
  )
}
