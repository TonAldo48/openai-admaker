"use client";

import { useState, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DotMatrix from "@/components/DotMatrix";
import { DotMatrixVideo } from "@/components/DotMatrixVideo";
import Image from "next/image";
import { Loader2, Upload, Download, X } from "lucide-react";

export default function Home() {
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaSource, setMediaSource] = useState<string | null>(null);
  const [dotSize, setDotSize] = useState([4]);
  const [spacing, setSpacing] = useState([2]);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let file: File | null = null;
    
    if ('dataTransfer' in e) {
      // Handle drag and drop
      e.preventDefault();
      file = e.dataTransfer.files[0] || null;
    } else {
      // Handle file input
      file = e.target.files?.[0] || null;
    }

    if (!file) return;

    setIsLoading(true);
    setProgress(0);

    if (file.type.startsWith('image/')) {
      setMediaType('image');
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setProgress(progress);
        }
      };

      reader.onload = (e) => {
        setMediaSource(e.target?.result as string);
        setIsLoading(false);
        setProgress(100);
        toast({
          title: "Image uploaded",
          description: "Your image has been processed into dot matrix style",
        });
      };

      reader.onerror = () => {
        setIsLoading(false);
        setProgress(0);
        toast({
          title: "Upload failed",
          description: "There was an error uploading your image",
          variant: "destructive",
        });
      };

      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setMediaType('video');
      const formData = new FormData();
      formData.append('video', file);
      formData.append('dotSize', dotSize[0].toString());
      formData.append('spacing', spacing[0].toString());

      try {
        const response = await fetch('/api/process-video', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to process video');
        }

        const data = await response.json();
        setMediaSource(data.url);
        toast({
          title: "Video processed",
          description: "Your video has been converted to dot matrix style",
        });
      } catch {
        toast({
          title: "Processing failed",
          description: "There was an error processing your video",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setProgress(100);
      }
    } else {
      setIsLoading(false);
      toast({
        title: "Invalid file type",
        description: "Please upload an image or video file",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    if (!isLoading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleClear = () => {
    setMediaSource(null);
    setMediaType(null);
    // Reset the file input value so the same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering file upload click
    if (!mediaSource) return;

    if (mediaType === 'image') {
      // Get the canvas element
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        toast({
          title: "Error",
          description: "Could not find the processed image",
          variant: "destructive",
        });
        return;
      }

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          toast({
            title: "Error",
            description: "Could not process the image for download",
            variant: "destructive",
          });
          return;
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dotify-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } else {
      // For videos, download directly from the source
      const a = document.createElement('a');
      a.href = mediaSource;
      a.download = `dotify-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto w-full p-4 flex flex-col min-h-screen">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleMediaUpload}
          className="hidden"
        />
        <div className="py-6 text-center flex flex-col items-center gap-4">
          <Image 
            src="/logo.svg" 
            alt="dotify Logo" 
            width={40} 
            height={40} 
            className="opacity-90"
          />
          <div>
            <h1 className="text-3xl font-medium tracking-tight mb-1">dotify</h1>
            <p className="text-white/80 text-sm">
              Turn any image or video into elegant dot patterns
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Controls */}
          <div className="w-full md:w-60 flex flex-col gap-6 md:gap-8">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-white/80">Dot Size</label>
                <span className="text-sm text-white/80">{dotSize}px</span>
              </div>
              <Slider
                value={dotSize}
                onValueChange={setDotSize}
                min={2}
                max={10}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-white/80">Spacing</label>
                <span className="text-sm text-white/80">{spacing}px</span>
              </div>
              <Slider
                value={spacing}
                onValueChange={setSpacing}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            </div>

            {isLoading && (
              <div className="space-y-1">
                <Progress value={progress} className="h-1" />
                <p className="text-xs text-white/70 text-right">{Math.round(progress)}%</p>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="flex-1 flex flex-col gap-4">
            <div 
              onClick={handleClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleMediaUpload}
              className={`aspect-[4/3] md:aspect-auto flex items-center justify-center border-2 rounded-lg transition-all cursor-pointer
                ${isDragging 
                  ? 'border-white/60 bg-white/10' 
                  : mediaSource 
                    ? 'border-white/20 bg-black/50' 
                    : 'border-dashed border-white/20 bg-black/50 hover:border-white/40'
                }`}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-4 p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-white/80" />
                  <div className="space-y-2 text-center">
                    <p className="text-white/70 text-sm">Processing {mediaType}...</p>
                    <div className="w-48">
                      <Progress value={progress} className="h-1" />
                    </div>
                  </div>
                </div>
              ) : mediaSource ? (
                <div className="relative w-full h-full">
                  {mediaType === 'image' ? (
                    <DotMatrix
                      image={mediaSource}
                      dotSize={dotSize[0]}
                      spacing={spacing[0]}
                    />
                  ) : (
                    <DotMatrixVideo
                      video={mediaSource}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center space-y-2 p-8">
                  <Upload className="w-8 h-8 mx-auto text-white/70" />
                  <div>
                    <p className="text-white/90 text-sm font-medium">Drop files here or click to upload</p>
                    <p className="text-white/50 text-xs mt-1">Supports JPG, PNG, MP4, WebM, and other common formats</p>
                  </div>
                </div>
              )}
            </div>

            {mediaSource && (
              <div className="flex justify-center gap-2">
                <Button
                  onClick={handleClear}
                  size="sm"
                  variant="destructive"
                  className="flex gap-1.5 items-center"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
                <Button
                  onClick={handleDownload}
                  size="sm"
                  className="flex gap-1.5 items-center bg-white hover:bg-white/90 text-black border-0"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="py-8 mt-auto">
          <div className="flex items-center justify-center gap-4 text-sm">
            <Dialog>
              <DialogTrigger className="text-white/60 hover:text-white/80 transition-colors">
                Help
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>About Dotify</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <p className="text-sm text-white/70">
                    Dotify is a web application that transforms your images and videos into elegant dot matrix patterns.
                    Upload any image or video, adjust the dot size and spacing, and create unique artistic renditions of your media.
                  </p>
                  <div className="space-y-2">
                    <h3 className="font-medium">Features</h3>
                    <ul className="list-disc list-inside text-sm text-white/70 space-y-1">
                      <li>Support for images (JPG, PNG) and videos (MP4, WebM)</li>
                      <li>Adjustable dot size and spacing</li>
                      <li>Real-time preview</li>
                      <li>Download processed media</li>
                      <li>Drag and drop support</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <span className="text-white/40">|</span>
            <Dialog>
              <DialogTrigger className="text-white/60 hover:text-white/80 transition-colors">
                Privacy Policy
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Privacy Policy</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4 text-sm text-white/70">
                  <p>
                    Your privacy is important to us. Dotify processes all media directly in your browser.
                    We do not store or collect any of your uploaded media files.
                  </p>
                  <div className="space-y-2">
                    <h3 className="font-medium text-white">Data Processing</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>All processing happens locally in your browser</li>
                      <li>No media files are stored on our servers</li>
                      <li>No personal information is collected</li>
                      <li>No cookies are used</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <span className="text-white/40">|</span>
            <a 
              href="https://github.com/yourusername/dotify" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white/80 transition-colors flex items-center gap-1.5"
            >
              GitHub
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
} 