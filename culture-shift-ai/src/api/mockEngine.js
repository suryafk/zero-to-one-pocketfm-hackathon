// Stands in for the real AI pipeline described in the BRD:
//   Feature 1 — Core Plot Anchor (Invariants Engine)
//   Feature 3 — Hyper-Local Idiom & Humor Mapper
//   Feature 5 — Dynamic Suspense Teaser & Hook Generator
// Swap this module out once the real /api/adapt endpoint exists —
// src/api/adaptationApi.js already calls the real endpoint first and
// only falls back to this file on failure.

const INVARIANTS = [
  'Inciting Incident',
  'Key Plot Beats',
  'Character Motivations',
  'Climax',
  'Narrative Resolution',
]

// A few hand-authored idiom swaps per culture so the demo feels authored,
// not templated. Falls back to a generic pattern for cultures not listed.
const IDIOM_BANK = {
  'Mumbai Tapri': [
    ['Grabbing a coffee downtown', 'Sipping cutting chai at the tapri'],
    ['He caught the subway home', 'He caught the last local to Dadar'],
  ],
  'Rural Bhojpuri': [
    ['She rolled her eyes at the joke', 'ऊ muskura ke taana maar di'],
    ['The whole street heard the news by morning', 'Poora gaanv ke pata chal gail bhor hote hote'],
  ],
  'Texas Country': [
    ['Grabbing a Starbucks in Manhattan', 'Grabbing a sweet tea off the porch'],
    ['He drove a rental car', 'He borrowed his cousin\'s pickup, again'],
  ],
  'South London Grime': [
    ['They met at the coffee shop', 'They linked up by the chicken shop'],
    ['It was a quiet neighborhood', 'It was quiet on the estate, for once'],
  ],
  'Street Lagos Pidgin': [
    ['I don\'t believe you', 'I no dey believe you at all'],
    ['The traffic was terrible', 'Go-slow don tire everybody today'],
  ],
  'Seoul Underground': [
    ['He grabbed a quick lunch', 'He grabbed gimbap between shifts'],
    ['She ignored the warning', 'She waved off the alert like static'],
  ],
  'Rio Favela': [
    ['They celebrated on the rooftop', 'They celebrated on the laje with funk blasting'],
    ['It was an ordinary Tuesday', 'It was just another day on the morro'],
  ],
}

const GENRE_TONE = {
  Horror: { verb: 'crept through', mood: 'the silence pressed in like a held breath' },
  Comedy: { verb: 'stumbled through', mood: 'nobody could keep a straight face for long' },
  Thriller: { verb: 'moved carefully through', mood: 'every shadow felt like it was counting seconds' },
  Romance: { verb: 'lingered in', mood: 'the air felt warmer than it should have' },
  'Sci-Fi': { verb: 'scanned', mood: 'the readings did not match anything on record' },
  Drama: { verb: 'sat with', mood: 'nobody wanted to say the obvious thing out loud' },
}

function hashSeed(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export function runMockAdaptation({ story, genre, culture, language, customPrompt }) {
  const tone = GENRE_TONE[genre] || GENRE_TONE.Thriller
  const idioms = IDIOM_BANK[culture] || [
    ['a generic city street', `a backstreet only locals in ${culture} would recognize`],
    ['an unremarkable meal', `a dish every household in ${culture} would know by smell alone`],
  ]

  const adaptedQuote = `${story.title.split(' ').slice(-1)[0] || 'It'} ${tone.verb} the ${culture.toLowerCase()} quarter, and ${tone.mood}.${
    customPrompt ? ` (${customPrompt.trim().replace(/\.$/, '')}.)` : ''
  }`

  const seed = hashSeed(`${story.id}-${genre}-${culture}-${language}-${customPrompt}`)
  const generationSeconds = 3 + (seed % 55) / 10 // reported latency, always < 10s per NFR

  return {
    invariants: INVARIANTS.map((label) => ({ label, locked: true })),
    consistencyScore: 100,
    idiomMappings: idioms.map(([from, to]) => ({ from, to })),
    adaptedQuote,
    transformedScript: `${story.synopsis || story.quote} ${adaptedQuote} The protagonist faces mounting stakes while the central mystery remains unresolved.`,
    genre,
    culture,
    language,
    // `audioUrl` is left unset here because there's no real TTS output yet —
    // the player falls back to simulated progress (see usePlayback.js).
    // To test *real* playback locally: drop an mp3 in /public/audio/ and set
    // audioUrl: '/audio/your-file.mp3' below. Once a real backend exists,
    // /api/adapt should return a real audioUrl the same way and no other
    // code needs to change.
    teaser: { label: '30s Custom Teaser', durationSeconds: 45, audioUrl: undefined },
    fullEpisode: { label: 'Full Adapted Episode', durationSeconds: 612, audioUrl: undefined },
    teaserDetails: {
      hook: adaptedQuote,
      risingTension: `Every clue draws the listener deeper into this ${culture} ${genre.toLowerCase()} world.`,
      cliffhanger: 'The truth is one heartbeat away — but who will survive hearing it?',
    },
    generationSeconds: Math.round(generationSeconds * 10) / 10,
  }
}
