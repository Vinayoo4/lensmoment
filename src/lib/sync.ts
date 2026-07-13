import { OfflineAction } from '../shared/types';

// Simple helper to generate a unique hash for duplicate prevention
export function generateActionHash(type: string, payload: any): string {
  const str = JSON.stringify({ type, payload });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `hash_${Math.abs(hash)}`;
}

export function getOfflineQueue(): OfflineAction[] {
  try {
    const data = localStorage.getItem('quantify_offline_queue');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineAction[]): void {
  try {
    localStorage.setItem('quantify_offline_queue', JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline queue', e);
  }
}

export function getFailedQueue(): OfflineAction[] {
  try {
    const data = localStorage.getItem('quantify_failed_queue');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveFailedQueue(queue: OfflineAction[]): void {
  try {
    localStorage.setItem('quantify_failed_queue', JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save failed queue', e);
  }
}

/**
 * Pushes a new mutation action to the offline queue if offline.
 * Prevents duplicates by verifying the action's hash.
 */
export function queueAction(
  type: OfflineAction['type'],
  payload: any
): { action: OfflineAction; queued: boolean } {
  const queue = getOfflineQueue();
  const hash = generateActionHash(type, payload);

  // Avoid duplicates in the active queue
  const duplicate = queue.find(item => item.duplicateHash === hash);
  if (duplicate) {
    return { action: duplicate, queued: false };
  }

  const newAction: OfflineAction = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    payload,
    timestamp: Date.now(),
    duplicateHash: hash
  };

  queue.push(newAction);
  saveOfflineQueue(queue);

  return { action: newAction, queued: true };
}
