/** Coerce DB bigint PKs to JS numbers for existing domain types (must stay within safe integer range). */
export function numberFromBigInt(value: bigint): number {
  const n = Number(value)
  if (!Number.isSafeInteger(n)) {
    throw new Error("Identifier out of safe integer range")
  }
  return n
}

export function bigIntId(id: number): bigint {
  if (!Number.isSafeInteger(id)) {
    throw new Error("Invalid id")
  }
  return BigInt(id)
}
