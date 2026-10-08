type Key = { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean };

/** Only intercept grid commands when focus belongs to the sheet. */
export function workbookShortcut(event: Key, inGrid: boolean, range: boolean) {
  if (event.altKey) return null;
  const key = event.key.toLowerCase();
  const mod = event.ctrlKey || event.metaKey;
  if (mod && key === 's') return 'save';
  if (mod && key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (mod && key === 'y') return 'redo';
  if (event.ctrlKey && key === 'tab') return 'workbook';
  if (!inGrid) return null;
  if (mod && !event.shiftKey) {
    switch (key) {
      case 'b': return 'bold';
      case 'i': return 'italic';
      case 'u': return 'underline';
      case 'd': return 'down';
      case 'r': return 'right';
      case 'a': return 'all';
      case 'home': return 'home';
      case ' ': return 'column';
    }
  }
  if (!mod && event.shiftKey && key === ' ') return 'row';
  // A single cell is a text editor: preserve normal character deletion.
  if (!mod && !event.shiftKey && range && (key === 'delete' || key === 'backspace')) return 'clear';
  return null;
}
