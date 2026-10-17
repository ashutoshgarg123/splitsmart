// The current group lives in the URL as ?group=<uuid>, so a link opens the same group.
const PARAM = 'group'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

export function getGroupIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(PARAM)
}

export function setGroupIdInUrl(id: string | null): void {
  const url = new URL(window.location.href)
  if (id) url.searchParams.set(PARAM, id)
  else url.searchParams.delete(PARAM)
  window.history.pushState(null, '', url)
}

export function groupShareUrl(id: string): string {
  const url = new URL(window.location.pathname, window.location.origin)
  url.searchParams.set(PARAM, id)
  return url.toString()
}
