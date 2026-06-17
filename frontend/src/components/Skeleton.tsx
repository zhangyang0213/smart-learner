export function CardSkeleton() {
  return (
    <div className="card flex items-center gap-4 animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-warm-200" />
      <div className="flex-1 space-y-2">
        <div className="h-6 w-16 rounded bg-warm-200" />
        <div className="h-3 w-12 rounded bg-warm-100" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-warm-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-warm-200" />
            <div className="h-3 w-1/3 rounded bg-warm-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 animate-pulse">
      <div className="flex justify-end">
        <div className="h-10 w-48 rounded-2xl rounded-br-md bg-warm-200" />
      </div>
      <div className="flex justify-start">
        <div className="space-y-2">
          <div className="h-10 w-64 rounded-2xl rounded-bl-md bg-warm-100" />
          <div className="h-3 w-20 rounded bg-warm-100" />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="h-10 w-40 rounded-2xl rounded-br-md bg-warm-200" />
      </div>
      <div className="flex justify-start">
        <div className="space-y-2">
          <div className="h-10 w-56 rounded-2xl rounded-bl-md bg-warm-100" />
          <div className="h-3 w-16 rounded bg-warm-100" />
        </div>
      </div>
    </div>
  );
}
