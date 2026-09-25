export function printElement(element: HTMLElement, title: string): void {
  const popup = window.open('', '_blank', 'width=1200,height=900');
  if (!popup) return;

  const clone = element.cloneNode(true) as HTMLElement;
  const copyStyles = (source: Element, target: Element) => {
    const computed = window.getComputedStyle(source);
    for (let index = 0; index < computed.length; index += 1) {
      const property = computed.item(index);
      target instanceof HTMLElement || target instanceof SVGElement
        ? target.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property))
        : undefined;
    }
    Array.from(target.children).forEach((child, index) => {
      const sourceChild = source.children.item(index);
      if (sourceChild) copyStyles(sourceChild, child);
    });
  };
  copyStyles(element, clone);

  clone.querySelectorAll('section').forEach((section) => {
    const heading = section.querySelector('h1, h2, h3, h4');
    if (heading?.textContent?.trim().toLowerCase() === 'attachments') section.remove();
  });
  clone.querySelectorAll('.no-print, button, input, select, textarea, style, script').forEach((node) => node.remove());
  clone.style.setProperty('position', 'static', 'important');
  clone.style.setProperty('inset', 'auto', 'important');
  clone.style.setProperty('width', '100%', 'important');
  clone.style.setProperty('height', 'auto', 'important');
  clone.style.setProperty('max-height', 'none', 'important');
  clone.style.setProperty('overflow', 'visible', 'important');
  clone.style.setProperty('margin', '0', 'important');
  clone.style.setProperty('background', '#ffffff', 'important');
  clone.style.setProperty('color', '#111827', 'important');

  const doc = popup.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page { size: A4 portrait; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111827; }
    body { padding: 10mm; font-family: Arial, sans-serif; }
    *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .print-root { width: 100%; }
    .print-root section, .print-root header { break-inside: avoid; }
    .print-root table { width: 100%; border-collapse: collapse; }
    .print-root th, .print-root td { vertical-align: top; }
    @media print { body { padding: 0; } }
  </style></head><body></body></html>`);
  doc.title = title;
  doc.body.appendChild(clone);
  clone.classList.add('print-root');
  popup.onload = () => {
    void Promise.all([popup.document.fonts.ready, ...Array.from(popup.document.images).map((image) => image.decode().catch(() => undefined))])
      .then(() => window.setTimeout(() => { popup.focus(); popup.print(); }, 100));
  };
  popup.onafterprint = () => popup.close();
  doc.close();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}
