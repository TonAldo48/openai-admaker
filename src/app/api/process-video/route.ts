import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

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

    // Create unique filename
    const timestamp = Date.now();
    const originalFilename = file.name;
    const extension = path.extname(originalFilename);
    const inputFilename = `input-${timestamp}${extension}`;
    const outputFilename = `output-${timestamp}${extension}`;
    
    // Save uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Save paths - use /tmp for Vercel compatibility
    const inputPath = path.join('/tmp', inputFilename);
    const outputPath = path.join('/tmp', outputFilename);
    const finalOutputPath = path.join(process.cwd(), 'public', 'uploads', outputFilename);
    
    console.log(`Starting video processing for ${originalFilename}`);
    console.log(`Input path: ${inputPath}`);
    console.log(`Output path: ${outputPath}`);
    console.log(`Final output path: ${finalOutputPath}`);
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    await writeFile(inputPath, buffer);
    console.log('Video file saved, starting Python conversion...');
    
    // Process video using Python script
    const pythonProcess = spawn('python3', [
      path.join(process.cwd(), 'scripts', 'process_video.py'),
      inputPath,
      outputPath,
      dotSize as string,
      spacing as string
    ]);

    // Handle Python script output for progress updates
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`Python output: ${output}`);
    });

    // Handle Python script errors
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Error: ${data.toString()}`);
    });

    return new Promise<Response>((resolve) => {
      pythonProcess.on('close', async (code) => {
        // Clean up input file
        try {
          fs.unlinkSync(inputPath);
          console.log('Cleaned up input file');
        } catch (error) {
          console.error('Error cleaning up input file:', error);
        }

        if (code !== 0) {
          console.error(`Python process exited with code ${code}`);
          resolve(NextResponse.json(
            { error: 'Processing failed' },
            { status: 500 }
          ));
          return;
        }

        try {
          // Move the processed file from /tmp to public/uploads
          await fs.promises.copyFile(outputPath, finalOutputPath);
          fs.unlinkSync(outputPath); // Clean up temp output file
          console.log('Video processing completed successfully');
          resolve(NextResponse.json({
            url: `/uploads/${outputFilename}`,
            message: 'Video processed successfully'
          }));
        } catch (error) {
          console.error('Error moving processed file:', error);
          resolve(NextResponse.json(
            { error: 'Failed to save processed video' },
            { status: 500 }
          ));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Error running Python script:', error);
        resolve(NextResponse.json(
          { error: 'Failed to process video' },
          { status: 500 }
        ));
      });
    });

  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: 'Failed to process video' },
      { status: 500 }
    );
  }
} 