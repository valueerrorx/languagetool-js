// org.apache.commons.lang3.StringUtils subset used by ported code.

// Java: StringUtils#replaceOnce(String,String,String)
export function replaceOnce(text, searchString, replacement) {
  if (text === null || text === undefined || text.length === 0 || searchString === null || searchString === undefined || searchString.length === 0 || replacement === null || replacement === undefined) return text;
  const start = text.indexOf(searchString);
  if (start === -1) return text;
  return text.slice(0, start) + replacement + text.slice(start + searchString.length);
}
