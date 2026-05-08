export const documentHasNonCollapsedTextSelection = (doc: Document) => {
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount < 1) return false;
  if (sel.isCollapsed) return false;
  return sel.toString().replace(/\u00a0/g, " ").trim().length > 0;
};
