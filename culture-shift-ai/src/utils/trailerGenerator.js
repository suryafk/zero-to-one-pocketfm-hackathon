const WIDTH = 960
const HEIGHT = 540
const SCENE_SECONDS = 6

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, 4)
}

function drawFrame(ctx, trailer, elapsed) {
  const sceneIndex = Math.min(Math.floor(elapsed / SCENE_SECONDS), trailer.scenes.length - 1)
  const scene = trailer.scenes[sceneIndex]
  const localProgress = (elapsed % SCENE_SECONDS) / SCENE_SECONDS
  const fade = Math.min(localProgress * 5, (1 - localProgress) * 5, 1)
  const accent = trailer.accent || '#ff5a36'

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
  gradient.addColorStop(0, '#0f1117')
  gradient.addColorStop(0.58, '#171521')
  gradient.addColorStop(1, accent)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.globalAlpha = 0.13
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 173 + elapsed * (25 + (i % 4) * 9)) % (WIDTH + 120) - 60
    const y = (i * 97) % HEIGHT
    ctx.beginPath()
    ctx.arc(x, y, 6 + (i % 5) * 5, 0, Math.PI * 2)
    ctx.fillStyle = i % 2 ? accent : '#ffffff'
    ctx.fill()
  }
  ctx.globalAlpha = fade

  ctx.fillStyle = accent
  ctx.font = '700 18px system-ui, sans-serif'
  ctx.fillText(`REVIBE • ${trailer.genre.toUpperCase()} • ${trailer.culture.toUpperCase()}`, 70, 72)

  ctx.fillStyle = '#ffffff'
  ctx.font = '800 54px system-ui, sans-serif'
  const lines = wrapText(ctx, scene.text, 800)
  const lineHeight = 67
  const startY = 215 - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((line, index) => ctx.fillText(line, 70, startY + index * lineHeight))

  ctx.fillStyle = 'rgba(255,255,255,.72)'
  ctx.font = '600 17px system-ui, sans-serif'
  ctx.fillText(scene.label.toUpperCase(), 70, 455)

  ctx.globalAlpha = 0.3
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(70, 492, 820, 4)
  ctx.globalAlpha = 1
  ctx.fillStyle = accent
  ctx.fillRect(70, 492, 820 * Math.min(elapsed / (trailer.scenes.length * SCENE_SECONDS), 1), 4)
  ctx.globalAlpha = 1
}

export async function generateTrailerVideo(trailer, onProgress = () => {}) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('Video generation is not supported by this browser. Try the latest Chrome, Edge, or Firefox.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  const stream = canvas.captureStream(30)
  const supportedType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find((type) => MediaRecorder.isTypeSupported(type))
  const recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined)
  const chunks = []
  recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data)

  const duration = trailer.scenes.length * SCENE_SECONDS
  const startedAt = performance.now()
  recorder.start(250)

  return new Promise((resolve, reject) => {
    recorder.onerror = () => reject(new Error('The browser could not encode the trailer.'))
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop())
      resolve(new Blob(chunks, { type: supportedType || 'video/webm' }))
    }

    function render(now) {
      const elapsed = Math.min((now - startedAt) / 1000, duration)
      drawFrame(ctx, trailer, elapsed)
      onProgress(Math.round((elapsed / duration) * 100))
      if (elapsed < duration) requestAnimationFrame(render)
      else recorder.stop()
    }

    requestAnimationFrame(render)
  })
}
