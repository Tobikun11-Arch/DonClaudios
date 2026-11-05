export type Carrier = 'globe' | 'dito' | 'smart' | 'unknown';

// Starter lists only. Verify against the current NTC prefix assignments.
const GLOBE = [
  '0817',
  '0905',
  '0906',
  '0915',
  '0916',
  '0917',
  '0926',
  '0927',
  '0935',
  '0936',
  '0937',
  '0945',
  '0953',
  '0954',
  '0955',
  '0956',
  '0965',
  '0966',
  '0967',
  '0975',
  '0976',
  '0977',
  '0978',
  '0979',
  '0995',
  '0996',
  '0997'
];
const DITO = ['0895', '0896', '0897', '0898', '0991', '0992', '0993', '0994'];
const SMART = [
  '0907',
  '0908',
  '0909',
  '0910',
  '0912',
  '0913',
  '0914',
  '0918',
  '0919',
  '0920',
  '0921',
  '0928',
  '0929',
  '0930',
  '0931',
  '0938',
  '0939',
  '0940',
  '0946',
  '0947',
  '0948',
  '0949',
  '0950',
  '0951',
  '0961',
  '0968',
  '0969',
  '0970',
  '0981',
  '0989',
  '0992',
  '0998',
  '0999'
];

export function normalizePH(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (/^09\d{9}$/.test(digits)) return digits;
  if (/^639\d{9}$/.test(digits)) return '0' + digits.slice(2);
  if (/^9\d{9}$/.test(digits)) return '0' + digits;
  return null;
}

export function detectCarrier(local: string): Carrier {
  const prefix = local.slice(0, 4);
  if (DITO.includes(prefix)) return 'dito';
  if (GLOBE.includes(prefix)) return 'globe';
  if (SMART.includes(prefix)) return 'smart';
  return 'unknown';
}

export function toAppCarrier(carrier: Carrier): 'globe_dito' | 'smart_tnt' {
  return carrier === 'globe' || carrier === 'dito' ? 'globe_dito' : 'smart_tnt';
}