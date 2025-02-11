"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import DotMatrix from "@/components/DotMatrix";
import { DotMatrixVideo } from "@/components/DotMatrixVideo";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaSource, setMediaSource] = useState<string | null>(null);
  const [dotSize, setDotSize] = useState([4]);
  const [spacing, setSpacing] = useState([2]);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
      } catch (error) {
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

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto w-full p-4 flex flex-col">
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
            <p className="text-white/60 text-sm">
              Turn any image or video into elegant dot patterns
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Controls */}
          <div className="w-full md:w-60 flex flex-col gap-6 md:gap-8">
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                disabled={isLoading}
                className="bg-transparent border border-white/10 hover:border-white/20 transition-colors file:bg-white/5 file:text-white file:border-0 file:mr-4"
              />
              {isLoading && (
                <div className="space-y-1">
                  <Progress value={progress} className="h-1" />
                  <p className="text-xs text-white/60 text-right">{Math.round(progress)}%</p>
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-white/60">Dot Size</label>
                <span className="text-sm text-white/60">{dotSize}px</span>
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
                <label className="text-sm text-white/60">Spacing</label>
                <span className="text-sm text-white/60">{spacing}px</span>
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
          </div>

          {/* Preview */}
          <div className="flex-1 aspect-[4/3] md:aspect-auto flex items-center justify-center border border-white/10 rounded-lg">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4 p-8">
                <Loader2 className="w-8 h-8 animate-spin text-white/60" />
                <div className="space-y-2 text-center">
                  <p className="text-white/40 text-sm">Processing {mediaType}...</p>
                  <div className="w-48">
                    <Progress value={progress} className="h-1" />
                    <p className="text-xs text-white/60 text-center mt-1">
                      {Math.round(progress)}%
                    </p>
                  </div>
                </div>
              </div>
            ) : mediaSource ? (
              mediaType === 'image' ? (
                <DotMatrix
                  image={mediaSource}
                  dotSize={dotSize[0]}
                  spacing={spacing[0]}
                />
              ) : (
                <DotMatrixVideo
                  video={mediaSource}
                />
              )
            ) : (
              <div className="text-center space-y-2 p-8">
                <p className="text-white/40 text-sm">Upload an image or video to begin</p>
                <p className="text-white/30 text-xs">Supports JPG, PNG, MP4, WebM, and other common formats</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
} 