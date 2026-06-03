/** Structured editor load logs — filter console by "[DreamStage:EditorLoad]". */

export type EditorLoadStage = 'data' | '3d' | 'webgl' | 'retry' | 'fallback-2d';

export type EditorLoadLogPayload = {
  eventId?: string;
  loadAttempt?: number;
  stage: EditorLoadStage;
  message: string;
  durationMs?: number;
  error?: unknown;
  meta?: Record<string, unknown>;
};

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (error == null) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error as Error & { code?: string }).code
        ? { code: (error as Error & { code?: string }).code }
        : {},
    };
  }
  return { value: String(error) };
}

function log(level: 'info' | 'warn' | 'error', payload: EditorLoadLogPayload): void {
  const body = {
    ...payload,
    error: serializeError(payload.error),
    at: new Date().toISOString(),
  };

  const prefix = '[DreamStage:EditorLoad]';
  if (level === 'error') {
    console.error(prefix, body.message, body);
  } else if (level === 'warn') {
    console.warn(prefix, body.message, body);
  } else {
    console.info(prefix, body.message, body);
  }
}

export const editorLoadLogger = {
  info(payload: Omit<EditorLoadLogPayload, 'stage'> & { stage?: EditorLoadStage }) {
    log('info', { stage: payload.stage ?? 'data', ...payload });
  },
  warn(payload: EditorLoadLogPayload) {
    log('warn', payload);
  },
  error(payload: EditorLoadLogPayload) {
    log('error', payload);
  },
};
