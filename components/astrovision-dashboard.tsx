"use client"

import { useState } from "react"
import { Upload, Trash2, RefreshCw, ImageIcon, AlertCircle, Rocket, Recycle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import MediaUploader from "./media-uploader"
import DetectionResults from "./detection-results"
import DetectionHistory from "./detection-history"
import { ModelSelector } from "./model-selector"
import ModeSelector from "./mode-selector"
import type { DetectionResult, MediaType, ModelInfo, DetectionMode } from "@/types/detection"

// Available models
const WASTE_MODELS: ModelInfo[] = [
  {
    id: "yolo",
    name: "Biodegradable Detection",
    description: "Detects and classifies waste as biodegradable or non-biodegradable",
    type: "image",
    icon: "♻️",
    mode: "waste",
  },
  {
    id: "best2",
    name: "Advanced Waste Analysis",
    description: "Analyzes waste in videos with detailed classification",
    type: "video",
    icon: "🗑️",
    mode: "waste",
  },
]

const SPACE_MODELS: ModelInfo[] = [
  {
    id: "space-objects",
    name: "Space Object Recognition",
    description: "Identifies celestial bodies and space objects",
    type: "image",
    icon: "🪐",
    mode: "space",
  },
  {
    id: "space-anomalies",
    name: "Anomaly Detection",
    description: "Detects unusual patterns and anomalies in space imagery",
    type: "image",
    icon: "✨",
    mode: "space",
  },
]

// Mock data for testing without a backend
const MOCK_WASTE_RESULT: DetectionResult = {
  detections: [
    {
      box: [50, 50, 200, 150],
      class_name: "plastic",
      confidence: 0.92,
      biodegradable: false,
    },
    {
      box: [300, 100, 150, 200],
      class_name: "paper",
      confidence: 0.87,
      biodegradable: true,
    },
    {
      box: [150, 300, 100, 100],
      class_name: "organic",
      confidence: 0.76,
      biodegradable: true,
    },
  ],
  processing_time: 0.45,
  class_counts: {
    plastic: 1,
    paper: 1,
    organic: 1,
  },
}

const MOCK_SPACE_RESULT: DetectionResult = {
  detections: [
    {
      box: [100, 100, 200, 150],
      class_name: "star",
      confidence: 0.95,
    },
    {
      box: [400, 200, 100, 100],
      class_name: "planet",
      confidence: 0.88,
    },
    {
      box: [250, 350, 150, 100],
      class_name: "nebula",
      confidence: 0.82,
    },
  ],
  processing_time: 0.8,
  class_counts: {
    star: 1,
    planet: 1,
    nebula: 1,
  },
}

export default function AstroVisionDashboard() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentMedia, setCurrentMedia] = useState<string | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<MediaType>("image")
  const [results, setResults] = useState<DetectionResult | null>(null)
  const [history, setHistory] = useState<
    Array<{
      id: string
      media: string
      mediaType: MediaType
      timestamp: Date
      results: DetectionResult
      modelId: string
      mode: DetectionMode
    }>
  >([])
  const [error, setError] = useState<string | null>(null)
  const [useMockData, setUseMockData] = useState(true) // Set to true for demo purposes
  const [apiUrl, setApiUrl] = useState("http://localhost:5000/detect")
  const [detectionMode, setDetectionMode] = useState<DetectionMode>("waste")
  const [selectedModel, setSelectedModel] = useState<string>(WASTE_MODELS[0].id)

  // Get available models based on current mode
  const availableModels = detectionMode === "waste" ? WASTE_MODELS : SPACE_MODELS

  const handleMediaUpload = (mediaDataUrl: string, type: MediaType, file: File) => {
    setCurrentMedia(mediaDataUrl)
    setCurrentFile(file)
    setMediaType(type)
    setResults(null)
    setError(null)
  }

  const handleModeChange = (mode: DetectionMode) => {
    setDetectionMode(mode)
    setSelectedModel(mode === "waste" ? WASTE_MODELS[0].id : SPACE_MODELS[0].id)
    setCurrentMedia(null)
    setCurrentFile(null)
    setResults(null)
    setError(null)
  }

  const processMedia = async () => {
    if (!currentMedia || !currentFile) return

    setIsProcessing(true)
    setError(null)

    try {
      let data: DetectionResult

      if (useMockData) {
        // Use mock data for testing UI without backend
        await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate API delay
        data = detectionMode === "waste" ? MOCK_WASTE_RESULT : MOCK_SPACE_RESULT
      } else {
        // Create form data to send to API
        const formData = new FormData()
        formData.append("file", currentFile)
        formData.append("model", selectedModel)
        formData.append("media_type", mediaType)
        formData.append("mode", detectionMode)

        console.log(`Sending request to: ${apiUrl}`)

        // Send to backend API
        const response = await fetch(apiUrl, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Server responded with status ${response.status}: ${errorText}`)
        }

        data = await response.json()
        console.log("API Response:", data)
      }

      setResults(data)

      // Add to history
      const newHistoryItem = {
        id: Date.now().toString(),
        media: currentMedia,
        mediaType: mediaType,
        timestamp: new Date(),
        results: data,
        modelId: selectedModel,
        mode: detectionMode,
      }

      setHistory((prev) => [newHistoryItem, ...prev])
    } catch (error) {
      console.error("Error processing media:", error)
      setError(error instanceof Error ? error.message : "Failed to process media. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const clearCurrent = () => {
    setCurrentMedia(null)
    setCurrentFile(null)
    setResults(null)
    setError(null)
  }

  // Get the current model info
  const currentModelInfo = availableModels.find((model) => model.id === selectedModel) || availableModels[0]

  // Determine acceptable media types based on selected model
  const acceptedTypes =
    currentModelInfo.type === "image" ? "image/*" : currentModelInfo.type === "video" ? "video/*" : "image/*,video/*"

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-gradient-to-r from-astro-blue to-astro-purple p-6 rounded-xl text-white">
        <h1 className="text-3xl font-bold">AstroVision</h1>
        <p className="opacity-90 mt-2">
          Advanced detection platform for waste classification and space object recognition
        </p>
      </div>

      <ModeSelector currentMode={detectionMode} onModeChange={handleModeChange} />

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="bg-gradient-to-r from-astro-blue/20 to-astro-purple/20">
          <TabsTrigger value="upload" className="data-[state=active]:bg-background">
            <Upload className="mr-2 h-4 w-4" />
            Upload & Detect
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-background">
            <ImageIcon className="mr-2 h-4 w-4" />
            Detection History
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-background">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="astro-card">
              <CardHeader className="astro-card-header">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Upload {mediaType === "image" ? "Image" : "Video"}</CardTitle>
                    <CardDescription>
                      Upload {mediaType === "image" ? "an image" : "a video"} for{" "}
                      {detectionMode === "waste" ? "waste classification" : "space recognition"}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={`bg-gradient-to-r ${detectionMode === "waste" ? "from-astro-green/10 to-astro-blue/10" : "from-astro-purple/10 to-astro-pink/10"}`}
                  >
                    {mediaType === "image" ? "Image" : "Video"} Mode
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Model</Label>
                    <ModelSelector
                      models={availableModels}
                      selectedModel={selectedModel}
                      onSelectModel={(modelId) => {
                        setSelectedModel(modelId)
                        const newModel = availableModels.find((m) => m.id === modelId)
                        if (newModel) {
                          if (newModel.type === "image") {
                            setMediaType("image")
                          } else if (newModel.type === "video") {
                            setMediaType("video")
                          }
                          // For 'both' type, keep current mediaType
                        }
                        clearCurrent()
                      }}
                    />
                  </div>

                  <MediaUploader
                    onMediaSelected={handleMediaUpload}
                    currentMedia={currentMedia}
                    mediaType={mediaType}
                    acceptedTypes={acceptedTypes}
                    mode={detectionMode}
                  />

                  {error && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between p-6 bg-gradient-to-r from-background/50 to-background">
                <Button
                  variant="outline"
                  onClick={clearCurrent}
                  disabled={!currentMedia || isProcessing}
                  className="border-astro-blue hover:bg-astro-blue/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear
                </Button>
                <Button
                  onClick={processMedia}
                  disabled={!currentMedia || isProcessing}
                  className={`${detectionMode === "waste" ? "astro-button" : "astro-button-alt"} text-white`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {detectionMode === "waste" ? (
                        <>
                          <Recycle className="mr-2 h-4 w-4" />
                          Classify Waste
                        </>
                      ) : (
                        <>
                          <Rocket className="mr-2 h-4 w-4" />
                          Analyze Space
                        </>
                      )}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card className="astro-card">
              <CardHeader className="astro-card-header">
                <CardTitle>Detection Results</CardTitle>
                <CardDescription>
                  View the {detectionMode === "waste" ? "waste classification" : "space recognition"} results
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 min-h-[300px]">
                <DetectionResults
                  results={results}
                  media={currentMedia}
                  mediaType={mediaType}
                  isProcessing={isProcessing}
                  mode={detectionMode}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="astro-card">
            <CardHeader className="astro-card-header">
              <CardTitle>Detection History</CardTitle>
              <CardDescription>View your previous detection results</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <DetectionHistory history={history} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="astro-card">
            <CardHeader className="astro-card-header">
              <CardTitle>Settings</CardTitle>
              <CardDescription>Configure the detection dashboard</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mock-mode">Use Mock Data</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable this to test the UI without a backend connection
                  </p>
                </div>
                <Switch id="mock-mode" checked={useMockData} onCheckedChange={setUseMockData} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-url">API Endpoint URL</Label>
                <div className="flex gap-2">
                  <input
                    id="api-url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="http://localhost:5000/detect"
                  />
                  <Button variant="outline" onClick={() => setApiUrl("http://localhost:5000/detect")}>
                    Reset
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">The URL where your FastAPI backend is running</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

