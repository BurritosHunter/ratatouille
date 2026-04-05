/**
 * Pick a URL for `<img src>` when the resource may be either bytes served from your app
 * (e.g. authenticated API route) or an external URL.
 */
export function imageSrcFromStoredOrExternal(params: {
  hasStored: boolean
  /** e.g. `/api/.../image` */
  storedSrc: string
  externalUrl: string | null
}): string | null {
  if (params.hasStored) return params.storedSrc
  return params.externalUrl
}
