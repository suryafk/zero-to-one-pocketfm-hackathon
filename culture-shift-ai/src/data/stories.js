import catsOfUltharPdf from './the-cats-of-ulthar.pdf?url'
import dreamPdf from './The Dream of a Ridiculous Man.pdf?url'
import monkeysPawPdf from './The Monkeys Paw by WW Jacobs.pdf?url'
import postmasterPdf from './The Postmaster.pdf?url'
import namakKaDarogaPdf from './नमक का दरोगा.pdf?url'
import moniharaPdf from './মণিহারা.pdf?url'
import catsOfUltharCover from './Cats of Ulthar.avif'
import dreamCover from './Dream of a ridiculous man.avif'
import namakKaDarogaCover from './Namak ka daroga.webp'
import tellTaleHeartCover from './Tell Tale Heart.webp'

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
    id: 'tell-tale-heart',
    title: 'The Tell-Tale Heart',
    originalGenre: 'Horror',
    originalCulture: 'American Gothic',
    listens: '2.1M',
    rating: 4.9,
    featured: true,
    episode: 'A short story by Edgar Allan Poe',
    quote: 'It was the beating of the old man’s heart.',
    synopsis:
      'A haunted narrator insists on his sanity while recounting a terrible crime—and the sound that finally betrays him.',
    thumbnail: tellTaleHeartCover,
  },
  {
    id: 'the-monkeys-paw',
    title: 'The Monkey’s Paw',
    originalGenre: 'Horror',
    originalCulture: 'English Gothic',
    listens: '1.4M',
    rating: 4.8,
    episode: 'A short story by W. W. Jacobs',
    quote: 'Three wishes are granted—but fate exacts a terrible price for each one.',
    synopsis: 'A family receives a talisman said to grant three wishes, then discovers why destiny should never be disturbed.',
    sourceDocument: monkeysPawPdf,
  },
  {
    id: 'the-dream-of-a-ridiculous-man',
    title: 'The Dream of a Ridiculous Man',
    originalGenre: 'Drama',
    originalCulture: 'Russian Literature',
    listens: '890K',
    rating: 4.7,
    episode: 'A short story by Fyodor Dostoevsky',
    quote: 'A man who believes nothing matters dreams of another world—and awakens with a reason to live.',
    synopsis: 'On the darkest night of his life, a disillusioned man experiences a dream that transforms his understanding of humanity.',
    sourceDocument: dreamPdf,
    thumbnail: dreamCover,
  },
  {
    id: 'namak-ka-daroga',
    title: 'नमक का दरोगा',
    originalGenre: 'Drama',
    originalCulture: 'Uttar Pradesh',
    listens: '1.1M',
    rating: 4.8,
    episode: 'A Hindi story by Munshi Premchand',
    quote: 'When honesty is tested by wealth and influence, one principled officer refuses to bend.',
    synopsis: 'An incorruptible salt inspector confronts a powerful merchant and learns the complicated value society places on integrity.',
    sourceDocument: namakKaDarogaPdf,
    thumbnail: namakKaDarogaCover,
  },
  {
    id: 'the-cats-of-ulthar',
    title: 'The Cats of Ulthar',
    originalGenre: 'Horror',
    originalCulture: 'American Fantasy',
    listens: '760K',
    rating: 4.6,
    episode: 'A short story by H. P. Lovecraft',
    quote: 'In Ulthar, no man may kill a cat—and the reason is whispered after dark.',
    synopsis: 'A mysterious orphan visits a village where an old couple harms cats, setting in motion a strange and lasting reckoning.',
    sourceDocument: catsOfUltharPdf,
    thumbnail: catsOfUltharCover,
  },
  {
    id: 'the-postmaster',
    title: 'The Postmaster',
    originalGenre: 'Drama',
    originalCulture: 'Bengal',
    listens: '940K',
    rating: 4.7,
    episode: 'A short story by Rabindranath Tagore',
    quote: 'In a distant village, an unlikely bond grows quietly between a lonely postmaster and an orphan girl.',
    synopsis: 'A city-bred postmaster and a village orphan form a tender friendship, but their ideas of belonging do not end in the same place.',
    sourceDocument: postmasterPdf,
  },
  {
    id: 'monihara',
    title: 'মণিহারা (The Lost Jewels)',
    originalGenre: 'Horror',
    originalCulture: 'Bengal',
    listens: '820K',
    rating: 4.6,
    episode: 'A Bengali story by Rabindranath Tagore',
    quote: 'Her jewels were her obsession. When they vanished, something else seemed to vanish with them.',
    synopsis: 'A merchant’s wife is consumed by her precious ornaments in Tagore’s eerie meditation on possession, absence, and haunting loss.',
    sourceDocument: moniharaPdf,
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
