
import { nanoid } from "nanoid";
/**
 * Generates a short, URL-safe, random ID.
 *
 * Why nanoid over Math.random() or incrementing counters:
 * - nanoid is cryptographically strong (uses crypto under the hood),
 *   so IDs aren't easily guessable/enumerable (Math.random() is NOT
 *   suitable for anything user-facing where guessability matters).
 * - It's URL-safe by default (no characters that need encoding).
 * - It's collision-resistant: with length 7 and ~64 possible chars,
 *   you'd need ~3.4 billion IDs before a 1% chance of a single collision
 *   (birthday paradox). See docs/05-url-shortening-deep-dive.md for the math.
 *
 * Why not a sequential counter (1, 2, 3...) converted to base62:
 * - Sequential IDs leak information (competitors can estimate your traffic
 *   volume by watching ID growth) and are trivially enumerable.
 * - They also require a single source of truth for "next number," which
 *   becomes a contention point at scale (see docs/10-system-design.md).
 *
 * @param {number} length - length of the generated ID (default 7)
 * @returns {string} short id, e.g. "aZ3kP9x"
 */
const generateShortId = (length = 7) => nanoid(length);


export {generateShortId}