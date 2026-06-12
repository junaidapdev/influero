// The pre-route skeleton shown during the very first auth check, before the
// entry router decides where to send the user. Shaped like the app shell so
// there is no flash of unauthenticated content and no layout jump on redirect.
export function FullPageLoader() {
  return (
    <div
      className="min-h-dvh bg-background px-4 py-6"
      role="status"
      aria-busy="true"
    >
      <div className="mx-auto w-full max-w-[640px] space-y-5">
        {/* page title row */}
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-border motion-reduce:animate-none" />
          <div className="h-6 w-40 animate-pulse rounded-md bg-border motion-reduce:animate-none" />
        </div>

        {/* hero card */}
        <div className="h-40 animate-pulse rounded-2xl bg-border motion-reduce:animate-none" />

        {/* stat tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="h-24 animate-pulse rounded-lg bg-border motion-reduce:animate-none" />
          <div className="h-24 animate-pulse rounded-lg bg-border motion-reduce:animate-none" />
          <div className="h-24 animate-pulse rounded-lg bg-border motion-reduce:animate-none" />
        </div>

        {/* row cards */}
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-lg bg-border motion-reduce:animate-none" />
          <div className="h-16 animate-pulse rounded-lg bg-border motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
