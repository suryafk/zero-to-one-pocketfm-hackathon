import { BoltIcon } from './Icons.jsx'

export default function FeaturedOriginal({ story, onSelect }) {
  return (
    <article className="featured-card">
      {story.thumbnail && <img className="featured-cover" src={story.thumbnail} alt={`Cover of ${story.title}`} />}
      <span className="featured-tag">Featured Original</span>
      <h2>{story.title}</h2>
      <p className="featured-meta">
        {story.originalCulture} {story.originalGenre} &middot; {story.listens} Listens &middot;{' '}
        <span className="rating">★ {story.rating}</span>
      </p>
      <p className="featured-quote">&ldquo;{story.quote}&rdquo;</p>
      <button className="cta-gradient" onClick={() => onSelect(story)}>
        <BoltIcon /> Adapt &amp; Listen Now
      </button>
    </article>
  )
}
