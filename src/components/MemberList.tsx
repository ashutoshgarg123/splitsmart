import { useState, type FormEvent } from 'react'
import type { Tables } from '../lib/database.types'
import { supabase } from '../lib/supabase'
import { EmptyState } from './EmptyState'
import { inputClass, primaryButtonClass } from './ui'

type Member = Tables<'members'>

type MemberListProps = {
  groupId: string
  members: Member[]
  onAdded: (member: Member) => void
}

export function MemberList({ groupId, members, onAdded }: MemberListProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`${trimmed} is already in this group.`)
      return
    }

    setSaving(true)
    setError(null)
    const { data, error } = await supabase
      .from('members')
      .insert({ group_id: groupId, name: trimmed })
      .select('*')
      .single()
    setSaving(false)

    if (error) {
      setError(`Couldn't add ${trimmed}: ${error.message}`)
      return
    }
    onAdded(data)
    setName('')
  }

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Who’s sharing costs?</h2>
        <span className="text-sm text-slate-500">{members.length}</span>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <label htmlFor="member-name" className="sr-only">
          Member name
        </label>
        <input
          id="member-name"
          className={inputClass}
          placeholder="Add a name, e.g. Priya"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          maxLength={60}
          autoComplete="off"
          enterKeyHint="done"
          autoFocus={members.length === 0}
        />
        <button type="submit" className={primaryButtonClass} disabled={saving || !name.trim()}>
          {saving ? 'Adding…' : 'Add'}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {members.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon="👥" title="No one here yet" text="Add a name for each person, including yourself. Just first names are fine." />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700"
                aria-hidden
              >
                {m.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 break-words">{m.name}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
