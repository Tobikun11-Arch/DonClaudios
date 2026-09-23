export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getVerificationExpiry(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}