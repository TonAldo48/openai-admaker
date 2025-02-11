"use client";

import { useRef } from 'react';

interface DotMatrixVideoProps {
  video: string;
}

export function DotMatrixVideo({ video }: DotMatrixVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="w-full max-w-3xl mx-auto">
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
    </div>
  );
} 