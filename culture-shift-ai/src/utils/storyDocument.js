const textDecoder = new TextDecoder()

function cleanText(value) {
  return value.replace(/\s+/g, ' ').trim()
}

async function extractDocx(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const name = new TextEncoder().encode('word/document.xml')

  for (let i = 0; i < bytes.length - name.length; i += 1) {
    if (bytes[i] !== 0x50 || bytes[i + 1] !== 0x4b || bytes[i + 2] !== 0x03 || bytes[i + 3] !== 0x04) continue
    const nameLength = bytes[i + 26] | (bytes[i + 27] << 8)
    const extraLength = bytes[i + 28] | (bytes[i + 29] << 8)
    const fileName = bytes.slice(i + 30, i + 30 + nameLength)
    if (!fileName.every((byte, index) => byte === name[index])) continue

    const method = bytes[i + 8] | (bytes[i + 9] << 8)
    const compressedSize = bytes[i + 18] | (bytes[i + 19] << 8) | (bytes[i + 20] << 16) | (bytes[i + 21] << 24)
    const dataStart = i + 30 + nameLength + extraLength
    const content = bytes.slice(dataStart, dataStart + compressedSize)
    let xml
    if (method === 0) xml = textDecoder.decode(content)
    else if (method === 8 && 'DecompressionStream' in window) {
      xml = await new Response(new Blob([content]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()
    } else throw new Error('This Word document cannot be read in this browser.')
    return cleanText(xml.replace(/<w:p[^>]*>/g, '\n').replace(/<[^>]+>/g, ' '))
  }
  throw new Error('This does not look like a valid .docx document.')
}

async function extractPdf(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let source = new TextDecoder('latin1').decode(bytes)
  const streams = [...source.matchAll(/\/Filter\s*\/FlateDecode[\s\S]*?stream\r?\n/g)]
  if ('DecompressionStream' in window) {
    const decodedStreams = await Promise.all(streams.map(async (match) => {
      const start = match.index + match[0].length
      const end = source.indexOf('endstream', start)
      if (end < 0) return ''
      try {
        return await new Response(new Blob([bytes.slice(start, end)]).stream().pipeThrough(new DecompressionStream('deflate'))).text()
      } catch {
        return ''
      }
    }))
    source += decodedStreams.join('\n')
  }
  const fragments = [...source.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)].map((match) =>
    match[0].slice(1, match[0].lastIndexOf(')')).replace(/\\([()\\])/g, '$1'),
  )
  const text = cleanText(fragments.join(' '))
  if (!text) throw new Error('No readable text was found. Scanned PDFs need OCR before upload.')
  return text
}

async function extractLegacyDoc(file) {
  const raw = new TextDecoder('latin1').decode(await file.arrayBuffer())
  const text = cleanText(raw.replace(/[^\x20-\x7e\r\n]+/g, ' '))
  if (text.length < 40) throw new Error('No readable text was found in this Word document. Please save it as .docx or .txt and try again.')
  return text
}

export async function extractStoryText(file) {
  const extension = file.name.split('.').pop().toLowerCase()
  if (extension === 'txt') return cleanText(await file.text())
  if (extension === 'docx') return extractDocx(file)
  if (extension === 'pdf') return extractPdf(file)
  if (extension === 'doc') return extractLegacyDoc(file)
  throw new Error('Choose a PDF, TXT, DOCX, DOC, or MP3 story file.')
}

export function createUploadedStory(file, text) {
  const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') || 'Uploaded story'
  const excerpt = text.slice(0, 500)
  return {
    id: `uploaded-${Date.now()}`,
    title,
    originalGenre: 'Drama',
    originalCulture: 'Uploaded Story',
    listens: 'New',
    rating: 0,
    episode: 'Your uploaded story',
    quote: excerpt,
    synopsis: text.slice(0, 1000),
    sourceText: text,
  }
}

export function createUploadedAudioStory(file) {
  const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') || 'Uploaded audio story'
  return {
    id: `uploaded-audio-${Date.now()}`,
    title,
    originalGenre: 'Drama',
    originalCulture: 'Uploaded Audio',
    listens: 'New',
    rating: 0,
    episode: 'Your uploaded audio story',
    quote: 'Your uploaded audio is ready to listen to. Choose the adaptation filters, then play the full story.',
    synopsis: 'An audio story uploaded from your device.',
    sourceAudioUrl: URL.createObjectURL(file),
    sourceAudioFile: file,
  }
}
