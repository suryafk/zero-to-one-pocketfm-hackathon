import { useMemo, useState } from 'react'
import Header from './Header.jsx'
import FeaturedOriginal from './FeaturedOriginal.jsx'
import StoryCard from './StoryCard.jsx'

export default function Screen1Library({ stories, onSelectStory, onUploadStory, uploadError }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [genreFilter, setGenreFilter] = useState('All')

  const featured = stories.find((s) => s.featured)
  const rest = stories.filter((s) => !s.featured)

  const genres = useMemo(() => ['All', ...new Set(rest.map((s) => s.originalGenre))], [rest])

  const visible = rest.filter((s) => {
    const matchesGenre = genreFilter === 'All' || s.originalGenre === genreFilter
    const q = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.originalGenre.toLowerCase().includes(q) ||
      s.originalCulture.toLowerCase().includes(q)
    return matchesGenre && matchesSearch
  })

  return (
    <div className="screen screen-library">
      <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <main className="library-body">
        <section className="upload-story-card" aria-labelledby="upload-story-heading">
          <div>
            <span className="featured-tag">Your story</span>
            <h2 id="upload-story-heading">Upload a story to adapt and listen</h2>
            <p>Choose a PDF, text, Word document, or MP3. It will open with the same genre, cultural flavour, language, and listening controls.</p>
          </div>
          <label className="upload-story-button">
            Upload story or audio
            <input
              type="file"
              accept=".pdf,.txt,.doc,.docx,.mp3,application/pdf,text/plain,audio/mpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => {
                const [file] = event.target.files
                if (file) onUploadStory(file)
                event.target.value = ''
              }}
            />
          </label>
          {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
        </section>

        {featured && <FeaturedOriginal story={featured} onSelect={onSelectStory} />}

        <div className="trending-heading">
          <h3>🔥 Trending Originals Ready to Adapt</h3>
          <div className="genre-filters" role="tablist" aria-label="Filter by genre">
            {genres.map((g) => (
              <button
                key={g}
                role="tab"
                aria-selected={genreFilter === g}
                className={`genre-chip ${genreFilter === g ? 'active' : ''}`}
                onClick={() => setGenreFilter(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {visible.length > 0 ? (
          <div className="story-grid">
            {visible.map((s) => (
              <StoryCard key={s.id} story={s} onSelect={onSelectStory} />
            ))}
          </div>
        ) : (
          <p className="empty-state">No stories match "{searchTerm}". Try a different search or genre.</p>
        )}
      </main>
    </div>
  )
}
