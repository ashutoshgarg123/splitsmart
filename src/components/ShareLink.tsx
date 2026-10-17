import { useState } from 'react'
import { groupShareUrl } from '../lib/groupUrl'
import { secondaryButtonClass } from './ui'

type Props = {
  groupId: string
  groupName: string
}

export function ShareLink({ groupId, groupName }: Props) {
  const url = groupShareUrl(groupId)
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator.share === 'function'

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked (e.g. non-secure context); the link is still selectable.
      setCopied(false)
    }
  }

  async function share() {
    try {
      await navigator.share({ title: `${groupName} on SplitSmart`, url })
    } catch {
      // User dismissed the share sheet.
    }
  }

  return (
    <section className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
      <h2 className="text-sm font-semibold text-brand-700">Share this group</h2>
      <p className="mt-1 text-sm text-slate-600">Anyone with this link can open the group.</p>
      <div className="mt-3 flex flex-col gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Shareable group link"
          className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
        />
        <div className="flex gap-2 *:flex-1">
          <button type="button" onClick={copy} className={secondaryButtonClass}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {canShare && (
            <button type="button" onClick={share} className={secondaryButtonClass}>
              Share
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
