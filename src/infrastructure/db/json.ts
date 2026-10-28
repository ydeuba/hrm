import type { InputJsonValue } from '@prisma/client/runtime/client';

/**
 * Convert a plain, JSON-serialisable value into Prisma's JSON input type.
 * Round-tripping strips undefined/functions so what is stored equals what is read back.
 */
export function toJson(value: unknown): InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as InputJsonValue;
}
