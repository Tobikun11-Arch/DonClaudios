export function phoneVariants(input: string): string[] {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');

  let national: string | null = null;
  let intl: string | null = null;

  if (/^0\d{10}$/.test(digits)) {
    national = digits;
    intl = '63' + digits.slice(1);
  } else if (/^63\d{10}$/.test(digits)) {
    intl = digits;
    national = '0' + digits.slice(2);
  }

  const plusIntl = intl ? '+' + intl : null;

  const variants: string[] = [trimmed];
  if (national) variants.push(national);
  if (intl) variants.push(intl);
  if (plusIntl) variants.push(plusIntl);

  return Array.from(new Set(variants));
}