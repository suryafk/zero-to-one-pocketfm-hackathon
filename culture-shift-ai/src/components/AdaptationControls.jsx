import { genreOptions, cultureOptions, languageOptions } from '../data/stories.js'
import { BoltIcon, HeadphonesIcon } from './Icons.jsx'

export default function AdaptationControls({
  genre,
  culture,
  language,
  customPrompt,
  onChange,
  onPlayTeaser,
  onPlayFull,
  isGenerating,
}) {
  return (
    <section className="controls-panel" aria-label="Adaptation controls and custom modulation">
      <h4>
        <BoltIcon className="controls-heading-icon" /> Adaptation Controls &amp; Custom Modulation
      </h4>

      <div className="controls-grid">
        <label className="control-field">
          <span>Select Genre</span>
          <select value={genre} onChange={(e) => onChange({ genre: e.target.value })}>
            {genreOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className="control-field">
          <span>Cultural Flavour</span>
          <select value={culture} onChange={(e) => onChange({ culture: e.target.value })}>
            {cultureOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="control-field">
          <span>Language</span>
          <select value={language} onChange={(e) => onChange({ language: e.target.value })}>
            {languageOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="control-field modulation-field">
        <span className="modulation-label">Custom Modulation Prompt (optional)</span>
        <textarea
          rows={2}
          value={customPrompt}
          onChange={(e) => onChange({ customPrompt: e.target.value })}
          placeholder="Make the narrator sound eerie with rain sounds, add local street jokes about chai tapri..."
        />
      </label>

      <div className="action-row">
        <button className="cta-gradient" onClick={onPlayTeaser} disabled={isGenerating}>
          <BoltIcon /> {isGenerating ? 'Adapting…' : 'Play 30s Teaser'}
        </button>
        <button className="cta-solid" onClick={onPlayFull} disabled={isGenerating}>
          <HeadphonesIcon /> {isGenerating ? 'Adapting…' : 'Play Full Story'}
        </button>
      </div>
    </section>
  )
}
