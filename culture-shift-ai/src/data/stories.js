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
  {
    id: 'tell-tale-heart',
    title: 'The Tell-Tale Heart',
    originalGenre: 'Horror',
    originalCulture: 'Victorian Gothic',
    listens: '2.1M',
    rating: 4.9,
    episode: 'Full Reading: A Madman\'s Confession',
    quote: 'It was the beating of the old man\'s heart.',
    synopsis:
      'A nervous narrator insists on his sanity while recounting how the pale, filmy eye of an old man drove him to murder — and how a heartbeat betrayed him.',
  },
]

export const genreOptions = ['Horror', 'Comedy', 'Thriller', 'Romance', 'Sci-Fi', 'Drama']

export const cultureOptions = [
  { value: 'Rural Bhojpuri', label: 'Uttar Pradesh / Bihar' },
  { value: 'Mumbai Tapri', label: 'Mumbai' },
  { value: 'Texas Country', label: 'Texas' },
  { value: 'South London Grime', label: 'London' },
  { value: 'Street Lagos Pidgin', label: 'Lagos' },
  { value: 'Seoul Underground', label: 'Seoul' },
  { value: 'Rio Favela', label: 'Rio de Janeiro' },
  { value: 'Delhi NCR', label: 'Delhi NCR' },
  { value: 'Punjab', label: 'Punjab' },
  { value: 'Gujarat', label: 'Gujarat' },
  { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'West Bengal', label: 'Bengal' },
  { value: 'Odisha', label: 'Odisha' },
  { value: 'Assam', label: 'Assam' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  { value: 'Andhra Pradesh / Telangana', label: 'Andhra Pradesh / Telangana' },
  { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Kerala', label: 'Kerala' },
  { value: 'Jammu & Kashmir', label: 'Jammu & Kashmir' },
]

export function cultureLabel(value) {
  return cultureOptions.find((option) => option.value === value)?.label || value
}

export const regionLanguages = {
  'Rural Bhojpuri': ['Hindi', 'English'],
  'Mumbai Tapri': ['Marathi', 'Hindi', 'English'],
  'Texas Country': ['English', 'French', 'Spanish', 'Italian'],
  'South London Grime': ['English', 'French', 'Spanish', 'Italian'],
  'Street Lagos Pidgin': ['Yoruba', 'English', 'French', 'Spanish', 'Italian'],
  'Seoul Underground': ['Korean', 'English', 'French', 'Spanish', 'Italian'],
  'Rio Favela': ['Portuguese', 'English', 'French', 'Spanish', 'Italian'],
  'Delhi NCR': ['Hindi', 'Urdu', 'English'],
  Punjab: ['Punjabi', 'Hindi', 'English'],
  Gujarat: ['Gujarati', 'Hindi', 'English'],
  Rajasthan: ['Hindi', 'English'],
  'West Bengal': ['Bengali', 'English'],
  Odisha: ['Odia', 'English'],
  Assam: ['Assamese', 'Hindi', 'English'],
  'Tamil Nadu': ['Tamil', 'English'],
  'Andhra Pradesh / Telangana': ['Telugu', 'English'],
  Karnataka: ['Kannada', 'English'],
  Kerala: ['Malayalam', 'English'],
  'Jammu & Kashmir': ['Urdu', 'Hindi', 'English'],
}

export function languagesForCulture(culture) {
  return regionLanguages[culture] || ['English']
}

export const languageOptions = [
  'Hindi',
  'English',
  'Bhojpuri',
  'Marathi',
  'Bengali',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Punjabi',
  'Gujarati',
  'Urdu',
  'Odia',
  'Assamese',
  'Spanish',
  'French',
  'Italian',
  'Portuguese',
  'Korean',
  'Yoruba',
]
