import { Candidate } from '../services/openrouter';

export interface SavedMatch {
  id: string; // Unique timestamp
  updatedAt: number;
  phase: 'setup' | 'tournament' | 'result';
  initialPrompt: string;
  enhancedPrompt: string;
  rounds: number;
  matchIndex: number;
  bracket: any; // BracketNode
  currentMatchNodeId: string | null;
  candidates?: {
    left: Candidate | 'generate';
    right: Candidate | 'generate';
  } | null;
  isGenerating?: boolean;
  winner: Candidate | null;
}

const STORAGE_KEY = 'webby_saved_matches';

export function getSavedMatches(): SavedMatch[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const matches: SavedMatch[] = JSON.parse(data);
    return matches.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error('Failed to parse saved matches:', err);
    return [];
  }
}

export function saveMatch(match: SavedMatch): void {
  const matches = getSavedMatches();
  const existingIndex = matches.findIndex((m) => m.id === match.id);

  if (existingIndex >= 0) {
    matches[existingIndex] = match;
  } else {
    matches.push(match);
  }

  // Sort newest to oldest based on updatedAt
  matches.sort((a, b) => b.updatedAt - a.updatedAt);

  let success = false;
  let currentMatches = [...matches];

  while (!success && currentMatches.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentMatches));
      success = true;
    } catch (err: any) {
      // Check for QuotaExceededError or its variations
      const isQuotaExceeded =
        (err instanceof DOMException &&
          (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) ||
        (err && typeof err.name === 'string' && err.name.toLowerCase().includes('quota')) ||
        (err && typeof err.message === 'string' && err.message.toLowerCase().includes('quota'));

      if (isQuotaExceeded) {
        if (currentMatches.length > 1) {
          // LRU cleanup: remove the oldest match
          currentMatches.pop();
          console.warn('LocalStorage quota exceeded. Removed oldest match to free space...');
        } else {
          console.error('Failed to save match: The match data alone exceeds localStorage quota.');
          break;
        }
      } else {
        console.error('Failed to save to localStorage:', err);
        break;
      }
    }
  }
}

export function deleteMatches(ids: string[]): void {
  const matches = getSavedMatches();
  const filtered = matches.filter((m) => !ids.includes(m.id));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete matches:', err);
  }
}

/**
 * Traverses a bracket to find the best candidate to preview.
 * Prefers the final winner or looks for the deepest generated candidate available.
 */
export function getHighestCandidate(bracket: any): Candidate | null {
  if (!bracket) return null;

  const queue = [bracket];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;

    if (node.candidate && node.candidate !== 'generate') {
      return node.candidate as Candidate;
    }

    if (node.left) queue.push(node.left);
    if (node.right) queue.push(node.right);
  }

  return null;
}
