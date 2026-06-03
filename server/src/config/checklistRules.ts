/**
 * Auto-generated checklist items based on days remaining until event.
 * These are system-generated and cannot be deleted by planners.
 */

export interface ChecklistRule {
  daysBeforeEvent: number;
  title: string;
  description: string;
}

/**
 * System-generated checklist items.
 * Items are created when event date is set, based on days remaining.
 */
export const CHECKLIST_RULES: ChecklistRule[] = [
  {
    daysBeforeEvent: 30,
    title: 'Confirm venue booking',
    description: 'Ensure venue is confirmed and deposit paid',
  },
  {
    daysBeforeEvent: 21,
    title: 'Finalize vendor contracts',
    description: 'All vendor agreements should be signed',
  },
  {
    daysBeforeEvent: 14,
    title: 'Finalize vendor payments',
    description: 'Ensure all deposits are paid and final payments scheduled',
  },
  {
    daysBeforeEvent: 10,
    title: 'Confirm final headcount',
    description: 'Get final guest count from client',
  },
  {
    daysBeforeEvent: 7,
    title: 'Review final layout with client',
    description: 'Walk through 3D design and get final approval',
  },
  {
    daysBeforeEvent: 3,
    title: 'Confirm delivery schedule',
    description: 'Verify all vendor delivery times and setup schedules',
  },
  {
    daysBeforeEvent: 1,
    title: 'Confirm day-of timeline',
    description: 'Final review of event timeline with all parties',
  },
];

/**
 * Generate checklist items for an event based on its date.
 */
export function generateChecklistItems(eventDate: Date): Array<{
  title: string;
  description: string;
  dueDate: Date;
}> {
  const now = new Date();
  const daysUntilEvent = Math.ceil(
    (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return CHECKLIST_RULES
    .filter(rule => rule.daysBeforeEvent <= daysUntilEvent)
    .map(rule => {
      const dueDate = new Date(eventDate);
      dueDate.setDate(dueDate.getDate() - rule.daysBeforeEvent);
      return {
        title: rule.title,
        description: rule.description,
        dueDate,
      };
    });
}
