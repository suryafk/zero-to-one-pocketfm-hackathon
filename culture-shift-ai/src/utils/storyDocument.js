const textDecoder = new TextDecoder()

function cleanText(value) {
  return value.replace(/\s+/g, ' ').trim()
}

async function extractPdfOnServer(file) {
  const body = new FormData()
  body.append('pdf_file', file)
  const response = await fetch('/api/extract-pdf', { method: 'POST', body })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || 'The PDF could not be extracted by the OCR service.')
  return cleanText(data.text || '')
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
  const [{ GlobalWorkerOptions, getDocument }, { default: pdfWorkerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  const bytes = new Uint8Array(await file.arrayBuffer())
  let document
  let loadingTask

  try {
    loadingTask = getDocument({ data: bytes, useWorkerFetch: true })
    document = await loadingTask.promise
  } catch (error) {
    if (error?.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Remove the password and upload it again.')
    }
    return extractPdfOnServer(file)
  }

  const pages = []
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent({ includeMarkedContent: false })
      let pageText = ''
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue
        pageText += item.str
        pageText += item.hasEOL ? '\n' : ' '
      }
      const normalized = pageText.normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      if (normalized.trim()) pages.push(normalized.trim())
      page.cleanup()
    }
  } finally {
    await loadingTask.destroy()
  }

  const rawText = pages.join('\n\n')
  const text = cleanText(rawText)
  if (text.length < 40) {
    return extractPdfOnServer(file)
  }

  const nonWhitespaceCount = (text.match(/\S/g) || []).length
  const letterCount = (text.match(/\p{L}/gu) || []).length
  const replacementCount = (text.match(/[\uFFFD\uE000-\uF8FF]/g) || []).length
  const letterRatio = letterCount / Math.max(nonWhitespaceCount, 1)
  const corruptionRatio = replacementCount / Math.max(nonWhitespaceCount, 1)

  if (letterRatio < 0.35 || corruptionRatio > 0.01) {
    return extractPdfOnServer(file)
  }
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

export function createProcessingStory(file, processingType = 'document') {
  const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') || 'Uploaded story'
  return {
    id: `processing-${Date.now()}`,
    title,
    originalGenre: 'Drama',
    originalCulture: 'Uploaded Story',
    episode: 'Extracting your document',
    quote: 'Reading the story and preparing it for adaptation…',
    isExtracting: true,
    sourceFileName: file.name,
    processingType,
  }
}

export function createUploadedAudioStory(file, transcript) {
  const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') || 'Uploaded audio story'
  return {
    id: `uploaded-audio-${Date.now()}`,
    title,
    originalGenre: 'Drama',
    originalCulture: 'Uploaded Audio',
    listens: 'New',
    rating: 0,
    episode: 'Your uploaded audio story',
    quote: transcript.slice(0, 500),
    synopsis: transcript.slice(0, 1000),
    sourceText: transcript,
    transcript,
    sourceAudioUrl: URL.createObjectURL(file),
    sourceAudioFile: file,
  }
}
