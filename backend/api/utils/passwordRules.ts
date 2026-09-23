// Shared password rules. Keep identical to
// frontend/lib/utils/passwordRules.ts
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  specialChars: '!@#$%^&*()-_+='
} as const;

export type PasswordRule = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'minLength',
    label: `At least ${PASSWORD_REQUIREMENTS.minLength} characters`,
    test: value => value.length >= PASSWORD_REQUIREMENTS.minLength
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter (A-Z)',
    test: value => /[A-Z]/.test(value)
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter (a-z)',
    test: value => /[a-z]/.test(value)
  },
  {
    id: 'number',
    label: 'One number (0-9)',
    test: value => /[0-9]/.test(value)
  },
  {
    id: 'special',
    label: `One special character (${PASSWORD_REQUIREMENTS.specialChars})`,
    test: value => /[!@#$%^&*()\-_+=]/.test(value)
  },
  {
    id: 'noSpaces',
    label: 'No spaces',
    test: value => !/\s/.test(value)
  }
];

export type PasswordRuleResult = {
  id: string;
  label: string;
  met: boolean;
};

export function evaluatePassword(value: string): PasswordRuleResult[] {
  return PASSWORD_RULES.map(rule => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(value)
  }));
}

export function validatePassword(value: string) {
  const results = evaluatePassword(value);
  const unmet = results.filter(r => !r.met).map(r => r.label);
  return {valid: unmet.length === 0, unmet};
}