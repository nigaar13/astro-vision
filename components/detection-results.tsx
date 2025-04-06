"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Play, Pause, SkipBack, SkipForward } from "lucide-react"
import type { DetectionResult, MediaType, DetectionMode } from "@/types/detection"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"

interface DetectionResultsProps {
  results: DetectionResult | null
  media: string | null
  mediaType: MediaType
  isProcessing: boolean
  mode: DetectionMode
}

export default function DetectionResults({ results, media, mediaType, isProcessing, mode }: DetectionResultsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [totalFrames, setTotalFrames] = useState(0)
  const [confidenceLevel, setConfidenceLevel] = useState(0.25) // Default confidence level

  // Filter detections based on confidence level
  const filteredDetections = results?.detections.filter((detection) => detection.confidence >= confidenceLevel)

  // For images
  useEffect(() => {
    if (results && media && mediaType === "image" && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      if (!ctx) return

      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        // Set canvas dimensions to match image
        canvas.width = img.width
        canvas.height = img.height

        // Draw the original image
        ctx.drawImage(img, 0, 0)

        // Draw bounding boxes for filtered detections
        filteredDetections?.forEach((detection) => {
          const { box, class_name, confidence, biodegradable } = detection
          const [x, y, width, height] = box

          // Draw rectangle
          ctx.strokeStyle = getColorForClass(class_name, biodegradable, mode)
          ctx.lineWidth = 2
          ctx.strokeRect(x, y, width, height)

          // Draw label background
          let label = `${class_name} ${Math.round(confidence * 100)}%`
          if (mode === "waste" && biodegradable !== undefined) {
            label += biodegradable ? " (Bio)" : " (Non-bio)"
          }

          const textMetrics = ctx.measureText(label)
          const textHeight = 20
          ctx.fillStyle = getColorForClass(class_name, biodegradable, mode)
          ctx.fillRect(x, y - textHeight, textMetrics.width + 10, textHeight)

          // Draw label text
          ctx.fillStyle = "#ffffff"
          ctx.font = "14px Arial"
          ctx.fillText(label, x + 5, y - 5)
        })
      }
      img.src = media
    }
  }, [filteredDetections, media, mediaType, mode])

  // For videos
  useEffect(() => {
    if (results && media && mediaType === "video" && videoRef.current) {
      const video = videoRef.current

      // Set up video event listeners
      video.onloadedmetadata = () => {
        setTotalFrames(Math.floor(video.duration * (results.fps || 30)))
      }

      video.onplay = () => setIsPlaying(true)
      video.onpause = () => setIsPlaying(false)
      video.onended = () => setIsPlaying(false)

      // Load the video
      video.src = media
      video.load()
    }
  }, [results, media, mediaType])

  // Video controls
  const togglePlayPause = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }

  const seekVideo = (frameIndex: number) => {
    if (!videoRef.current || !results?.fps) return

    const timeInSeconds = frameIndex / results.fps
    videoRef.current.currentTime = timeInSeconds
    setCurrentFrame(frameIndex)
  }

  const skipForward = () => {
    if (!videoRef.current || !results?.fps) return

    const newFrame = Math.min(currentFrame + 10, totalFrames - 1)
    seekVideo(newFrame)
  }

  const skipBackward = () => {
    if (!videoRef.current || !results?.fps) return

    const newFrame = Math.max(currentFrame - 10, 0)
    seekVideo(newFrame)
  }

  const getColorForClass = (className: string, biodegradable?: boolean, mode?: DetectionMode) => {
    if (mode === "waste") {
      // For waste detection, color based on biodegradable status if available
      if (biodegradable !== undefined) {
        return biodegradable ? "#10b981" : "#ef4444"
      }

      // Map waste classes to colors
      const wasteColorMap: Record<string, string> = {
        plastic: "#ef4444", // red (non-biodegradable)
        glass: "#f97316", // orange (non-biodegradable)
        metal: "#f59e0b", // amber (non-biodegradable)
        paper: "#10b981", // emerald (biodegradable)
        cardboard: "#059669", // green (biodegradable)
        organic: "#22c55e", // green (biodegradable)
      }

      return wasteColorMap[className.toLowerCase()] || "#6366f1" // indigo default
    } else {
      // Map space classes to colors
      const spaceColorMap: Record<string, string> = {
        star: "#f59e0b", // amber
        planet: "#3b82f6", // blue
        galaxy: "#8b5cf6", // violet
        nebula: "#ec4899", // pink
        asteroid: "#6b7280", // gray
        comet: "#14b8a6", // teal
        blackhole: "#1e293b", // slate
      }

      return spaceColorMap[className.toLowerCase()] || "#8b5cf6" // violet default
    }
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Processing {mediaType}...</p>
      </div>
    )
  }

  if (!results && !media) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>Upload and process a {mediaType} to see detection results</p>
      </div>
    )
  }

  if (!results && media) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>Click "Detect" to process this {mediaType}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Confidence Level Slider */}
      <div className="flex items-center space-x-4">
        <p className="text-sm font-medium">Confidence Level:</p>
        <Slider
          value={[confidenceLevel]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={(value) => setConfidenceLevel(value[0])}
          className="flex-1"
        />
        <p className="text-sm font-bold">{(confidenceLevel * 100).toFixed(0)}%</p>
      </div>

      <div className="relative border rounded-md overflow-hidden">
        {mediaType === "image" ? (
          <canvas ref={canvasRef} className="max-w-full h-auto" />
        ) : (
          <div className="space-y-2">
            <video
              ref={videoRef}
              className="max-w-full h-auto rounded-md"
              onTimeUpdate={() => {
                if (videoRef.current && results?.fps) {
                  setCurrentFrame(Math.floor(videoRef.current.currentTime * results.fps))
                }
              }}
            />

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" onClick={skipBackward}>
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="icon" onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              <Button variant="outline" size="icon" onClick={skipForward}>
                <SkipForward className="h-4 w-4" />
              </Button>

              <div className="flex-1">
                <Slider
                  value={[currentFrame]}
                  min={0}
                  max={totalFrames - 1}
                  step={1}
                  onValueChange={(value) => seekVideo(value[0])}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                {currentFrame}/{totalFrames}
              </div>
            </div>
          </div>
        )}
      </div>

      {results && (
        <div className="space-y-2">
          <h3 className={`font-medium ${mode === "waste" ? "waste-gradient-text" : "space-gradient-text"}`}>
            Detection Summary
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`p-4 rounded-md ${
                mode === "waste"
                  ? "bg-gradient-to-r from-astro-green/10 to-astro-blue/10"
                  : "bg-gradient-to-r from-astro-purple/10 to-astro-pink/10"
              }`}
            >
              <p className="text-sm font-medium">Objects Detected</p>
              <p className={`text-2xl font-bold ${mode === "waste" ? "waste-gradient-text" : "space-gradient-text"}`}>
                {filteredDetections?.length || 0}
              </p>
            </div>
            <div
              className={`p-4 rounded-md ${
                mode === "waste"
                  ? "bg-gradient-to-r from-astro-blue/10 to-astro-green/10"
                  : "bg-gradient-to-r from-astro-pink/10 to-astro-purple/10"
              }`}
            >
              <p className="text-sm font-medium">Processing Time</p>
              <p className={`text-2xl font-bold ${mode === "waste" ? "waste-gradient-text" : "space-gradient-text"}`}>
                {results.processing_time.toFixed(2)}s
              </p>
            </div>
          </div>

          <h3 className={`font-medium ${mode === "waste" ? "waste-gradient-text" : "space-gradient-text"}`}>
            Detected Classes
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(results.class_counts).map(([className, count]) => {
              // Find a detection with this class to get biodegradable status
              const detection = results.detections.find((d) => d.class_name === className)

              return (
                <div key={className} className="flex items-center bg-secondary/30 p-2 rounded-md">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: getColorForClass(className, detection?.biodegradable, mode) }}
                  />
                  <span className="text-sm flex-1">
                    {className}: {count}
                  </span>
                  {mode === "waste" && detection?.biodegradable !== undefined && (
                    <Badge
                      variant="outline"
                      className={
                        detection.biodegradable ? "bg-astro-green/20 text-astro-green" : "bg-red-500/20 text-red-500"
                      }
                    >
                      {detection.biodegradable ? "Bio" : "Non-bio"}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

