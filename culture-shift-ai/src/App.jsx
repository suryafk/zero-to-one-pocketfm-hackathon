import { useEffect, useState } from 'react'
import { fetchStories } from './api/adaptationApi.js'
import Screen1Library from './components/Screen1Library.jsx'
import Screen2Adaptation from './components/Screen2Adaptation.jsx'

export default function App() {
  const [stories, setStories] = useState([])
  const [selectedStory, setSelectedStory] = useState(null)

  useEffect(() => {
    fetchStories().then(setStories)
  }, [])

  if (selectedStory) {
    return (
      <Screen2Adaptation
        story={selectedStory}
        onBack={() => setSelectedStory(null)}
      />
    )
  }

  return <Screen1Library stories={stories} onSelectStory={setSelectedStory} />
}
