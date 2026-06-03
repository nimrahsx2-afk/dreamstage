/**
 * State machine definitions for event approval workflow.
 * All state transitions must be validated against these rules.
 */

import { EVENT_STATUS, EventStatus } from './constants';

type StateTransitionMap = Record<EventStatus, EventStatus[]>;

/**
 * Valid state transitions for events.
 * - draft → approved (client approval)
 * - approved → locked (auto-lock on approval)
 * - locked → approved (planner unlock with confirmation)
 */
export const EVENT_STATE_TRANSITIONS: StateTransitionMap = {
  [EVENT_STATUS.DRAFT]: [EVENT_STATUS.APPROVED],
  [EVENT_STATUS.APPROVED]: [EVENT_STATUS.LOCKED],
  [EVENT_STATUS.LOCKED]: [EVENT_STATUS.APPROVED],
};

/**
 * Check if a state transition is valid.
 */
export function canTransition(from: EventStatus, to: EventStatus): boolean {
  const allowedTransitions = EVENT_STATE_TRANSITIONS[from];
  return allowedTransitions?.includes(to) ?? false;
}

/**
 * Get all valid next states from current state.
 */
export function getValidNextStates(current: EventStatus): EventStatus[] {
  return EVENT_STATE_TRANSITIONS[current] ?? [];
}
