/**
 * Accordion: each row is one item, cell 1 = question (summary), cell 2 = answer.
 * Renders native details/summary so it works without JS state and is keyboard accessible.
 * @param {Element} block
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const [label, body] = [...row.children];
    if (!label || !body) return;
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.append(...label.childNodes);
    const content = document.createElement('div');
    content.className = 'accordion-body';
    content.append(...body.childNodes);
    details.append(summary, content);
    row.replaceWith(details);
  });
}
