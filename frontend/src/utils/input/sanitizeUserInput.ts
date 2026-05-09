const LETTERS_DIGITS_WHITESPACE_RE = /[^\p{L}\p{N}\s]/gu;

/** Display names, titles, search, bookmarks: Unicode letters, digits, and whitespace only. */
export const sanitizeLettersDigitsAndWhitespace = (value: string) => value.replace(LETTERS_DIGITS_WHITESPACE_RE, "");

/** Library / disk paths: letters, digits, whitespace, and common path separators (still blocks quotes, globs, etc.). */
const PATH_SAFE_RE = /[^\p{L}\p{N}\s\-_.:\/\\]/gu;

export const sanitizePathInput = (value: string) => value.replace(PATH_SAFE_RE, "");

export const sanitizeDigitsOnlyInput = (value: string) => value.replace(/\D/g, "");

/** Model / voice identifiers: ASCII letters, digits, dot, underscore, hyphen. */
const TECH_ID_RE = /[^a-zA-Z0-9._-]/g;

export const sanitizeTechnicalIdInput = (value: string) => value.replace(TECH_ID_RE, "");
