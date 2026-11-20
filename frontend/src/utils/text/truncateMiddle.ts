export const truncateMiddle = (text: string, maxChars = 52): string => {
  if (text.length <= maxChars) return text;
  const keep = maxChars - 3;
  const head = Math.ceil(keep / 2);
  const tail = Math.floor(keep / 2);
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
};