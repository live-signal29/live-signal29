import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ChartData {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  created_at: string;
}

interface ChartLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  charts: ChartData[];
  initialIndex: number;
}

const ChartLightbox = ({ isOpen, onClose, charts, initialIndex }: ChartLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentChart = charts[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, charts.length]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % charts.length);
    setZoom(1);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + charts.length) % charts.length);
    setZoom(1);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!currentChart) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        <div className="relative h-[95vh] flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
                  {currentChart.title}
                </h2>
                <p className="text-xs sm:text-sm text-gray-300">
                  {format(new Date(currentChart.created_at), "MMMM dd, yyyy")}
                </p>
                {currentChart.description && (
                  <p className="text-xs sm:text-sm text-gray-400 mt-2 line-clamp-2">
                    {currentChart.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/10 flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <div 
              className="relative transition-transform duration-300 ease-out"
              style={{ transform: `scale(${zoom})` }}
            >
              <img
                src={currentChart.image_url}
                alt={currentChart.title}
                className="max-w-full max-h-[85vh] object-contain"
              />
            </div>
          </div>

          {/* Navigation Arrows */}
          {charts.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white h-12 w-12"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white h-12 w-12"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between gap-4">
              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="text-white hover:bg-white/10 h-9 w-9"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Badge variant="secondary" className="bg-black/50 text-white border-white/20 min-w-[60px] justify-center">
                  {Math.round(zoom * 100)}%
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="text-white hover:bg-white/10 h-9 w-9"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/10 h-9 w-9 ml-2"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Counter */}
              {charts.length > 1 && (
                <Badge variant="secondary" className="bg-black/50 text-white border-white/20">
                  {currentIndex + 1} / {charts.length}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChartLightbox;
