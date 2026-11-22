import type { KeyboardEvent } from 'react';

/**
 * Keyboard "Enter to next field" for forms.
 *
 * Attach to the element that wraps a form's fields (a <form> or a plain <div>):
 *
 *   <div onKeyDown={enterNavigation}> ... <Button data-enter-submit onClick={save}>Save</Button></div>
 *
 * - Enter in a field: if the field is invalid (required/min/max/pattern) the
 *   browser shows its message and focus stays; otherwise focus moves to the
 *   next fillable field.
 * - Enter in the last field: every field is checked; the first invalid one is
 *   focused. If all are valid, the `[data-enter-submit]` button is clicked
 *   (only when it is enabled), or the wrapping <form> is submitted.
 * - `data-enter-submit="focus"` only moves focus to the button (used for
 *   placing orders / paying, so Enter never places an order on its own).
 * - Shift+Enter moves to the previous field.
 * - A nested group with its own handler and submit button (OTP + Verify inside
 *   a bigger form) gets `data-enter-scope` so the outer form ignores its button.
 * - Textarea: Enter adds a new line, Ctrl/Cmd+Enter does the last-field action.
 * - Anything inside `[data-enter="ignore"]` keeps its own Enter behaviour
 *   (chips input, chat box, inline rename...). `[data-enter="skip"]` fields are
 *   left out of the jump order.
 */

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const FIELD_SELECTOR = 'input, select, textarea';
const NON_TEXT_INPUTS = new Set(['hidden', 'file', 'submit', 'button', 'reset', 'image', 'color', 'range']);

function isField(el: Element | null): el is Field {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
  );
}

function isNavigable(el: Field): boolean {
  if (el.disabled) return false;
  if (el.tabIndex < 0) return false;
  if (el instanceof HTMLInputElement) {
    if (NON_TEXT_INPUTS.has(el.type)) return false;
    if (el.readOnly) return false;
    if (el.type === 'radio') {
      // Treat a radio group as one stop: the checked radio, or the first one.
      const group = el.name
        ? Array.from(
            (el.form ?? el.ownerDocument).querySelectorAll<HTMLInputElement>(
              `input[type="radio"][name="${CSS.escape(el.name)}"]`,
            ),
          )
        : [el];
      const checked = group.find(r => r.checked);
      if (checked ? checked !== el : group[0] !== el) return false;
    }
  }
  if (el instanceof HTMLTextAreaElement && el.readOnly) return false;
  if (el.closest('[data-enter="skip"]')) return false;
  // Not rendered / visually hidden by display:none.
  if (el.getClientRects().length === 0) return false;
  return true;
}

function fieldsIn(container: HTMLElement): Field[] {
  return Array.from(container.querySelectorAll(FIELD_SELECTOR)).filter(
    (el): el is Field => isField(el) && isNavigable(el),
  );
}

function focusField(el: Field) {
  el.focus();
  if (
    el instanceof HTMLInputElement &&
    ['text', 'search', 'tel', 'url', 'email', 'number', 'password'].includes(el.type)
  ) {
    try {
      el.select();
    } catch {
      // number/email inputs may not support selection in some browsers
    }
  }
}

function runSubmit(container: HTMLElement) {
  const invalid = fieldsIn(container).find(f => !f.checkValidity());
  if (invalid) {
    invalid.focus();
    invalid.reportValidity();
    return;
  }

  // A page can render the same button twice (mobile bar + desktop card); use
  // the one that is actually on screen.
  // Buttons inside a nested [data-enter-scope] belong to that inner group
  // (e.g. an OTP "Verify" button inside a checkout page).
  const buttons = Array.from(
    container.querySelectorAll<HTMLButtonElement>('[data-enter-submit]'),
  ).filter(b => {
    const scope = b.closest('[data-enter-scope]');
    return !scope || scope === container || !container.contains(scope);
  });
  const button = buttons.find(b => b.getClientRects().length > 0) ?? buttons[0];
  if (button) {
    if (button.getAttribute('data-enter-submit') === 'focus' || button.disabled) {
      button.focus();
      return;
    }
    // Blur first so fields that save on blur commit before the button runs,
    // the same order as a mouse click.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    button.click();
    return;
  }

  const form = container instanceof HTMLFormElement ? container : container.querySelector('form');
  if (form) {
    const submitter = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitter?.disabled) {
      submitter.focus();
      return;
    }
    form.requestSubmit();
  }
}

export function enterNavigation(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Enter' || e.defaultPrevented) return;
  if (e.nativeEvent.isComposing) return;

  const target = e.target as HTMLElement;
  if (!isField(target)) return; // buttons, links, etc. keep native Enter
  if (target.closest('[data-enter="ignore"]')) return;
  // Color and range pickers keep the browser's own Enter behaviour.
  if (target instanceof HTMLInputElement && NON_TEXT_INPUTS.has(target.type)) return;

  const container = e.currentTarget;

  if (target instanceof HTMLTextAreaElement) {
    if (!(e.ctrlKey || e.metaKey)) return; // plain Enter = new line
    e.preventDefault();
    runSubmit(container);
    return;
  }

  if (e.altKey) return;
  e.preventDefault();

  const fields = fieldsIn(container);
  const index = fields.indexOf(target);
  // Read-only or [data-enter="skip"] field: just stop the native form submit.
  if (index < 0) return;

  if (e.shiftKey) {
    if (index > 0) focusField(fields[index - 1]);
    return;
  }

  if (!target.checkValidity()) {
    target.reportValidity();
    return;
  }

  // Ctrl/Cmd+Enter from any field = save straight away.
  if (e.ctrlKey || e.metaKey) {
    runSubmit(container);
    return;
  }

  const next = index >= 0 ? fields[index + 1] : undefined;
  if (next) {
    focusField(next);
    return;
  }

  runSubmit(container);
}
