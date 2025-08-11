export function LocalNewsPage() {
  return (
    <section className="rounded-xl bg-panel border border-neutral-200 dark:border-neutral-800 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <input placeholder="120 64 -40" className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-800 bg-panel" />
        <button className="px-3 py-2 bg-neutral-900 text-white rounded font-accent">Set Position</button>
        <div className="flex gap-2 flex-wrap ml-auto">
          {["Blockhaven City (120 64 -40)", "Nethergate Market (-340 70 220)", "Ender Plaza (1024 70 1024)", "Redstone Row (0 64 0)"].map(p => (
            <span key={p} className="px-3 py-1 text-xs rounded-full bg-neutral-100 border border-neutral-300 dark:border-neutral-800 font-accent">{p}</span>
          ))}
        </div>
      </div>
      <div className="my-5 border-t border-neutral-300" />
      <div className="grid md:grid-cols-2 gap-6">
        {[1,2,3,4].map(i => (
          <article key={i} className="border-t pt-4">
            <div className="uppercase tracking-[.2em] text-xs text-neutral-500 font-accent">Transit</div>
            <h3 className="font-heading text-2xl">Stray Cart Causes Minor Rail Delays</h3>
            <p className="text-text-secondary">A rogue minecart looped endlessly…</p>
            <p className="mt-2 text-sm text-neutral-600">Near: Blockhaven City • x:115 y:64 z:-60 • Distance: 21 blocks • <a className="underline" href="#">Get directions</a></p>
          </article>
        ))}
      </div>
    </section>
  );
}
