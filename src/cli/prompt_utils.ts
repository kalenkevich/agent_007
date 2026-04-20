export type UserAction = 'accept' | 'decline';

/**
 * Checks if a user answer means "yes".
 * Matches "yes", "y", and "accept" (case-insensitive).
 * Can specify a default value for empty input.
 */
export function isYes(answer: string, defaultYes = false): boolean {
  const trimmed = answer.trim().toLowerCase();
  if (trimmed === '') return defaultYes;
  return trimmed === 'yes' || trimmed === 'y' || trimmed === 'accept';
}

/**
 * Parses a user answer to determine if it should be treated as an acceptance or decline.
 */
export function parseUserAction(answer: string): UserAction {
  return isYes(answer) ? 'accept' : 'decline';
}
