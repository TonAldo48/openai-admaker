"use client";

import { useEffect, useRef } from 'react';

interface DotMatrixProps {
  image: string;
  dotSize: number;
  spacing: number;
}

export default function DotMatrix({ image, dotSize, spacing }: DotMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.src = image;

    img.onload = () => {
      // Calculate dimensions to maintain aspect ratio
      const maxWidth = 800;
      const maxHeight = 600;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth * height) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight * width) / height;
        height = maxHeight;
      }

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Get image data
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Clear canvas
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);

      // Draw dots
      for (let y = 0; y < height; y += dotSize + spacing) {
        for (let x = 0; x < width; x += dotSize + spacing) {
          const i = (y * width + x) * 4;
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          
          // Draw white dot with size based on brightness
          const radius = (brightness / 255) * (dotSize / 2);
          if (radius > 0.5) { // Only draw if bright enough
            ctx.beginPath();
            ctx.arc(x + dotSize/2, y + dotSize/2, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
          }
        }
      }
    };
  }, [image, dotSize, spacing]);

  return (
    <div className="w-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="max-w-full border border-zinc-800 rounded-lg"
      />
    </div>
  );
} 