import { GENRE_ACCENTS } from '../data/stories.js'

export default function StoryCard({ story, onSelect }) {
  const accent = GENRE_ACCENTS[story.originalGenre] || '#30D158'

  return (
    <button className="story-card" style={{ '--accent': accent }} onClick={() => onSelect(story)}>
      <span className="story-card-bar" />
      <span className="story-card-thumb" aria-hidden="true">
        {story.thumbnail ? (
          <img src={story.thumbnail} alt="" />
        ) : story.title
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)}
      </span>
      <span className="story-card-title">{story.title}</span>
      <span className="story-card-genre">{story.originalGenre}</span>
    </button>
  )
}
