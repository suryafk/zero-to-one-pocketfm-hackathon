import { useEffect, useRef, useState } from 'react'
import { fetchStories } from './api/adaptationApi.js'
import Screen1Library from './components/Screen1Library.jsx'
import Screen2Adaptation from './components/Screen2Adaptation.jsx'
import { createProcessingStory, createUploadedAudioStory, createUploadedStory, extractStoryText } from './utils/storyDocument.js'

export default function App() {
  const [stories, setStories] = useState([])
  const [selectedStory, setSelectedStory] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const uploadRequest = useRef(0)

  useEffect(() => {
    fetchStories().then(setStories)
  }, [])

  if (selectedStory) {
    return (
      <Screen2Adaptation
        story={selectedStory}
        onBack={() => {
          uploadRequest.current += 1
          setSelectedStory(null)
        }}
      />
    )
  }

  async function uploadStory(file) {
    const requestId = ++uploadRequest.current
    setUploadError('')
    try {
      if (file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3')) {
        setSelectedStory(createUploadedAudioStory(file))
        return
      }
      setSelectedStory(createProcessingStory(file))
      const text = await extractStoryText(file)
      if (!text) throw new Error('This document is empty. Choose a file containing story text.')
      if (requestId === uploadRequest.current) setSelectedStory(createUploadedStory(file, text))
    } catch (error) {
      if (requestId === uploadRequest.current) {
        setSelectedStory(null)
        setUploadError(error.message || 'We could not read that document.')
      }
    }
  }

  return <Screen1Library stories={stories} onSelectStory={setSelectedStory} onUploadStory={uploadStory} uploadError={uploadError} />
}
