import { WorkspacePage, Surface } from '@/components/product/WorkspaceUI';

export default function ActivitiesLoading() {
  return (
    <WorkspacePage>
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-48 rounded-lg bg-[var(--surface-muted)]" />
        <div className="h-6 w-96 rounded-lg bg-[var(--surface-muted)]" />
        <Surface>
          <div className="h-32 rounded-lg bg-[var(--surface-muted)]" />
        </Surface>
      </div>
    </WorkspacePage>
  );
}
