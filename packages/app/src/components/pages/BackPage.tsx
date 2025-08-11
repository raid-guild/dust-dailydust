export function BackPage() {
  return (
    <section className="rounded-xl bg-panel border border-neutral-200 dark:border-neutral-800 p-6">
      <h2 className="font-heading text-3xl mb-4">Back Page — Classifieds</h2>
      <div className="rounded-xl border border-neutral-300 dark:border-neutral-800 p-4">
        <div className="grid md:grid-cols-[160px_1fr] gap-3">
          <select className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-800 bg-panel">
            <option>Offer</option>
            <option>Request</option>
            <option>Service</option>
          </select>
          <input placeholder="Title" className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-800 bg-panel" />
          <textarea placeholder="Details..." rows={4} className="md:col-span-2 px-3 py-2 rounded border border-neutral-300 dark:border-neutral-800 bg-panel" />
          <div className="md:col-span-2">
            <button className="w-full px-3 py-2 bg-neutral-900 text-white rounded font-accent">Submit Listing</button>
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {["OFFER","WANTED","SERVICE"].map((k,i) => (
          <article key={i} className="bg-panel border border-neutral-300 dark:border-neutral-800 p-4 rounded">
            <div className="uppercase tracking-[.2em] text-xs text-neutral-500 font-accent">{k}</div>
            <h3 className="font-heading text-xl">Free Cats (untamed)</h3>
            <p className="text-text-secondary">Bring fish and patience. Coords: 88 69 -12.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
