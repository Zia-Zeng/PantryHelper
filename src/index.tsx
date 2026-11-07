import React, { type ErrorInfo, type ReactNode, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './index.css';

declare const __INSPIRE_SOURCE_ROOT__: string;
(globalThis as typeof globalThis & { __INSPIRE_ELEMENT_INSPECTOR_PROJECT_ROOT__?: string })
  .__INSPIRE_ELEMENT_INSPECTOR_PROJECT_ROOT__ = __INSPIRE_SOURCE_ROOT__;

type RuntimeMessageType = 'iframe-ready' | 'iframe-error';

const postRuntimeMessage = (type: RuntimeMessageType, payload: Record<string, unknown>) => {
  const parentOrigin = (globalThis as typeof globalThis & { __AGENT_UI_PARENT_ORIGIN__?: string })
    .__AGENT_UI_PARENT_ORIGIN__;
  parent.postMessage({ type, payload }, parentOrigin || '*');
};

class RuntimeErrorBoundary extends React.Component<
  { children: ReactNode },
  { error?: Error; errorInfo?: ErrorInfo }
> {
  public state: { error?: Error; errorInfo?: ErrorInfo } = {};

  public static getDerivedStateFromError(error: Error) {
    return { error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    postRuntimeMessage('iframe-error', {
      message: error.message,
      stack: error.stack ?? errorInfo.componentStack ?? undefined,
    });
  }

  public render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <div style={{ color: '#b42318', padding: 16 }}>
        <h2>Unable to render this UI</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
      </div>
    );
  }
}

const RuntimeApp = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      void navigator.serviceWorker.register('./sw.js').catch(() => undefined);
    }
    let cancelled = false;
    void waitForVisualReady().then(() => {
      if (!cancelled) {
        postRuntimeMessage('iframe-ready', {});
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return <App />;
};

const waitForVisualReady = async () => {
  await waitWithTimeout(document.fonts?.ready, 3_000);
  await waitWithTimeout(waitForImages(), 3_000);

  let previousLayout = '';
  let stableFrames = 0;
  for (let frame = 0; frame < 8 && stableFrames < 2; frame += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const layout = [
      document.documentElement.scrollWidth,
      document.documentElement.scrollHeight,
      document.body.scrollWidth,
      document.body.scrollHeight,
    ].join(':');
    if (layout === previousLayout) {
      stableFrames += 1;
    } else {
      previousLayout = layout;
      stableFrames = 0;
    }
  }
};

const waitForImages = () =>
  Promise.all(
    Array.from(document.images).map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        });
      }
      await image.decode?.().catch(() => undefined);
    }),
  );

const waitWithTimeout = async (promise: Promise<unknown> | undefined, timeoutMs: number) => {
  if (!promise) {
    return;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    promise.catch(() => undefined),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
    }),
  ]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Agent UI runtime root element is unavailable.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RuntimeErrorBoundary>
      <RuntimeApp />
    </RuntimeErrorBoundary>
  </React.StrictMode>,
);
