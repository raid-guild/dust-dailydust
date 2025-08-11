export function FrontPage() {
  return (
    <section className="rounded-xl bg-panel border border-neutral-200 dark:border-neutral-800 p-6">
      <h1 className="font-heading text-5xl md:text-6xl text-center mb-1">City Hall Promises Iron Golem</h1>
      <p className="text-center text-text-secondary font-accent">Alder-blocks approved funding to deploy a dedicated squad.</p>
      <div className="my-4 border-t border-dotted border-neutral-300" />
      <div className="grid md:grid-cols-3 gap-6">
        <article className="md:col-span-1">
          <div className="aspect-video bg-neutral-100 border border-neutral-300 rounded" />
          <div className="mt-3">
            <div className="uppercase tracking-[.2em] text-xs text-neutral-500 font-accent">Main Story</div>
            <h2 className="font-heading text-2xl">City Hall Promises Iron Golem Night Patrols</h2>
            <p className="text-text-secondary">After a tense town meeting… Merchants say the move will protect their emerald reserves.</p>
          </div>
        </article>
        <article className="md:col-span-2 grid gap-6 md:grid-cols-2">
          {[1,2].map((i) => (
            <div key={i} className="">
              <div className="uppercase tracking-[.2em] text-xs text-neutral-500 font-accent">Editor's Pick</div>
              <h3 className="font-heading text-xl">Creeper Orchestra Surprises Village at Dawn</h3>
              <div className="aspect-video bg-neutral-100 border border-neutral-300 rounded" />
              <p className="text-text-secondary mt-2">A chorus of sizzling hisses startled farmers…</p>
            </div>
          ))}
        </article>
      </div>
    </section>
  );
}
