import React, { type ReactNode } from 'react';

interface ChartCardProps {
  children: ReactNode;
  controls?: ReactNode;
  footer?: ReactNode;
  title: string;
}

export const ChartCard = ({ children, controls, footer, title }: ChartCardProps) => (
  <section className="rounded-xl border border-pine/10 bg-white/90 p-5 shadow-card backdrop-blur">
    <div className="flex flex-col gap-3 border-b border-pine/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      </div>
      {controls}
    </div>
    <div className="pt-5">{children}</div>
    {footer ? <div className="mt-5 border-t border-pine/10 pt-4 text-sm text-pine/80">{footer}</div> : null}
  </section>
);

interface CardMessageStateProps {
  message: string;
  title: string;
}

export const CardLoadingState = ({ title }: Pick<CardMessageStateProps, 'title'>) => (
  <div aria-label={`${title} loading`} className="space-y-4">
    <div className="h-4 w-40 animate-pulse rounded-full bg-mist" />
    <div className="h-56 animate-pulse rounded-xl bg-mist" />
    <div className="h-4 w-52 animate-pulse rounded-full bg-mist" />
  </div>
);

export const CardEmptyState = ({ message, title }: CardMessageStateProps) => (
  <div className="rounded-xl border border-dashed border-pine/25 bg-canvas/70 px-5 py-10 text-center">
    <p className="font-display text-lg font-semibold text-ink">{title}</p>
    <p className="mt-2 text-sm text-pine/80">{message}</p>
  </div>
);

interface CardErrorStateProps extends CardMessageStateProps {
  requestId?: string;
  retryHref: string;
}

export const CardErrorState = ({
  message,
  requestId,
  retryHref,
  title,
}: CardErrorStateProps) => (
  <div className="rounded-xl border border-signal/20 bg-signal/5 px-5 py-6">
    <p className="font-display text-lg font-semibold text-ink">{title}</p>
    <p className="mt-2 text-sm text-pine/85">{message}</p>
    {requestId ? (
      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-pine/55">
        Request {requestId.slice(0, 8)}
      </p>
    ) : null}
    <a
      className="mt-4 inline-flex rounded-full border border-pine/20 px-4 py-2 text-sm font-medium text-ink transition hover:border-pine/40 hover:bg-white"
      href={retryHref}
    >
      Retry
    </a>
  </div>
);
