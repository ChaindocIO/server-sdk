import { ChaindocError } from '../errors';

/**
 * One path segment from a caller-supplied id. Refuses what could leave its own route (empty, `.`, `..`)
 * before any request is sent, then percent-encodes the rest (so `a/b`, `?` and `#` stay inside the segment).
 * Ids are not restricted to UUIDs: some are numeric or prefixed.
 */
export function seg(id: string, name = 'id'): string {
  if (typeof id !== 'string' || id.length === 0 || id === '.' || id === '..') {
    throw new ChaindocError(`${name} must be a non-empty identifier (not "", "." or "..")`);
  }
  return encodeURIComponent(id);
}
