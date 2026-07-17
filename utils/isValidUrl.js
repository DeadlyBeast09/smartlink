/**
 * Validates that a string is a well-formed http/https URL.
 *
 * Why use the built-in URL constructor instead of a regex:
 * - URL parsing has endless edge cases (IPv6 hosts, punycode domains,
 *   query encoding...). The WHATWG URL API (built into Node) handles
 *   these correctly; a hand-rolled regex will eventually be wrong.
 * - We still restrict to http/https explicitly, because the URL
 *   constructor would happily accept "javascript:alert(1)" or
 *   "ftp://..." as "valid" — see docs/08-security.md (open redirect /
 *   protocol-smuggling prevention).
 *
 * @param {string} value
 * @returns {boolean}
 */
const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};


export {isValidUrl};