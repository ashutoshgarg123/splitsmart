import { primaryButtonClass } from './ui'

type Props = {
  icon: string
  title: string
  text: string
  action?: { label: string; onClick: () => void }
}

/** The one empty-state style used everywhere in the app. */
export function EmptyState({ icon, title, text, action }: Props) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-8 text-center">
      <div className="mb-3 grid size-14 place-items-center rounded-full bg-brand-100 text-2xl" aria-hidden>
        {icon}
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-slate-600">{text}</p>
      {action && (
        <button type="button" onClick={action.onClick} className={`mt-5 ${primaryButtonClass}`}>
          {action.label}
        </button>
      )}
    </div>
  )
}
