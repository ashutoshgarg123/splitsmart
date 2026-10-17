import { useEffect, useState } from 'react'
import { CreateGroup } from './components/CreateGroup'
import { GroupScreen } from './components/GroupScreen'
import { getGroupIdFromUrl, setGroupIdInUrl } from './lib/groupUrl'

export default function App() {
  const [groupId, setGroupId] = useState(getGroupIdFromUrl)

  // Keep in sync with the browser's back/forward buttons.
  useEffect(() => {
    const onPopState = () => setGroupId(getGroupIdFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function openGroup(id: string | null) {
    setGroupIdInUrl(id)
    setGroupId(id)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900 antialiased">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <button
            type="button"
            onClick={() => openGroup(null)}
            className="flex items-center gap-2"
            aria-label="SplitSmart home"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-white">
              S
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Split<span className="text-brand-600">Smart</span>
            </span>
          </button>
          {groupId && (
            <button
              type="button"
              onClick={() => openGroup(null)}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              New group
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {groupId ? (
          <GroupScreen key={groupId} groupId={groupId} onStartOver={() => openGroup(null)} />
        ) : (
          <CreateGroup onCreated={openGroup} />
        )}
      </main>
    </div>
  )
}
