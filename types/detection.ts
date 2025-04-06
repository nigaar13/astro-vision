export type MediaType = "image" | "video"
export type DetectionMode = "waste" | "space"

export interface Detection {
  box: number[]
  class_name: string
  confidence: number
  frame?: number
  biodegradable?: boolean
}

export interface DetectionResult {
  detections: Detection[]
  processing_time: number
  class_counts: Record<string, number>
  waste_density?: number
  frame_count?: number
  fps?: number
}

export interface ModelInfo {
  id: string
  name: string
  description: string
  type: MediaType | "both"
  icon: string
  mode: DetectionMode
}

