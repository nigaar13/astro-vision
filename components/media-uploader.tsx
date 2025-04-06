"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Upload, ImageIcon, Video, FileIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { MediaType, DetectionMode } from "@/types/detection"

interface MediaUploaderProps {
  onMediaSelected: (mediaDataUrl: string, type: MediaType, file: File) => void
  currentMedia: string | null
  acceptedTypes: string
  mode: DetectionMode
}

export default function MediaUploader({ onMediaSelected, currentMedia, acceptedTypes, mode }: MediaUploaderProps) {
  const [mediaType, setMediaType] = useState<MediaType>("image") // Default to "image"
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    // Check if file type matches the expected media type
    const isImage = file.type.startsWith("image/")
    const isVideo = file.type.startsWith("video/")

    if ((mediaType === "image" && !isImage) || (mediaType === "video" && !isVideo)) {
      alert(`Please select a ${mediaType} file`)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        onMediaSelected(e.target.result as string, isVideo ? "video" : "image", file)
      }
    }
    reader.readAsDataURL(file)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const getPlaceholderIcon = () => {
    if (mediaType === "image") {
      return <ImageIcon className="h-10 w-10 text-muted-foreground" />
    } else if (mediaType === "video") {
      return <Video className="h-10 w-10 text-muted-foreground" />
    } else {
      return <FileIcon className="h-10 w-10 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Media Type Selector */}
      <div className="flex items-center space-x-4">
        <p className="text-sm font-medium">Select Media Type:</p>
        <Select value={mediaType} onValueChange={(value) => setMediaType(value as MediaType)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Select media type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Drag-and-Drop or Click-to-Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center min-h-[200px] cursor-pointer transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        {currentMedia ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {mediaType === "image" ? (
              <img
                src={currentMedia || "/placeholder.svg"}
                alt="Uploaded media"
                className="max-h-[200px] max-w-full object-contain rounded-md"
              />
            ) : (
              <video src={currentMedia} controls className="max-h-[200px] max-w-full object-contain rounded-md" />
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className={`p-6 rounded-full ${mode === "waste" ? "bg-astro-green/20" : "bg-astro-purple/20"}`}>
                {getPlaceholderIcon()}
              </div>
              <div className="flex flex-col space-y-2">
                <p
                  className={`text-lg font-medium ${mode === "waste" ? "waste-gradient-text" : "space-gradient-text"}`}
                >
                  Click to upload or drag & drop
                </p>
                <p className="text-sm text-muted-foreground">
                  {mediaType === "image"
                    ? "Supports: JPG, PNG, WEBP (Max 10MB)"
                    : "Supports: MP4, MOV, AVI (Max 100MB)"}
                </p>
                <Button className={`${mode === "waste" ? "astro-button" : "astro-button-alt"} text-white mt-4`}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {mediaType}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={mediaType === "image" ? "image/*" : "video/*"}
        className="hidden"
      />
    </div>
  )
}

