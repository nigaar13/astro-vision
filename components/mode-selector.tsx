"use client"

import { Recycle, Rocket } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { DetectionMode } from "@/types/detection"

interface ModeSelectorProps {
  currentMode: DetectionMode
  onModeChange: (mode: DetectionMode) => void
}

export default function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card
        className={`p-4 cursor-pointer transition-all duration-300 hover:shadow-md ${
          currentMode === "waste"
            ? "bg-gradient-to-r from-astro-green/20 to-astro-blue/20 border-astro-green"
            : "bg-background hover:bg-secondary/50"
        }`}
        onClick={() => onModeChange("waste")}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-full ${
              currentMode === "waste" ? "bg-gradient-to-r from-astro-green to-astro-blue text-white" : "bg-secondary"
            }`}
          >
            <Recycle className="h-6 w-6" />
          </div>
          <div>
            <h3 className={`font-bold text-lg ${currentMode === "waste" ? "waste-gradient-text" : ""}`}>
              Waste Detection
            </h3>
            <p className="text-sm text-muted-foreground">Classify waste as biodegradable or non-biodegradable</p>
          </div>
        </div>
      </Card>

      <Card
        className={`p-4 cursor-pointer transition-all duration-300 hover:shadow-md ${
          currentMode === "space"
            ? "bg-gradient-to-r from-astro-purple/20 to-astro-pink/20 border-astro-purple"
            : "bg-background hover:bg-secondary/50"
        }`}
        onClick={() => onModeChange("space")}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-full ${
              currentMode === "space" ? "bg-gradient-to-r from-astro-purple to-astro-pink text-white" : "bg-secondary"
            }`}
          >
            <Rocket className="h-6 w-6" />
          </div>
          <div>
            <h3 className={`font-bold text-lg ${currentMode === "space" ? "space-gradient-text" : ""}`}>
              Space Recognition
            </h3>
            <p className="text-sm text-muted-foreground">Identify celestial objects and space phenomena</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

