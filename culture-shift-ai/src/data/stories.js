// Seed catalogue. In production this is exactly the shape returned by
// GET /api/stories — see src/api/adaptationApi.js.

export const GENRE_ACCENTS = {
  Thriller: '#FF3B30',
  Comedy: '#B279FF',
  Drama: '#30D158',
  Action: '#FF9500',
  Horror: '#FF3B30',
  Romance: '#FF6FA1',
  'Sci-Fi': '#3BB4FF',
}

export const stories = [
  {
    id: 'shadow-of-mumbai',
    title: 'The Shadow of Mumbai',
    originalGenre: 'Thriller',
    originalCulture: 'London Mystery',
    listens: '1.2M',
    rating: 4.8,
    featured: true,
    episode: 'Episode 12: The Lost Letter',
    quote:
      'The fog swallowed the alley whole, and somewhere in it, footsteps that were not his own.',
    synopsis:
      'A disgraced detective is pulled back into the one case he never closed — a missing letter that could unravel a century-old family secret.',
  },
  {
    id: 'lost-haveli',
    title: 'Lost Haveli',
    originalGenre: 'Thriller',
    originalCulture: 'Rural Bhojpuri',
    listens: '840K',
    rating: 4.6,
    episode: 'Episode 4: The Locked Room',
    quote: 'Nobody had opened the east wing since the wedding that never happened.',
    synopsis: 'A crumbling ancestral mansion hides a room nobody has entered in thirty years.',
  },
  {
    id: 'texas-heist',
    title: 'Texas Heist',
    originalGenre: 'Comedy',
    originalCulture: 'Texas Country',
    listens: '612K',
    rating: 4.5,
    episode: 'Episode 7: Boots on the Table',
    quote: 'Three cousins, one busted pickup truck, and a bank vault that only opens on Tuesdays.',
    synopsis: 'A good-natured heist goes sideways when the getaway truck runs out of gas.',
  },
  {
    id: 'lagos-nights',
    title: 'Lagos Nights',
    originalGenre: 'Drama',
    originalCulture: 'Street Lagos Pidgin',
    listens: '705K',
    rating: 4.7,
    episode: 'Episode 15: The Market Closes Late',
    quote: 'Every generator hum in the city carried someone else\'s unfinished argument.',
    synopsis: 'Two estranged siblings rebuild their late father\'s market stall, and their relationship, stall by stall.',
  },
  {
    id: 'grime-city',
    title: 'Grime City',
    originalGenre: 'Action',
    originalCulture: 'South London Grime',
    listens: '990K',
    rating: 4.4,
    episode: 'Episode 9: Concrete and Static',
    quote: 'The chase never ends at street level — it ends on the rooftops, always.',
    synopsis: 'An underground courier network is the only thing standing between a district and a hostile takeover.',
  },
  {
    id: 'neon-prophecy',
    title: 'Neon Prophecy',
    originalGenre: 'Sci-Fi',
    originalCulture: 'Seoul Underground',
    listens: '455K',
    rating: 4.3,
    episode: 'Episode 2: The Forecast Engine',
    quote: 'The city\'s weather machine had started predicting things that had not happened yet.',
    synopsis: 'A repair technician discovers the city\'s climate-control AI is broadcasting warnings from next week.',
  },
]

export const genreOptions = ['Horror', 'Comedy', 'Thriller', 'Romance', 'Sci-Fi', 'Drama']

export const cultureOptions = [
  'Rural Bhojpuri',
  'Mumbai Tapri',
  'Texas Country',
  'South London Grime',
  'Street Lagos Pidgin',
  'Seoul Underground',
  'Rio Favela',
]

export const languageOptions = [
  'Hindi',
  'English',
  'Bhojpuri',
  'Spanish',
  'Portuguese',
  'Korean',
  'Yoruba',
]
