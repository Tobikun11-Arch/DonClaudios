import type {OrderType} from '@/app/store/orderDetailsStore';

type NotesCopy = {
  hint: string;
  placeholder: string;
  suggestions: string[];
};

/** Quick-note chips and copy per way of receiving the order. */
export const ORDER_NOTES_COPY: Record<OrderType, NotesCopy> = {
  Delivery: {
    hint: 'Delivery instructions (optional)',
    placeholder: 'Notes to rider',
    suggestions: ['Call upon arrival', 'Leave at gate', 'Ring the doorbell', 'Extra sauce on the side']
  },
  'Pick-up': {
    hint: 'Pick-up notes for the shop (optional)',
    placeholder: 'Notes for the shop',
    suggestions: ['Text me when ready', 'Extra sauce on the side', 'Pack sauces separately', 'Include utensils']
  },
  Reservation: {
    hint: 'Notes for your reservation (optional)',
    placeholder: 'Notes for the shop',
    suggestions: ['Birthday celebration', 'High chair needed', 'Extra sauce on the side', 'Senior / PWD in group']
  }
};

const ALL_SUGGESTIONS = new Set(Object.values(ORDER_NOTES_COPY).flatMap(c => c.suggestions));

function splitNotes(notes: string) {
  return notes
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export function hasNote(notes: string, suggestion: string) {
  return splitNotes(notes).includes(suggestion.trim());
}

/** Adds the chip's note, or removes it when it is already there. */
export function toggleNote(notes: string, suggestion: string) {
  const value = suggestion.trim();
  if (!value) return notes;
  const parts = splitNotes(notes);
  return parts.includes(value)
    ? parts.filter(s => s !== value).join(', ')
    : [...parts, value].join(', ');
}

/**
 * Drops chip notes that belong to another order type (e.g. "Leave at gate"
 * after switching to Pick-up). Notes the customer typed are kept.
 */
export function keepNotesFor(notes: string, orderType: OrderType) {
  const allowed = new Set(ORDER_NOTES_COPY[orderType].suggestions);
  return splitNotes(notes)
    .filter(s => !ALL_SUGGESTIONS.has(s) || allowed.has(s))
    .join(', ');
}
