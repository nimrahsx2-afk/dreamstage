import { useCallback, useEffect, useRef, useState } from 'react';

import {
  SCENE_3D_LOAD_TIMEOUT_MS,
  SCENE_DATA_LOAD_TIMEOUT_MS,
} from '../editor.constants';
import { editorLoadLogger } from '../utils/editorLoadLogger';

export type EditorLoadPhase =
  | 'loading-data'
  | 'loading-3d'
  | 'ready'
  | 'error'
  | 'fallback-2d';

export type EditorLoadFailureStage = 'data' | '3d' | 'webgl';

export type EditorLoadFailure = {
  stage: EditorLoadFailureStage;
  message: string;
  userMessage: string;
  timedOut?: boolean;
  details?: Record<string, unknown>;
};

export type EditorViewportMode = '3d' | '2d';

export function useEditorLoadController(eventId: string | undefined) {
  const [phase, setPhase] = useState<EditorLoadPhase>('loading-data');
  const [failure, setFailure] = useState<EditorLoadFailure | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [viewportMode, setViewportMode] = useState<EditorViewportMode>('3d');
  const [loadingMessage, setLoadingMessage] = useState('Loading scene data…');

  const dataStartedAt = useRef(0);
  const threeStartedAt = useRef(0);
  const threeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataAbortRef = useRef<AbortController | null>(null);

  const clear3dTimer = useCallback(() => {
    if (threeTimerRef.current != null) {
      clearTimeout(threeTimerRef.current);
      threeTimerRef.current = null;
    }
  }, []);

  const fail = useCallback(
    (next: EditorLoadFailure) => {
      clear3dTimer();
      setFailure(next);
      setPhase('error');
      editorLoadLogger.error({
        eventId,
        loadAttempt,
        stage: next.stage,
        message: next.message,
        error: next.details,
        meta: { timedOut: next.timedOut, userMessage: next.userMessage },
      });
    },
    [clear3dTimer, eventId, loadAttempt]
  );

  const beginDataLoad = useCallback(() => {
    dataAbortRef.current?.abort();
    const ac = new AbortController();
    dataAbortRef.current = ac;
    clear3dTimer();
    setFailure(null);
    setViewportMode('3d');
    setPhase('loading-data');
    setLoadingMessage('Loading scene data…');
    dataStartedAt.current = performance.now();
    editorLoadLogger.info({
      eventId,
      loadAttempt,
      stage: 'data',
      message: 'Scene data load started',
    });
    return ac.signal;
  }, [clear3dTimer, eventId, loadAttempt]);

  const completeDataLoad = useCallback(() => {
    const durationMs = Math.round(performance.now() - dataStartedAt.current);
    editorLoadLogger.info({
      eventId,
      loadAttempt,
      stage: 'data',
      message: 'Scene data load finished',
      durationMs,
    });
    setPhase('loading-3d');
    setLoadingMessage('Loading 3D venue & décor…');
    threeStartedAt.current = performance.now();

    clear3dTimer();
    threeTimerRef.current = setTimeout(() => {
      editorLoadLogger.warn({
        eventId,
        loadAttempt,
        stage: '3d',
        message: '3D load timed out',
        durationMs: SCENE_3D_LOAD_TIMEOUT_MS,
      });
      setFailure({
        stage: '3d',
        message: `3D load exceeded ${SCENE_3D_LOAD_TIMEOUT_MS}ms`,
        userMessage:
          '3D preview is taking too long to load. This often happens with very large venue models. Try 2D layout view or retry.',
        timedOut: true,
        details: { timeoutMs: SCENE_3D_LOAD_TIMEOUT_MS },
      });
      setPhase('error');
    }, SCENE_3D_LOAD_TIMEOUT_MS);
  }, [clear3dTimer, eventId, loadAttempt]);

  const complete3dLoad = useCallback(() => {
    clear3dTimer();
    const durationMs = Math.round(performance.now() - threeStartedAt.current);
    editorLoadLogger.info({
      eventId,
      loadAttempt,
      stage: '3d',
      message: '3D scene ready',
      durationMs,
    });
    setFailure(null);
    setPhase('ready');
    setViewportMode('3d');
  }, [clear3dTimer, eventId, loadAttempt]);

  const failDataLoad = useCallback(
    (err: unknown, timedOut: boolean) => {
      const durationMs = Math.round(performance.now() - dataStartedAt.current);
      const message =
        err instanceof Error ? err.message : 'Failed to load scene data';
      fail({
        stage: 'data',
        message,
        userMessage: timedOut
          ? `Scene data did not load within ${SCENE_DATA_LOAD_TIMEOUT_MS / 1000} seconds. Check your connection and try again.`
          : message,
        timedOut,
        details: { durationMs, raw: String(err) },
      });
    },
    [fail]
  );

  const fail3dLoad = useCallback(
    (err: unknown, timedOut = false) => {
      const durationMs = Math.round(performance.now() - threeStartedAt.current);
      const message = err instanceof Error ? err.message : '3D scene failed to load';
      fail({
        stage: '3d',
        message,
        userMessage: timedOut
          ? `3D preview timed out after ${SCENE_3D_LOAD_TIMEOUT_MS / 1000} seconds.`
          : 'The 3D editor could not start. You can retry or use the 2D layout view.',
        timedOut,
        details: { durationMs, raw: String(err) },
      });
    },
    [fail]
  );

  const retry = useCallback(() => {
    editorLoadLogger.info({
      eventId,
      loadAttempt: loadAttempt + 1,
      stage: 'retry',
      message: 'User triggered reload',
    });
    setLoadAttempt((n) => n + 1);
  }, [eventId, loadAttempt]);

  const use2DFallback = useCallback(() => {
    clear3dTimer();
    editorLoadLogger.info({
      eventId,
      loadAttempt,
      stage: 'fallback-2d',
      message: 'Switching to 2D layout view',
    });
    setFailure(null);
    setPhase('fallback-2d');
    setViewportMode('2d');
  }, [clear3dTimer, eventId, loadAttempt]);

  const retry3d = useCallback(() => {
    editorLoadLogger.info({
      eventId,
      loadAttempt: loadAttempt + 1,
      stage: 'retry',
      message: 'User retrying 3D from 2D fallback',
    });
    setLoadAttempt((n) => n + 1);
    setViewportMode('3d');
    setFailure(null);
    setPhase('loading-3d');
    setLoadingMessage('Loading 3D venue & décor…');
    threeStartedAt.current = performance.now();
    clear3dTimer();
    threeTimerRef.current = setTimeout(() => {
      fail3dLoad(new Error('3D load timeout'), true);
    }, SCENE_3D_LOAD_TIMEOUT_MS);
  }, [clear3dTimer, eventId, fail3dLoad, loadAttempt]);

  useEffect(() => () => {
    clear3dTimer();
    dataAbortRef.current?.abort();
  }, [clear3dTimer]);

  const showFullPageLoader = phase === 'loading-data';
  const showFullPageError = phase === 'error' && failure?.stage === 'data';
  const showEditorChrome =
    phase === 'loading-3d' ||
    phase === 'ready' ||
    phase === 'fallback-2d' ||
    (phase === 'error' && failure?.stage !== 'data');

  return {
    phase,
    failure,
    loadAttempt,
    viewportMode,
    loadingMessage,
    showFullPageLoader,
    showFullPageError,
    showEditorChrome,
    beginDataLoad,
    completeDataLoad,
    complete3dLoad,
    failDataLoad,
    fail3dLoad,
    retry,
    use2DFallback,
    retry3d,
  };
}
