import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'edge';
export const maxDuration = 60; // Maximum allowed on Hobby plan

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const formData = await req.formData();
    const file = formData.get('video') as File;
    const dotSize = formData.get('dotSize');
    const spacing = formData.get('spacing');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Upload original video to Vercel Blob
    const { url: inputUrl } = await put(
      `input-${Date.now()}-${file.name}`,
      file,
      { 
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
      }
    );

    console.log('Video uploaded to Blob:', inputUrl);

    // Call Python processing function
    const pythonResponse = await fetch(new URL('/api/process-video-python', req.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputUrl,
        dotSize: Number(dotSize),
        spacing: Number(spacing)
      })
    });

    const data = await pythonResponse.json();

    if (data.status !== 200 || !data.body?.processedVideo) {
      console.error('Video processing failed:', data.body?.error || 'Unknown error');
      throw new Error(data.body?.error || 'Video processing failed');
    }

    // Convert base64 back to file
    const processedVideoBuffer = Buffer.from(data.body.processedVideo, 'base64');
    const processedVideoBlob = new Blob([processedVideoBuffer], { type: 'video/mp4' });
    const processedVideoFile = new File([processedVideoBlob], `processed-${file.name}`, { type: 'video/mp4' });

    // Upload processed video to Vercel Blob
    const { url: processedUrl } = await put(
      `processed-${Date.now()}-${file.name}`,
      processedVideoFile,
      { 
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
      }
    );

    console.log('Processed video uploaded:', processedUrl);

    return NextResponse.json({
      url: processedUrl,
      message: 'Video processed successfully'
    });

  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process video' },
      { status: 500 }
    );
  }
} 