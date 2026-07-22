/**
 * Temporary Phase 1 route: a visual proof of the design system.
 * Every value here comes from tailwind.config.js or the @layer components set
 * in index.css — nothing is hardcoded. Delete this page once Phase 2 replaces
 * it with the component gallery.
 */

const NEUTRALS = [
  { token: 'ink.950', value: '#0A0A0A', use: 'Primary text, primary buttons, active states', swatch: 'bg-ink-950' },
  { token: 'ink.800', value: '#262626', use: 'Headings on light, hover on primary button', swatch: 'bg-ink-800' },
  { token: 'ink.600', value: '#525252', use: 'Secondary text, icons', swatch: 'bg-ink-600' },
  { token: 'ink.400', value: '#A3A3A3', use: 'Placeholder, disabled text, muted meta', swatch: 'bg-ink-400' },
  { token: 'ink.300', value: '#D4D4D4', use: 'Strong borders, dividers on emphasis', swatch: 'bg-ink-300' },
  { token: 'ink.200', value: '#E5E5E5', use: 'Default borders, table rules', swatch: 'bg-ink-200' },
  { token: 'ink.100', value: '#F5F5F5', use: 'Subtle fills, hover rows, input backgrounds', swatch: 'bg-ink-100' },
  { token: 'ink.50', value: '#FAFAFA', use: 'Page background, sidebar background', swatch: 'bg-ink-50' },
  { token: 'white', value: '#FFFFFF', use: 'Cards, panels, elevated surfaces', swatch: 'bg-white' },
]

const ACCENTS = [
  {
    token: 'state.ok',
    value: '#2F6B48',
    meaning: 'Verified, safe, active, approved',
    badge: 'badge-ok',
    dot: 'bg-state-ok',
    label: 'Verified',
  },
  {
    token: 'state.warn',
    value: '#9A6B12',
    meaning: 'Pending, review needed, low confidence',
    badge: 'badge-warn',
    dot: 'bg-state-warn',
    label: 'Pending',
  },
  {
    token: 'state.danger',
    value: '#B4342F',
    meaning: 'Fraud flagged, rejected, destructive, field error',
    badge: 'badge-danger',
    dot: 'bg-state-danger',
    label: 'Flagged',
  },
  {
    token: 'state.info',
    value: '#2B5C8A',
    meaning: 'Informational only',
    badge: 'badge-info',
    dot: 'bg-state-info',
    label: 'Info',
  },
]

const TYPE_SCALE = [
  { role: 'Page title', spec: 'font-display · 28px · regular', className: 'font-display text-title', sample: 'Investment agreements' },
  { role: 'Stat figure', spec: 'font-display · 36–40px · regular', className: 'font-display text-stat-lg', sample: 'LKR 4,820,000' },
  { role: 'Section heading', spec: 'font-body · 15px · semibold', className: 'section-heading', sample: 'Recent fraud alerts' },
  { role: 'Body', spec: 'font-body · 14px · regular', className: 'font-body text-body', sample: 'The document was analysed across three detection stages.' },
  { role: 'Body medium', spec: 'font-body · 14px · 500', className: 'font-body text-body font-medium', sample: 'Nimal Perera — Kandy branch' },
  { role: 'Meta / label', spec: 'font-mono · 11px · uppercase · wide tracking · ink.400', className: 'meta-label', sample: 'Total customers' },
  { role: 'Mono data', spec: 'font-mono · 13px · ink.950', className: 'font-mono text-[13px] text-ink-950', sample: '199834502V · AGR-2026-00417' },
]

const FRAUD_BANDS = [
  { range: '0 – 39', verdict: 'Safe', badge: 'badge-ok', fill: 'bg-state-ok', score: 18 },
  { range: '40 – 69', verdict: 'Review', badge: 'badge-warn', fill: 'bg-state-warn', score: 56 },
  { range: '70 – 100', verdict: 'Flagged', badge: 'badge-danger', fill: 'bg-state-danger', score: 87 },
]

function Section({ title, caption, children }) {
  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2 className="section-heading">{title}</h2>
        {caption ? <p className="mt-1 text-body text-ink-600">{caption}</p> : null}
      </div>
      {children}
    </section>
  )
}

export default function StyleGuide() {
  return (
    <div className="min-h-screen animate-page-enter bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-8">
          <span className="meta-label">Design system · Phase 1</span>
          <h1 className="page-title">PlantVest AI — Modern Monochrome</h1>
          <p className="max-w-2xl text-body text-ink-600">
            If a colour is not communicating a state, it should not be there. Everything else is
            black, white, or a grey in between.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <Section
          title="Neutral scale"
          caption="The entire base palette. Never use pure #000000 — ink.950 is the darkest value in the system."
        >
          <div className="card p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-24">Swatch</th>
                  <th className="w-32">Token</th>
                  <th className="w-28">Value</th>
                  <th>Used for</th>
                </tr>
              </thead>
              <tbody>
                {NEUTRALS.map((n) => (
                  <tr key={n.token}>
                    <td>
                      <div className={`h-8 w-16 rounded-control border border-ink-200 ${n.swatch}`} />
                    </td>
                    <td className="font-mono text-[13px] text-ink-950">{n.token}</td>
                    <td className="font-mono text-[13px] text-ink-600">{n.value}</td>
                    <td className="text-ink-600">{n.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          title="Semantic accents"
          caption="The only colour permitted. Badges are a tinted background with a hairline border and coloured text — never a solid saturated fill."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {ACCENTS.map((a) => (
              <div key={a.token} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[13px] text-ink-950">{a.token}</p>
                    <p className="mt-1 text-body text-ink-600">{a.meaning}</p>
                  </div>
                  <span className={`badge ${a.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} aria-hidden="true" />
                    {a.label}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-control ${a.dot}`} title={`${a.token} solid`} />
                  <div className={`h-8 w-8 rounded-control border ${a.badge}`} title={`${a.token} tint + border`} />
                  <span className="font-mono text-[13px] text-ink-400">{a.value}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Typography"
          caption="The serif display against the grotesque body is the one deliberate contrast in the system. Body weights stop at 600."
        >
          <div className="card divide-y divide-ink-200 p-0">
            {TYPE_SCALE.map((t) => (
              <div key={t.role} className="grid gap-3 p-6 md:grid-cols-[220px_1fr] md:items-baseline">
                <div>
                  <p className="text-body font-medium text-ink-950">{t.role}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-400">{t.spec}</p>
                </div>
                <p className={t.className}>{t.sample}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Buttons"
          caption="Radius 8px, 36px default and 30px small. There is never more than one black button on screen at a time."
        >
          <div className="card space-y-6">
            <div>
              <p className="meta-label mb-3">Default</p>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-primary">Generate agreement</button>
                <button type="button" className="btn btn-secondary">Export CSV</button>
                <button type="button" className="btn btn-ghost">Cancel</button>
                <button type="button" className="btn btn-danger">Reject document</button>
              </div>
            </div>

            <div>
              <p className="meta-label mb-3">Small</p>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-primary btn-sm">Approve</button>
                <button type="button" className="btn btn-secondary btn-sm">Edit</button>
                <button type="button" className="btn btn-ghost btn-sm">View</button>
                <button type="button" className="btn btn-danger btn-sm">Delete</button>
              </div>
            </div>

            <div>
              <p className="meta-label mb-3">Disabled</p>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-primary" disabled>Generate agreement</button>
                <button type="button" className="btn btn-secondary" disabled>Export CSV</button>
                <button type="button" className="btn btn-ghost" disabled>Cancel</button>
                <button type="button" className="btn btn-danger" disabled>Reject document</button>
              </div>
            </div>

            <p className="text-body text-ink-400">
              Tab through the row above — the focus ring is a 2px ink.950 outline at 2px offset.
            </p>
          </div>
        </Section>

        <Section title="Form controls" caption="Errors sit under the field. Hover lifts the border to ink.300; focus takes it to ink.950.">
          <div className="card grid gap-4 md:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="sg-name">Full name</label>
              <input id="sg-name" className="form-input" placeholder="Nimal Perera" />
              <span className="form-hint">As printed on the national identity card.</span>
            </div>

            <div>
              <label className="form-label" htmlFor="sg-nic">NIC number</label>
              <input id="sg-nic" className="form-input form-input-error font-mono" defaultValue="19983450" />
              <span className="form-error">NIC must be 9 digits followed by V, or 12 digits.</span>
            </div>

            <div>
              <label className="form-label" htmlFor="sg-type">Document type</label>
              <select id="sg-type" className="form-select" defaultValue="nic">
                <option value="nic">National identity card</option>
                <option value="bank">Bank statement</option>
                <option value="deed">Land deed</option>
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="sg-disabled">Customer code</label>
              <input id="sg-disabled" className="form-input font-mono" defaultValue="CUS-000412" disabled />
              <span className="form-hint">Generated by the system.</span>
            </div>

            <div className="md:col-span-2">
              <label className="form-label" htmlFor="sg-notes">Review notes</label>
              <textarea id="sg-notes" className="form-textarea" placeholder="Add a note for the reviewer…" />
            </div>
          </div>
        </Section>

        <Section
          title="Semantic state rules"
          caption="The fraud bands, applied consistently everywhere. The bar track is ink.200; only the fill takes the severity colour."
        >
          <div className="card space-y-5">
            {FRAUD_BANDS.map((b) => (
              <div key={b.range} className="grid items-center gap-4 sm:grid-cols-[120px_1fr_140px]">
                <span className="font-mono text-[13px] text-ink-600">{b.range}</span>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
                  <div className={`h-full rounded-full ${b.fill}`} style={{ width: `${b.score}%` }} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-[22px] text-ink-950">{b.score}</span>
                  <span className={`badge ${b.badge}`}>{b.verdict}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Surfaces and depth"
          caption="Page ink.50, cards white, 1px ink.200, radius 12px. Shadows only on genuinely floating layers."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card">
              <p className="meta-label">Total customers</p>
              <p className="mt-2 font-display text-stat text-ink-950">1,284</p>
              <p className="mt-1 text-body text-state-ok">▲ 8.2% this month</p>
            </div>
            <div className="card">
              <p className="meta-label">Fraud flags</p>
              <p className="mt-2 font-display text-stat text-ink-950">17</p>
              <p className="mt-1 text-body text-state-danger">▲ 3 since last week</p>
            </div>
            <div className="rounded-card border border-ink-200 bg-white p-6 shadow-float">
              <p className="meta-label">Floating layer</p>
              <p className="mt-2 text-body text-ink-600">
                Modals, dropdowns and toasts only — 0 4px 16px rgba(10,10,10,0.06).
              </p>
            </div>
          </div>
        </Section>

        <Section title="Data table" caption="Hairline ink.200 rules, ink.100 row hover, mono for identifiers and status as a badge.">
          <div className="card overflow-x-auto p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>NIC</th>
                  <th>Agreement</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium text-ink-950">Nimal Perera</td>
                  <td className="font-mono text-[13px]">199834502V</td>
                  <td className="font-mono text-[13px]">AGR-2026-00417</td>
                  <td className="text-right font-display text-[18px] text-ink-950">LKR 1,250,000</td>
                  <td><span className="badge badge-ok">Verified</span></td>
                </tr>
                <tr>
                  <td className="font-medium text-ink-950">Kamala Silva</td>
                  <td className="font-mono text-[13px]">200145600812</td>
                  <td className="font-mono text-[13px]">AGR-2026-00418</td>
                  <td className="text-right font-display text-[18px] text-ink-950">LKR 640,000</td>
                  <td><span className="badge badge-warn">Pending</span></td>
                </tr>
                <tr>
                  <td className="font-medium text-ink-950">Sunil Fernando</td>
                  <td className="font-mono text-[13px]">198712345V</td>
                  <td className="font-mono text-[13px]">AGR-2026-00419</td>
                  <td className="text-right font-display text-[18px] text-ink-950">LKR 2,100,000</td>
                  <td><span className="badge badge-danger">Flagged</span></td>
                </tr>
                <tr>
                  <td className="font-medium text-ink-950">Anoma Jayasuriya</td>
                  <td className="font-mono text-[13px]">199602311V</td>
                  <td className="font-mono text-[13px]">AGR-2026-00420</td>
                  <td className="text-right font-display text-[18px] text-ink-950">LKR 380,000</td>
                  <td><span className="badge badge-neutral">Cancelled</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <footer className="border-t border-ink-200 pt-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">
            Greyscale test — view this page desaturated. Status must still be readable from the
            label, not the hue.
          </p>
        </footer>
      </main>
    </div>
  )
}
