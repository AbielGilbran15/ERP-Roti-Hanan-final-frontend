"use client";

import { Button } from "@fluentui/react-components";
import { ErrorCircle24Regular } from "@fluentui/react-icons";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-lg flex-col items-center justify-center text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200">
        <ErrorCircle24Regular />
      </span>
      <h1 className="mt-4 text-xl font-semibold">Halaman gagal dimuat</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
        Data dummy tidak berubah. Coba muat ulang bagian ini.
      </p>
      <Button appearance="primary" className="mt-5" onClick={reset}>
        Coba lagi
      </Button>
    </div>
  );
}
