"use client";

import { Icon } from "@iconify/react";
import AppShell from "@/widgets/app-shell/ui/AppShell";
import Badge from "@/shared/ui/Badge";

export default function UploadWebsitePage() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-text-hi">Upload Website</h1>
          <p className="mt-0.5 text-sm text-text-lo">Add a new website source for tender scraping — plugs into the same run pipeline as every other source.</p>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-app-border bg-surface py-20">
          <Icon icon="solar:upload-broken" width={40} className="text-text-lo" />
          <Badge status="warning">Under construction</Badge>
          <p className="text-sm text-text-lo">Check back later — this will register as a new tracked source.</p>
        </div>
      </div>
    </AppShell>
  );
}
