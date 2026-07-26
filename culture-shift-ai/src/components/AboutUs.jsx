import { BackIcon, HeadphonesIcon, BoltIcon } from './Icons.jsx'

const pillars = [
  {
    number: '01',
    title: 'Stories cross borders',
    text: 'A story rooted in Bengal, Lagos, Seoul, or Texas should be able to move a listener anywhere in the world.',
  },
  {
    number: '02',
    title: 'Culture stays meaningful',
    text: 'ReVibe adapts language, region, idioms, and atmosphere while protecting the plot and emotional heart of the original.',
  },
  {
    number: '03',
    title: 'Listening feels effortless',
    text: 'Regional audio, short teasers, and cinematic trailers turn written stories into experiences people can immediately discover.',
  },
]

export default function AboutUs({ onBack }) {
  return (
    <div className="screen about-screen">
      <header className="about-header">
        <button className="about-brand" type="button" onClick={onBack} aria-label="Return to ReVibe library">
          <span className="brand-dot" aria-hidden="true" />
          <strong>ReVibe</strong>
        </button>
        <button className="about-back" type="button" onClick={onBack}><BackIcon /> Back to Library</button>
      </header>

      <main className="about-main">
        <section className="about-hero">
          <span className="about-eyebrow">OUR STORY</span>
          <h1>Every story deserves<br />a world of listeners.</h1>
          <p>
            ReVibe helps stories travel beyond the language and culture in which they began—without losing what made them worth telling.
          </p>
          <button className="about-cta" type="button" onClick={onBack}>Explore the story library <span>→</span></button>
        </section>

        <section className="about-purpose" aria-labelledby="what-we-do">
          <div className="about-purpose-copy">
            <span className="about-section-label">WHAT WE DO</span>
            <h2 id="what-we-do">One story.<br />Many ways to feel it.</h2>
          </div>
          <div className="about-purpose-text">
            <p>
              Upload a written or audio story, choose a genre, culture or region, and language, and ReVibe creates a culturally adapted version that preserves the original narrative.
            </p>
            <div className="about-capabilities">
              <span><HeadphonesIcon /> Full audio adaptations</span>
              <span><BoltIcon /> Suspenseful audio teasers</span>
              <span><span className="about-film-icon">▶</span> Cinematic video trailers</span>
            </div>
          </div>
        </section>

        <section className="about-vision" aria-labelledby="our-vision">
          <span className="about-section-label">OUR VISION</span>
          <h2 id="our-vision">A world where where you come from never limits what you can hear.</h2>
          <div className="about-pillars">
            {pillars.map((pillar) => (
              <article className="about-pillar" key={pillar.number}>
                <span>{pillar.number}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-closing">
          <p>From local voices to global ears.</p>
          <h2>Let the story travel.</h2>
          <button type="button" onClick={onBack}>Start exploring</button>
        </section>
      </main>
    </div>
  )
}
