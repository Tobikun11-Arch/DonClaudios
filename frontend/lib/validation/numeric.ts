export function sanitizeInteger(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

export function sanitizeDecimal(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join('')}`;
}

export function sanitizePhone(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

export function sanitizeName(value: string): string {
  return value.replace(/[0-9]/g, '');
}
