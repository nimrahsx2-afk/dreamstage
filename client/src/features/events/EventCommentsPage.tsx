// Event Comments Page - Planner view of client comments and replies

import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { MessageCircle, Send } from 'lucide-react';
import * as eventsApi from './events.api';

interface Comment {
  id: string;
  parentCommentId: string | null;
  clientIdentifier: string;
  content: string;
  isPlannerReply: boolean;
  createdAt: string;
}

interface OutletContext {
  event: { id: string };
  reload: () => Promise<void>;
}

function CommentItem({
  comment,
  onReply,
  isReply,
}: {
  comment: Comment;
  onReply: (parentId: string, content: string) => void;
  isReply?: boolean;
}) {
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReply = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!replyText.trim() || comment.isPlannerReply) return;
    setIsSubmitting(true);
    try {
      await onReply(comment.id, replyText.trim());
      setReplyText('');
      setShowReply(false);
    } catch (err) {
      console.error('Failed to submit reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const authorLabel = comment.isPlannerReply ? 'Event Planner (you)' : comment.clientIdentifier;

  return (
    <div
      className="p-4 mb-3"
      style={{
        background: comment.isPlannerReply ? 'var(--lavender)' : 'var(--surface2)',
        borderRadius: 12,
        marginLeft: isReply ? 32 : 0,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          {authorLabel}
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--text-muted)',
          }}
        >
          {new Date(comment.createdAt).toLocaleString()}
        </span>
      </div>
      <p
        style={{
          fontSize: '0.875rem',
          fontFamily: 'DM Sans, sans-serif',
          color: 'var(--text)',
          marginBottom: comment.isPlannerReply ? 0 : 8,
        }}
      >
        {comment.content}
      </p>
      {!comment.isPlannerReply && (
        <>
          {!showReply ? (
            <button
              type="button"
              onClick={() => setShowReply(true)}
              className="text-sm"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500,
                color: 'var(--accent)',
              }}
            >
              Reply
            </button>
          ) : (
            <form
              onSubmit={handleSubmitReply}
              className="flex gap-2 mt-2"
              style={{ alignItems: 'stretch' }}
            >
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: '0.875rem',
                  fontFamily: 'DM Sans, sans-serif',
                  color: 'var(--text)',
                }}
              />
              <button
                type="submit"
                disabled={!replyText.trim() || isSubmitting}
                className="p-2"
                style={{
                  background: 'var(--text)',
                  color: 'var(--bg)',
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export function EventCommentsPage() {
  const { reload } = useOutletContext<OutletContext>();
  const { eventId } = useParams<{ eventId: string }>();

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyError, setReplyError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    if (!eventId) return;
    try {
      const data = await eventsApi.getComments(eventId);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleReply = useCallback(
    async (parentId: string, content: string) => {
      if (!eventId) return;
      setReplyError(null);
      try {
        await eventsApi.addComment(eventId, { content, parentCommentId: parentId });
        await loadComments();
        await reload?.();
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || 'Failed to add reply';
        setReplyError(msg);
        console.error('Failed to add reply:', err);
      }
    },
    [eventId, loadComments, reload]
  );

  const rootComments = comments.filter((c) => !c.parentCommentId);
  const childMap = comments.reduce<Record<string, Comment[]>>((acc, c) => {
    if (c.parentCommentId) {
      if (!acc[c.parentCommentId]) acc[c.parentCommentId] = [];
      acc[c.parentCommentId].push(c);
    }
    return acc;
  }, {});
  // Sort replies by createdAt
  Object.keys(childMap).forEach((pid) => {
    childMap[pid].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  });

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      <div
        className="p-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="p-3"
            style={{
              background: 'var(--mint)',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            <MessageCircle className="w-5 h-5" style={{ color: 'var(--text)' }} />
          </div>
          <div>
            <h2
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              Client Comments
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                color: 'var(--text-muted)',
              }}
            >
              View and respond to client feedback
            </p>
          </div>
        </div>

        {isLoading ? (
          <p style={{ fontFamily: 'DM Sans', color: 'var(--text-muted)' }}>
            Loading comments...
          </p>
        ) : comments.length === 0 ? (
          <p
            className="py-8 text-center"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              color: 'var(--text-muted)',
            }}
          >
            No comments yet. Share the link with your client to receive feedback.
          </p>
        ) : (
          <div className="space-y-2">
            {replyError && (
              <div
                className="p-3 mb-3"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid #ef4444',
                  borderRadius: 12,
                  color: '#dc2626',
                  fontSize: '0.875rem',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {replyError}
              </div>
            )}
            {rootComments.map((comment) => (
              <div key={comment.id}>
                <CommentItem comment={comment} onReply={handleReply} />
                {(childMap[comment.id] || []).map((child) => (
                  <CommentItem
                    key={child.id}
                    comment={child}
                    onReply={handleReply}
                    isReply
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
