const DEFAULT_MAX_BYTES = 2 * 1024 * 1024

const DEFAULT_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

export type ParsedImageUpload = {
  buffer: Buffer
  mime: string
}

export type ParseImageUploadOptions = {
  maxBytes?: number
  allowedMime?: ReadonlySet<string>
}

/** Validates size, MIME, and reads a browser `File` into a Node buffer (e.g. server actions). */
export async function parseImageUpload(
  raw: unknown,
  options?: ParseImageUploadOptions,
): Promise<ParsedImageUpload | null> {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES
  const allowedMime = options?.allowedMime ?? DEFAULT_ALLOWED_MIME
  if (!(raw instanceof File) || raw.size === 0) return null
  if (raw.size > maxBytes) return null
  const mime = raw.type || "application/octet-stream"
  if (!allowedMime.has(mime)) return null
  const arrayBuffer = await raw.arrayBuffer()
  return { buffer: Buffer.from(arrayBuffer), mime }
}
