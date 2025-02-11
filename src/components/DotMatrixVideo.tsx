"use client";

import { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Trash2 } from "lucide-react";

interface DotMatrixVideoProps {
  video: string;
}

export function DotMatrixVideo({ video }: DotMatrixVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleDownload = () => {
    // Create a link element
    const link = document.createElement('a');
    link.href = video;
    
    // Extract original filename from path and add "output-" prefix
    const filename = video.split('/').pop() || 'processed-video.mp4';
    const outputFilename = `output-${filename}`;
    
    link.download = outputFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClear = () => {
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.load();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={video}
          className="w-full h-full"
          controls
          playsInline
          autoPlay
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button 
          onClick={handleClear}
          variant="outline"
          className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 hover:text-white border-red-600"
        >
          <Trash2 className="w-4 h-4" />
          Clear Video
        </Button>
        <Button 
          onClick={handleDownload}
          className="flex items-center gap-2 bg-white text-black hover:bg-black hover:text-white"
        >
          <Download className="w-4 h-4" />
          Download Video
        </Button>
      </div>
    </div>
  );
} 