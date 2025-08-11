export function DiscoverPage() {
  return (
    <section className="rounded-xl bg-panel border border-neutral-200 dark:border-neutral-800 p-6">
      <div className="flex flex-wrap gap-2 items-center">
        <input placeholder="Search..." className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-800 bg-panel" />
        <select className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-800 bg-panel">
          <option>All Categories</option>
          <option>Editorial</option>
          <option>Guide</option>
          <option>News</option>
          <option>Build</option>
        </select>
        <select className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-800 bg-panel">
          <option>Top</option>
          <option>New</option>
          <option>Near</option>
        </select>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        {[1,2,3,4,5,6].map(i => (
          <article key={i} className="bg-panel border border-neutral-200 dark:border-neutral-800 rounded p-4">
            <div className="uppercase tracking-[.2em] text-xs text-neutral-500 font-accent">Feature</div>
            <h3 className="font-heading text-xl">Redstone Contraptions Tour #{i}</h3>
            <p className="text-text-secondary">Ingenious levers and dust at play.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
