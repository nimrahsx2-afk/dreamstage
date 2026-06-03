// Event Checklist Page - Checklist items, milestones, day-of timeline

import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Check, Square, CheckSquare, Plus, Trash2, Target, Clock } from 'lucide-react';
import * as checklistApi from './checklist.api';
import type { ChecklistItem, Milestone, TimelineEntry } from './checklist.api';

interface OutletContext {
  event: { id: string; eventDate: string };
  reload: () => Promise<void>;
}

export function EventChecklistPage() {
  const { eventId } = useParams<{ eventId: string }>();
  useOutletContext<OutletContext>();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'checklist' | 'milestones' | 'timeline'>(
    'checklist'
  );

  // Add item form
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDueDate, setNewItemDueDate] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Add milestone form
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);

  // Add timeline form
  const [newTimelineSlot, setNewTimelineSlot] = useState('09:00');
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [newTimelineDesc, setNewTimelineDesc] = useState('');
  const [isAddingTimeline, setIsAddingTimeline] = useState(false);

  const loadAll = async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);
      const [itemsRes, milestonesRes, timelineRes] = await Promise.all([
        checklistApi.getChecklistItems(eventId),
        checklistApi.getMilestones(eventId),
        checklistApi.getTimelineEntries(eventId),
      ]);
      setItems(itemsRes);
      setMilestones(milestonesRes);
      setTimeline(timelineRes);
    } catch (err) {
      console.error('Failed to load checklist data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [eventId]);

  const handleToggleItem = async (item: ChecklistItem) => {
    if (!eventId) return;
    try {
      const updated = await checklistApi.toggleChecklistItem(
        eventId,
        item.id,
        !item.isComplete
      );
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? updated : i))
      );
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !newItemTitle.trim()) return;
    setIsAddingItem(true);
    try {
      const added = await checklistApi.addChecklistItem(
        eventId,
        newItemTitle.trim(),
        newItemDueDate || null
      );
      setItems((prev) => [...prev, added].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }));
      setNewItemTitle('');
      setNewItemDueDate('');
    } catch (err) {
      console.error('Add item failed:', err);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleDeleteItem = async (item: ChecklistItem) => {
    if (!eventId || item.isSystemGenerated) return;
    if (!window.confirm('Delete this item?')) return;
    try {
      await checklistApi.deleteChecklistItem(eventId, item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !newMilestoneTitle.trim() || !newMilestoneDate) return;
    setIsAddingMilestone(true);
    try {
      const added = await checklistApi.createMilestone(
        eventId,
        newMilestoneTitle.trim(),
        newMilestoneDate
      );
      setMilestones((prev) =>
        [...prev, added].sort((a, b) => a.targetDate.localeCompare(b.targetDate))
      );
      setNewMilestoneTitle('');
      setNewMilestoneDate('');
    } catch (err) {
      console.error('Add milestone failed:', err);
    } finally {
      setIsAddingMilestone(false);
    }
  };

  const handleToggleMilestone = async (m: Milestone) => {
    if (!eventId) return;
    try {
      const updated = await checklistApi.updateMilestone(
        eventId,
        m.id,
        { isComplete: !m.isComplete }
      );
      setMilestones((prev) =>
        prev.map((x) => (x.id === m.id ? updated : x))
      );
    } catch (err) {
      console.error('Toggle milestone failed:', err);
    }
  };

  const handleDeleteMilestone = async (m: Milestone) => {
    if (!eventId) return;
    if (!window.confirm('Delete this milestone?')) return;
    try {
      await checklistApi.deleteMilestone(eventId, m.id);
      setMilestones((prev) => prev.filter((x) => x.id !== m.id));
    } catch (err) {
      console.error('Delete milestone failed:', err);
    }
  };

  const handleAddTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !newTimelineTitle.trim()) return;
    setIsAddingTimeline(true);
    try {
      const added = await checklistApi.createTimelineEntry(
        eventId,
        newTimelineSlot,
        newTimelineTitle.trim(),
        newTimelineDesc || null
      );
      setTimeline((prev) =>
        [...prev, added].sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.timeSlot.localeCompare(b.timeSlot);
        })
      );
      setNewTimelineTitle('');
      setNewTimelineDesc('');
    } catch (err) {
      console.error('Add timeline failed:', err);
    } finally {
      setIsAddingTimeline(false);
    }
  };

  const handleDeleteTimeline = async (t: TimelineEntry) => {
    if (!eventId) return;
    if (!window.confirm('Delete this timeline entry?')) return;
    try {
      await checklistApi.deleteTimelineEntry(eventId, t.id);
      setTimeline((prev) => prev.filter((x) => x.id !== t.id));
    } catch (err) {
      console.error('Delete timeline failed:', err);
    }
  };

  const completedCount = items.filter((i) => i.isComplete).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const sectionTabs = [
    { id: 'checklist' as const, label: 'Checklist', icon: CheckSquare },
    { id: 'milestones' as const, label: 'Milestones', icon: Target },
    { id: 'timeline' as const, label: 'Day-of Timeline', icon: Clock },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--text-muted)',
          }}
        >
          Loading checklist...
        </p>
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
            }}
          >
            Checklist progress
          </span>
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            {completedCount}/{totalCount} ({progress}%)
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'var(--surface2)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              background: 'var(--mint)',
            }}
          />
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-6">
        {sectionTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className="flex items-center gap-2 px-4 py-2 transition-all"
            style={{
              background:
                activeSection === tab.id ? 'var(--lavender)' : 'var(--surface2)',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: '0.875rem',
              color:
                activeSection === tab.id ? 'var(--text)' : 'var(--text-muted)',
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Checklist section */}
      {activeSection === 'checklist' && (
        <div
          className="p-6"
          style={{
            background: 'var(--surface)',
            borderRadius: 20,
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h2
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: 16,
            }}
          >
            Checklist
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              fontFamily: 'DM Sans, sans-serif',
              color: 'var(--text-muted)',
              marginBottom: 20,
            }}
          >
            Items are generated based on days until your event. Add your own below.
          </p>

          <div className="space-y-3 mb-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3"
                style={{
                  background: item.isComplete ? 'var(--surface2)' : 'var(--surface2)',
                  borderRadius: 12,
                  opacity: item.isComplete ? 0.8 : 1,
                }}
              >
                <button
                  onClick={() => handleToggleItem(item)}
                  className="flex-shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 transition-colors"
                  style={{
                    borderColor: item.isComplete ? 'var(--mint)' : 'var(--border)',
                    background: item.isComplete ? 'var(--mint)' : 'transparent',
                  }}
                >
                  {item.isComplete ? (
                    <Check className="w-3.5 h-3.5" style={{ color: '#065f46' }} />
                  ) : (
                    <Square className="w-3.5 h-3.5" style={{ opacity: 0.3 }} />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'var(--text)',
                      textDecoration: item.isComplete ? 'line-through' : 'none',
                    }}
                  >
                    {item.title}
                  </p>
                  {item.description && (
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginTop: 4,
                      }}
                    >
                      {item.description}
                    </p>
                  )}
                  {item.dueDate && (
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginTop: 2,
                      }}
                    >
                      Due: {new Date(item.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {!item.isSystemGenerated && (
                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="flex-shrink-0 p-1 opacity-60 hover:opacity-100"
                    style={{ color: 'var(--error)' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="Add item..."
              className="flex-1 px-4 py-2"
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
            <input
              type="date"
              value={newItemDueDate}
              onChange={(e) => setNewItemDueDate(e.target.value)}
              className="px-4 py-2"
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
            <button
              type="submit"
              disabled={isAddingItem || !newItemTitle.trim()}
              className="flex items-center justify-center gap-2 px-4 py-2"
              style={{
                background: 'var(--text)',
                color: 'var(--bg)',
                borderRadius: 'var(--radius-pill)',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </form>
        </div>
      )}

      {/* Milestones section */}
      {activeSection === 'milestones' && (
        <div
          className="p-6"
          style={{
            background: 'var(--surface)',
            borderRadius: 20,
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h2
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: 16,
            }}
          >
            Milestones
          </h2>

          <div className="space-y-3 mb-6">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3"
                style={{
                  background: 'var(--surface2)',
                  borderRadius: 12,
                }}
              >
                <button
                  onClick={() => handleToggleMilestone(m)}
                  className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border-2"
                  style={{
                    borderColor: m.isComplete ? 'var(--mint)' : 'var(--border)',
                    background: m.isComplete ? 'var(--mint)' : 'transparent',
                  }}
                >
                  {m.isComplete ? (
                    <Check className="w-3.5 h-3.5" style={{ color: '#065f46' }} />
                  ) : (
                    <Square className="w-3.5 h-3.5" style={{ opacity: 0.3 }} />
                  )}
                </button>
                <div className="flex-1">
                  <p
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      textDecoration: m.isComplete ? 'line-through' : 'none',
                    }}
                  >
                    {m.title}
                  </p>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {new Date(m.targetDate).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteMilestone(m)}
                  className="p-1 opacity-60 hover:opacity-100"
                  style={{ color: 'var(--error)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddMilestone} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
              placeholder="Milestone title"
              className="flex-1 px-4 py-2"
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: '0.875rem',
              }}
            />
            <input
              type="date"
              value={newMilestoneDate}
              onChange={(e) => setNewMilestoneDate(e.target.value)}
              className="px-4 py-2"
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: '0.875rem',
              }}
            />
            <button
              type="submit"
              disabled={isAddingMilestone || !newMilestoneTitle.trim() || !newMilestoneDate}
              className="flex items-center gap-2 px-4 py-2"
              style={{
                background: 'var(--text)',
                color: 'var(--bg)',
                borderRadius: 'var(--radius-pill)',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
              }}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </form>
        </div>
      )}

      {/* Timeline section */}
      {activeSection === 'timeline' && (
        <div
          className="p-6"
          style={{
            background: 'var(--surface)',
            borderRadius: 20,
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h2
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: 16,
            }}
          >
            Day-of Timeline
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              marginBottom: 20,
            }}
          >
            Plan the order of events on the day.
          </p>

          <div className="space-y-3 mb-6">
            {timeline.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-4 p-3"
                style={{
                  background: 'var(--surface2)',
                  borderRadius: 12,
                }}
              >
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: 'var(--text)', minWidth: 48 }}
                >
                  {t.timeSlot}
                </span>
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: 'DM Sans', fontWeight: 500 }}>
                    {t.title}
                  </p>
                  {t.description && (
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginTop: 2,
                      }}
                    >
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteTimeline(t)}
                  className="p-1 opacity-60 hover:opacity-100"
                  style={{ color: 'var(--error)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddTimeline} className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="time"
                value={newTimelineSlot}
                onChange={(e) => setNewTimelineSlot(e.target.value)}
                className="px-4 py-2"
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize: '0.875rem',
                }}
              />
              <input
                type="text"
                value={newTimelineTitle}
                onChange={(e) => setNewTimelineTitle(e.target.value)}
                placeholder="Title"
                className="flex-1 px-4 py-2"
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <input
              type="text"
              value={newTimelineDesc}
              onChange={(e) => setNewTimelineDesc(e.target.value)}
              placeholder="Description (optional)"
              className="px-4 py-2"
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: '0.875rem',
              }}
            />
            <button
              type="submit"
              disabled={isAddingTimeline || !newTimelineTitle.trim()}
              className="flex items-center justify-center gap-2 px-4 py-2 self-start"
              style={{
                background: 'var(--text)',
                color: 'var(--bg)',
                borderRadius: 'var(--radius-pill)',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
              }}
            >
              <Plus className="w-4 h-4" />
              Add entry
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
