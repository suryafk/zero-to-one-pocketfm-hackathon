import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchStories, transcribeAudioSource } from './api/adaptationApi.js'
import Screen1Library from './components/Screen1Library.jsx'
import Screen2Adaptation from './components/Screen2Adaptation.jsx'
import AboutUs from './components/AboutUs.jsx'
import { createProcessingStory, createUploadedAudioStory, createUploadedStory, extractBundledStoryText, extractStoryText } from './utils/storyDocument.js'

export default function App() {
  const [stories, setStories] = useState([])
  const [selectedStory, setSelectedStory] = useState(null)
  const [page, setPage] = useState('library')
  const [uploadError, setUploadError] = useState('')
  const [storySessions, setStorySessions] = useState({})
  const uploadRequest = useRef(0)

  useEffect(() => {
    fetchStories().then((catalog) => {
      setStories((current) => [
        ...catalog,
        ...current.filter((story) => story.id.startsWith('uploaded-')),
      ])

      Promise.all(catalog.map(async (story) => {
        if (!story.sourceDocument || story.sourceText) return story
        try {
          const sourceText = await extractBundledStoryText(story.sourceDocument, story.title)
          return { ...story, sourceText }
        } catch (error) {
          console.error(`[ReVibe] Could not prepare ${story.title}`, error)
          return story
        }
      })).then((preparedCatalog) => {
        setStories((current) => [
          ...preparedCatalog,
          ...current.filter((story) => story.id.startsWith('uploaded-')),
        ])
        setSelectedStory((current) => preparedCatalog.find((story) => story.id === current?.id) || current)
      })
    })
  }, [])

  const saveStorySession = useCallback((storyId, session) => {
    setStorySessions((current) => ({ ...current, [storyId]: session }))
  }, [])

  if (selectedStory) {
    return (
      <Screen2Adaptation
        key={selectedStory.id}
        story={selectedStory}
        initialSession={storySessions[selectedStory.id]}
        onSessionChange={saveStorySession}
        onBack={() => {
          uploadRequest.current += 1
          setSelectedStory(null)
        }}
      />
    )
  }

  if (page === 'about') {
    return <AboutUs onBack={() => setPage('library')} />
  }

  async function uploadStory(file) {
    const requestId = ++uploadRequest.current
    setUploadError('')
    try {
      if (file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3')) {
        setSelectedStory(createProcessingStory(file, 'audio'))
        const transcript = await transcribeAudioSource(file)
        if (requestId === uploadRequest.current) {
          const uploadedStory = createUploadedAudioStory(file, transcript)
          setStories((current) => [...current.filter((story) => story.id !== uploadedStory.id), uploadedStory])
          setSelectedStory(uploadedStory)
        }
        return
      }
      setSelectedStory(createProcessingStory(file))
      const text = await extractStoryText(file)
      if (!text) throw new Error('This document is empty. Choose a file containing story text.')
      if (requestId === uploadRequest.current) {
        const uploadedStory = createUploadedStory(file, text)
        setStories((current) => [...current.filter((story) => story.id !== uploadedStory.id), uploadedStory])
        setSelectedStory(uploadedStory)
      }
    } catch (error) {
      if (requestId === uploadRequest.current) {
        setSelectedStory(null)
        setUploadError(error.message || 'We could not read that document.')
      }
    }
  }

  return <Screen1Library stories={stories} onSelectStory={setSelectedStory} onUploadStory={uploadStory} uploadError={uploadError} onAbout={() => setPage('about')} />
}
