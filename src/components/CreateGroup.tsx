import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { inputClass, primaryButtonClass } from './ui'

type Props = {
  onCreated: (groupId: string) => void
}

const STEPS = [
  { icon: '👥', title: 'Add your people', text: 'Just names. No sign-ups.' },
  { icon: '🧾', title: 'Log who paid', text: 'Each bill is split equally.' },
  { icon: '✅', title: 'Settle up', text: 'See exactly who pays whom.' },
]

export function CreateGroup({ onCreated }: Props) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setSaving(true)
    setError(null)
    const { data, error } = await supabase.from('groups').insert({ name: trimmed }).select('id').single()
    setSaving(false)

    if (error) {
      setError(`Couldn't create the group: ${error.message}`)
      return
    }
    onCreated(data.id)
  }

  return (
    <div className="flex flex-col gap-8 pt-2 sm:pt-8">
      <section>
        <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance">
          Split shared costs. <span className="text-brand-600">Settle up fast.</span>
        </h1>
        <p className="mt-3 text-slate-600">
          For trips, flatmates and dinners out. Log who paid, and SplitSmart tells everyone exactly who owes
          whom, in rupees, with the fewest payments.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="group-name" className="text-sm font-semibold text-slate-700">
          Start by naming your group
        </label>
        <input
          id="group-name"
          className={inputClass}
          placeholder="e.g. Goa trip, Flat 4B, Friday dinner"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoComplete="off"
          enterKeyHint="go"
        />
        <button type="submit" className={primaryButtonClass} disabled={saving || !name.trim()}>
          {saving ? 'Creating…' : 'Create group →'}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <p className="text-xs text-slate-500">Free, no account needed. Anyone with your group’s link can view and add to it.</p>
      </form>

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          How it works
        </h2>
        <ol className="mt-3 flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-xl" aria-hidden>
                {step.icon}
              </span>
              <div>
                <p className="font-medium">
                  {i + 1}. {step.title}
                </p>
                <p className="text-sm text-slate-600">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
