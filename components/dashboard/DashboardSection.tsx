import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
}

export default function DashboardSection({ title, children }: Props) {
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-medium text-ink">{title}</h2>
      {children}
    </section>
  );
}
