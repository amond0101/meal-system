// School email local-part is 9 digits: 4-digit enrollment year + 5-digit
// student number (1 digit grade + 2 digit class + 2 digit number-in-class),
// e.g. 202621105@bmt.hs.kr -> year 2026, student_no 21105 (2학년 11반 5번).
export function parseStudentNoFromEmail(email: string): string | null {
  const local = email.split("@")[0];
  if (!/^\d{9}$/.test(local)) return null;
  return local.slice(4);
}
