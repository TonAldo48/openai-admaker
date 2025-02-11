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
    
    // Save paths
    const inputPath = path.join(process.cwd(), 'public', 'uploads', inputFilename);
    const outputPath = path.join(process.cwd(), 'public', 'uploads', outputFilename);
    
    console.log(`Starting video processing for ${originalFilename}`);
    console.log(`Input path: ${inputPath}`);
    console.log(`Output path: ${outputPath}`);
    
    await writeFile(inputPath, buffer);
    console.log('Video file saved, starting Python conversion...');
    
    // Process video using Python script with virtual environment
    const pythonProcess = spawn(
      path.join(process.cwd(), '.venv', 'bin', 'python3'),
      [
        path.join(process.cwd(), 'scripts', 'process_video.py'),
        inputPath,
        outputPath,
        dotSize as string,
        spacing as string
      ]
    );

    // Handle Python script output for progress updates
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      
      // Log all output lines
      output.split('\n').forEach((line: string) => {
        if (line.startsWith('Progress:')) {
          console.log(`\x1b[36m${line}\x1b[0m`); // Cyan color for progress
        } else if (line.startsWith('Error:')) {
          console.error(`\x1b[31m${line}\x1b[0m`); // Red color for errors
        } else if (line.startsWith('Status:')) {
          console.log(`\x1b[32m${line}\x1b[0m`); // Green color for status
        }
      });
    });

    // Handle Python script errors
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Error: ${data.toString()}`);
    });

    return new Promise<Response>((resolve) => {
      pythonProcess.on('close', (code) => {
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

        console.log('Video processing completed successfully');
        resolve(NextResponse.json({
          url: `/uploads/${outputFilename}`,
          message: 'Video processed successfully'
        }));
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