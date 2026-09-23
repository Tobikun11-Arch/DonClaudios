'use client';

import {Check, X} from 'lucide-react';
import {evaluatePassword} from '@/lib/utils/passwordRules';
import {cn} from '@/lib/utils';

function getStrength(met: number, total: number): 'Weak' | 'Medium' | 'Strong' {
  if (met === total || met >= 5) return 'Strong';
  if (met >= 3) return 'Medium';
  return 'Weak';
}

export default function PasswordStrengthChecklist({value}: {value: string}) {
  if (!value) return null;

  const results = evaluatePassword(value);
  const met = results.filter(r => r.met).length;
  const strength = getStrength(met, results.length);
  const barColor =
    strength === 'Strong'
      ? 'bg-emerald-500'
      : strength === 'Medium'
        ? 'bg-amber-500'
        : 'bg-red-500';
  const labelColor =
    strength === 'Strong'
      ? 'text-emerald-600'
      : strength === 'Medium'
        ? 'text-amber-600'
        : 'text-red-600';

  return (
    <div className="mt-2 space-y-2">
      <ul className="space-y-1">
        {results.map(rule => (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-2 text-xs font-medium',
              rule.met ? 'text-emerald-600' : 'text-gray-500'
            )}
          >
            {rule.met ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 text-red-400" />
            )}
            {rule.label}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{width: `${(met / results.length) * 100}%`}}
          />
        </div>
        <span className={cn('text-xs font-semibold', labelColor)}>
          {strength}
        </span>
      </div>
    </div>
  );
}