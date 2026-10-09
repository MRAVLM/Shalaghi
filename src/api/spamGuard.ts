// Anti-spam guard: when the session crack count passes thresholds, the app
// answers with a playful "stop it, boss" nudge instead of staying silent.
// Pure logic (DOM-free) so it is unit-tested.

export const SPAM_THRESHOLDS = [6, 12, 20] as const;

// Returns the spam level for a session crack total: 0 = fine, 1..3 = nudge.
export function spamLevel(totalCracks: number): 0 | 1 | 2 | 3 {
  if (totalCracks >= SPAM_THRESHOLDS[2]) {
    return 3;
  }
  if (totalCracks >= SPAM_THRESHOLDS[1]) {
    return 2;
  }
  if (totalCracks >= SPAM_THRESHOLDS[0]) {
    return 1;
  }
  return 0;
}
