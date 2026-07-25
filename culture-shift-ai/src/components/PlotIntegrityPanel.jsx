import { CheckIcon } from './Icons.jsx'

export default function PlotIntegrityPanel({ invariants, consistencyScore }) {
  if (!invariants) return null

  return (
    <section className="integrity-panel" aria-label="Plot integrity lock">
      <div className="integrity-header">
        <h5>Plot Integrity Lock</h5>
        <span className="integrity-score">{consistencyScore}% consistent with original</span>
      </div>
      <ul className="invariant-list">
        {invariants.map((inv) => (
          <li key={inv.label}>
            <CheckIcon /> {inv.label}
          </li>
        ))}
      </ul>
    </section>
  )
}
