import { Component, type ErrorInfo, type ReactNode } from 'react';

import { editorLoadLogger } from '../utils/editorLoadLogger';

interface Props {
  children: ReactNode;
  eventId?: string;
  loadAttempt: number;
  onError: (error: Error) => void;
}

interface State {
  hasError: boolean;
}

export class EditorCanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    editorLoadLogger.error({
      eventId: this.props.eventId,
      loadAttempt: this.props.loadAttempt,
      stage: 'webgl',
      message: 'EditorCanvas render error',
      error,
      meta: { componentStack: info.componentStack },
    });
    this.props.onError(error);
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.loadAttempt !== this.props.loadAttempt && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
