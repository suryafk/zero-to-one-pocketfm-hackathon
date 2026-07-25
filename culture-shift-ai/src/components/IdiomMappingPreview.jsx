import { ArrowRightIcon } from './Icons.jsx'

export default function IdiomMappingPreview({ mappings }) {
  if (!mappings || mappings.length === 0) return null

  return (
    <section className="idiom-panel" aria-label="Hyper-local idiom mapping">
      <h5>Hyper-Local Idiom Mapping</h5>
      <ul className="idiom-list">
        {mappings.map((m, i) => (
          <li key={i}>
            <span className="idiom-from">{m.from}</span>
            <ArrowRightIcon className="idiom-arrow" />
            <span className="idiom-to">{m.to}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
