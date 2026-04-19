// sentry.client.config.ts — auto-loaded by Next.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,        // 10% of transactions
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === "development") return null;
    return event;
  },
});
