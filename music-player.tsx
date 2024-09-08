import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, Shuffle, ArrowRight, X, Pause } from 'lucide-react'

const TOTAL_ALBUMS = 75
const ALBUM_GAP = 16
const PARALLAX_BREAKPOINT = 640
const LOAD_THRESHOLD = 200

const generateRandomColor = () => {
  return `#${Math.floor(Math.random()*16777215).toString(16)}`
}

const generateSVG = (id: number) => {
  const shapes = ['circle', 'rect', 'polygon']
  const randomShape = shapes[Math.floor(Math.random() * shapes.length)]
  const bgColor = generateRandomColor()
  const shapeColor = generateRandomColor()

  let shapeElement = ''
  switch (randomShape) {
    case 'circle':
      shapeElement = `<circle cx="200" cy="200" r="150" fill="${shapeColor}" />`
      break
    case 'rect':
      shapeElement = `<rect x="50" y="50" width="300" height="300" fill="${shapeColor}" />`
      break
    case 'polygon':
      const points = Array.from({length: 6}, () => `${Math.random()*400},${Math.random()*400}`).join(' ')
      shapeElement = `<polygon points="${points}" fill="${shapeColor}" />`
      break
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="${bgColor}" />
      ${shapeElement}
      <text x="200" y="380" font-family="Arial" font-size="24" fill="white" text-anchor="middle">Album ${id}</text>
    </svg>
  `
}

const generateAlbum = (id: number) => {
  const albumNames = [
    "Whispering Meadows", "Neon Echoes", "Cosmic Lullaby", "Urban Legends", "Quantum Harmonies",
    "Ethereal Rhythms", "Neon Nights", "Organic Circuits", "Lunar Tides", "Temporal Flux",
    "Astral Projections", "Cybernetic Symphony", "Quantum Entanglement", "Holographic Memories", "Bioluminescent Beats"
  ]
  const artistNames = [
    "Silent River", "Digital Dreamers", "Stardust Collective", "City Soundscape", "Particle Ensemble",
    "Celestial Beats", "Synthwave Collective", "Bionic Orchestra", "Gravity Pulse", "Chronos Quartet"
  ]

  const svgString = generateSVG(id)

  return {
    id: `ALBUM_${id}`,
    name: albumNames[Math.floor(Math.random() * albumNames.length)],
    artist: artistNames[Math.floor(Math.random() * artistNames.length)],
    cover: svgString
  }
}

const PlayIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5v14l11-7z" fill="currentColor" />
  </svg>
)

const SkipBackIcon = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 20L9 12l10-8v16z" fill="currentColor" />
    <rect x="5" y="4" width="2" height="16" fill="currentColor" />
  </svg>
)

const SkipForwardIcon = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 4l10 8-10 8V4z" fill="currentColor" />
    <rect x="17" y="4" width="2" height="16" fill="currentColor" />
  </svg>
)

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [columnCount, setColumnCount] = useState(5)
  const [isParallaxEnabled, setIsParallaxEnabled] = useState(true)
  const [isFading, setIsFading] = useState(false)
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [isSearchFading, setIsSearchFading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredAlbums, setFilteredAlbums] = useState<ReturnType<typeof generateAlbum>[]>([])
  const [currentAlbum, setCurrentAlbum] = useState<ReturnType<typeof generateAlbum> | null>(null)
  const [prevAlbum, setPrevAlbum] = useState<ReturnType<typeof generateAlbum> | null>(null)
  const [nextAlbum, setNextAlbum] = useState<ReturnType<typeof generateAlbum> | null>(null)
  const [albumHistory, setAlbumHistory] = useState<ReturnType<typeof generateAlbum>[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [rotation, setRotation] = useState(0)
  const [tooltipContent, setTooltipContent] = useState<{ text: string, x: number, y: number } | null>(null)

  const playerRef = useRef<HTMLDivElement>(null)
  const columnRefs = useRef<(HTMLDivElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const albumCoverRef = useRef<HTMLDivElement>(null)
  const rotationIntervalRef = useRef<number | null>(null)

  const initialAlbumsData = useMemo(() => Array.from({ length: TOTAL_ALBUMS }, (_, i) => generateAlbum(i + 1)), [])
  const [albumsData, setAlbumsData] = useState(initialAlbumsData)

  useEffect(() => {
    const randomAlbums = [...albumsData].sort(() => 0.5 - Math.random()).slice(0, 3)
    setCurrentAlbum(randomAlbums[0])
    setPrevAlbum(randomAlbums[1])
    setNextAlbum(randomAlbums[2])
    setAlbumHistory([randomAlbums[0]])
    setHistoryIndex(0)
  }, [albumsData])

  useEffect(() => {
    setFilteredAlbums(albumsData)
  }, [albumsData])

  const columnRates = useMemo(() => {
    const baseRate = 0.2
    const maxRate = 1.5
    const rates = Array(columnCount).fill(0).map(() => baseRate + Math.random() * (maxRate - baseRate))
    return rates.sort(() => Math.random() - 0.5)
  }, [columnCount])

  useEffect(() => {
    let resizeTimer: NodeJS.Timeout

    const handleResize = () => {
      const width = window.innerWidth
      if (width < 640) setColumnCount(1)
      else if (width < 768) setColumnCount(2)
      else if (width < 1024) setColumnCount(3)
      else if (width < 1280) setColumnCount(4)
      else setColumnCount(5)
      
      setIsParallaxEnabled(width >= PARALLAX_BREAKPOINT)

      clearTimeout(resizeTimer)

      resizeTimer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: 0,
            behavior: 'smooth'
          })
        }
      }, 250)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimer)
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (!isParallaxEnabled || !scrollContainerRef.current) return

    const scrollY = scrollContainerRef.current.scrollTop
    const viewportHeight = scrollContainerRef.current.clientHeight

    columnRefs.current.forEach((column, index) => {
      if (column) {
        const rate = columnRates[index]
        const yOffset = scrollY * rate
        column.style.transform = `translateY(${-yOffset}px)`

        const columnRect = column.getBoundingClientRect()
        if (columnRect.bottom <= viewportHeight + LOAD_THRESHOLD) {
          setAlbumsData(prevData => {
            const columnAlbums = prevData.filter((_, i) => i % columnCount === index)
            const newColumnAlbums = columnAlbums.map(album => ({
              ...album,
              id: `${album.id}_dup`
            }))
            return [...prevData, ...newColumnAlbums]
          })
        }
      }
    })
  }, [isParallaxEnabled, columnRates, columnCount])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll)
      return () => scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  useEffect(() => {
    if (isPlaying) {
      rotationIntervalRef.current = window.setInterval(() => {
        setRotation(prev => (prev + 10) % 360) // Increased rotation speed
      }, 50)
    } else if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current)
    }
    return () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current)
      }
    }
  }, [isPlaying])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const handleThumbnailClick = (album: ReturnType<typeof generateAlbum>) => {
    setIsFading(true)
    setTimeout(() => {
      setCurrentAlbum(album)
      setPrevAlbum(currentAlbum)
      setNextAlbum(getRandomAlbum())
      updateAlbumHistory(album)
      setIsPlaying(false)
      setIsFading(false)
    }, 300)
  }

  const handleAlbumHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const tiltX = (x - centerX) / centerX
    const tiltY = (y - centerY) / centerY
    e.currentTarget.style.transform = `perspective(1000px) rotateX(${tiltY * 10}deg) rotateY(${-tiltX * 10}deg) scale3d(1.05, 1.05, 1.05)`
    e.currentTarget.style.zIndex = '10'
    
    const shadowX = (x - centerX) * 0.1
    const shadowY = (y - centerY) * 0.1
    e.currentTarget.style.boxShadow = `
      ${shadowX}px ${shadowY}px 20px rgba(0,0,0,0.4),
      ${shadowX * 2}px ${shadowY * 2}px 40px rgba(0,0,0,0.2)
    `
  }

  const handleAlbumLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
    e.currentTarget.style.zIndex = '1'
    e.currentTarget.style.boxShadow = 'none'
  }

  const getRandomAlbum = () => {
    const randomIndex = Math.floor(Math.random() * albumsData.length)
    return albumsData[randomIndex]
  }

  const updateAlbumHistory = (album: ReturnType<typeof generateAlbum>) => {
    setAlbumHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), album]
      setHistoryIndex(newHistory.length - 1)
      return newHistory
    })
  }

  const handlePrevious = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1)
      const prevHistoryAlbum = albumHistory[historyIndex - 1]
      setCurrentAlbum(prevHistoryAlbum)
      setPrevAlbum(albumHistory[historyIndex - 2] || getRandomAlbum())
      setNextAlbum(currentAlbum)
    }
  }

  const handleNext = () => {
    if (historyIndex < albumHistory.length - 1) {
      setHistoryIndex(prev => prev + 1)
      const nextHistoryAlbum = albumHistory[historyIndex + 1]
      setCurrentAlbum(nextHistoryAlbum)
      setPrevAlbum(currentAlbum)
      setNextAlbum(albumHistory[historyIndex + 2] || getRandomAlbum())
    } else {
      const newNextAlbum = nextAlbum || getRandomAlbum()
      setCurrentAlbum(newNextAlbum)
      setPrevAlbum(currentAlbum)
      setNextAlbum(getRandomAlbum())
      updateAlbumHistory(newNextAlbum)
    }
  }

  const toggleSearch = () => {
    setIsSearchFading(true)
    setTimeout(() => {
      setIsSearchVisible(!isSearchVisible)
      setIsSearchFading(false)
    }, 300)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleSearchSubmit = () => {
    const filtered = albumsData.filter(album => 
      album.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      album.artist.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredAlbums(filtered)
  }

  const shuffleAndReload = () => {
    const shuffledAlbums = [...albumsData].sort(() => Math.random() - 0.5)
    setAlbumsData(shuffledAlbums)
    setFilteredAlbums(shuffledAlbums)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }

  const handleTooltipEnter = (e: React.MouseEvent<HTMLButtonElement>, content: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipContent({
      text: content,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    })
  }

  const handleTooltipLeave = () => {
    setTooltipContent(null)
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <style jsx global>{`
        @keyframes rotation {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <div 
        ref={scrollContainerRef}
        className="relative z-10 h-screen overflow-y-scroll scrollbar-hide"
      >
        <div 
          ref={containerRef}
          className="flex flex-wrap"
          style={{ padding: `${ALBUM_GAP}px` }}
        >
          {[...Array(columnCount)].map((_, columnIndex) => (
            <div
              key={columnIndex}
              ref={(el) => (columnRefs.current[columnIndex] = el)}
              className="flex flex-col"
              style={{
                width: `calc(${100 / columnCount}% - ${ALBUM_GAP * (columnCount - 1) / columnCount}px)`,
                marginRight: columnIndex < columnCount - 1 ? `${ALBUM_GAP}px` : '0',
                transition: 'transform 0.1s ease-out',
              }}
            >
              {filteredAlbums
                .filter((_, index) => index % columnCount === columnIndex)
                .map((album) => (
                  <div
                    key={album.id}
                    className="w-full cursor-pointer relative overflow-hidden rounded-lg shadow-lg group mb-4"
                    onClick={() => handleThumbnailClick(album)}
                    onMouseMove={handleAlbumHover}
                    onMouseLeave={handleAlbumLeave}
                    data-albumid={album.id}
                    style={{ 
                      paddingBottom: '100%',
                      transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease-in-out, z-index 0.3s ease-in-out',
                      zIndex: 1
                    }}
                  >
                    <div 
                      className="absolute inset-0 w-full h-full"
                      dangerouslySetInnerHTML={{ __html: album.cover }}
                    />
                    <div className="absolute inset-0 bg-black opacity-45 group-hover:opacity-0 transition-opacity duration-300 ease-in-out"></div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
      <div className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div ref={playerRef} className="w-96 h-96 bg-black bg-opacity-80 rounded-full flex items-center justify-center backdrop-blur-md pointer-events-auto shadow-lg" style={{ boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)' }}>
          <div className="w-88 h-88 bg-gray-800 rounded-full flex items-center justify-center relative overflow-hidden">
            <div
              ref={albumCoverRef}
              className="absolute inset-0 w-full h-full"
              dangerouslySetInnerHTML={{ __html: currentAlbum?.cover || '' }}
              style={{ 
                transform: `rotate(${rotation}deg)`,
                transition: isPlaying ? 'none' : 'transform 0.5s ease-out'
              }}
            />
            <div className="absolute inset-0 bg-black opacity-60"></div>
            <div
              className="absolute inset-0"
              style={{
                background: `conic-gradient(#10B981 ${progress}%, transparent ${progress}%)`,
              }}
            ></div>
            <div className="absolute w-5 h-5 bg-black rounded-full z-10"></div>
            <div className={`w-80 h-80 bg-gray-900 bg-opacity-50 rounded-full flex flex-col items-center justify-center z-20 px-4 transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
              <h2 
                id="player_albumname" 
                className="text-white text-2xl font-bold mb-2 text-center"
                style={{ fontSize: '1.75rem' }}
              >
                {currentAlbum?.name}
              </h2>
              <p 
                id="player_albumartist" 
                className="text-gray-200 text-lg mb-6 text-center"
              >
                {currentAlbum?.artist}
              </p>
              <div className="flex items-center space-x-6">
                <button 
                  className="text-white p-2 rounded-full bg-black relative group"
                  onClick={handlePrevious}
                  onMouseEnter={(e) => handleTooltipEnter(e, prevAlbum ? `${prevAlbum.name} - ${prevAlbum.artist}` : 'No previous track')}
                  onMouseLeave={handleTooltipLeave}
                  aria-label="Previous track"
                >
                  <SkipBackIcon />
                </button>
                <button 
                  className="text-white p-3 rounded-full bg-green-500 flex items-center justify-center w-12 h-12 hover:bg-green-600 transition-colors duration-300 ease-in-out" 
                  onClick={togglePlay} 
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={24} /> : <PlayIcon />}
                </button>
                <button 
                  className="text-white p-2 rounded-full bg-black relative group"
                  onClick={handleNext}
                  onMouseEnter={(e) => handleTooltipEnter(e, nextAlbum ? `${nextAlbum.name} - ${nextAlbum.artist}` : 'No next track')}
                  onMouseLeave={handleTooltipLeave}
                  aria-label="Next track"
                >
                  <SkipForwardIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed top-4 left-4 z-30 flex space-x-4">
        <button
          onClick={toggleSearch}
          className="bg-white text-black p-3 rounded-full shadow-lg hover:bg-green-500 hover:text-white transition-colors duration-300 ease-in-out"
          onMouseEnter={(e) => handleTooltipEnter(e, 'Search')}
          onMouseLeave={handleTooltipLeave}
          aria-label="Toggle search"
        >
          <Search size={24} />
        </button>
        <button
          onClick={shuffleAndReload}
          className="bg-white text-black p-3 rounded-full shadow-lg hover:bg-green-500 hover:text-white transition-colors duration-300 ease-in-out"
          onMouseEnter={(e) => handleTooltipEnter(e, 'Shuffle albums')}
          onMouseLeave={handleTooltipLeave}
          aria-label="Shuffle and reload"
        >
          <Shuffle size={24} />
        </button>
      </div>
      {(isSearchVisible || isSearchFading) && (
        <div className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-center mt-4 transition-opacity duration-300 ${isSearchFading ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex items-center bg-white rounded-full shadow-lg overflow-hidden" style={{ border: '4px solid rgba(0, 0, 0, 0.8)' }}>
            <input
              type="text"
              placeholder="Search albums or artists..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-64 px-6 py-3 text-lg font-bold text-black focus:outline-none"
            />
            <button
              onClick={handleSearchSubmit}
              className="bg-black text-white p-3 rounded-full hover:bg-green-500 transition-colors duration-300 ease-in-out"
              aria-label="Submit search"
            >
              <ArrowRight size={24} />
            </button>
            <button
              onClick={toggleSearch}
              className="bg-black text-white p-3 rounded-full ml-2 mr-1 hover:bg-green-500 transition-colors duration-300 ease-in-out"
              aria-label="Close search"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
      {tooltipContent && (
        <div 
          className="fixed z-50 px-4 py-2 bg-black text-white text-sm rounded-lg pointer-events-none"
          style={{
            left: `${tooltipContent.x}px`,
            top: `${tooltipContent.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {tooltipContent.text}
        </div>
      )}
    </div>
  )
}
