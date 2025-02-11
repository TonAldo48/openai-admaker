import cv2
import numpy as np
import sys
import os
import time
import subprocess

def create_dot_matrix_frame(frame, dot_size, spacing):
    # Resize frame to reduce memory usage (max width/height of 640px)
    h, w = frame.shape[:2]
    max_dim = 640
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        new_w = int(w * scale)
        new_h = int(h * scale)
        frame = cv2.resize(frame, (new_w, new_h))
        dot_size = max(1, int(dot_size * scale))
        spacing = max(1, int(spacing * scale))
    
    # Convert frame to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Create black background
    height, width = frame.shape[:2]
    output = np.zeros((height, width), dtype=np.uint8)
    
    # Calculate dot positions
    for y in range(0, height, dot_size + spacing):
        for x in range(0, width, dot_size + spacing):
            # Get the brightness of the region
            region = gray[y:min(y+dot_size, height), x:min(x+dot_size, width)]
            if region.size > 0:
                brightness = np.mean(region)
                
                # Calculate dot radius based on brightness
                radius = int((brightness / 255.0) * (dot_size / 2))
                
                if radius > 0:
                    # Draw white dot
                    cv2.circle(
                        output,
                        (x + dot_size//2, y + dot_size//2),
                        radius,
                        255,
                        -1
                    )
    
    return output

def process_video(input_path, output_path, dot_size=10, spacing=2):
    print(f"\nOpening video file: {input_path}")
    
    # Open the video file
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print("Error: Could not open video file")
        return False

    # Get video properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    input_fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    output_fps = 15  # Target FPS for output

    # Calculate new dimensions (max 640px)
    max_dim = 640
    if max(height, width) > max_dim:
        scale = max_dim / max(height, width)
        width = int(width * scale)
        height = int(height * scale)
        dot_size = max(1, int(float(dot_size) * scale))
        spacing = max(1, int(float(spacing) * scale))

    print(f"\nVideo Info:")
    print(f"Dimensions: {width}x{height}")
    print(f"Input FPS: {input_fps}")
    print(f"Total Frames: {total_frames}")
    print(f"Target Output FPS: {output_fps}")

    # Calculate frame interval to achieve target FPS
    frame_interval = max(1, round(input_fps / output_fps))
    
    # Create temporary output path for initial processing
    temp_output_path = output_path + ".temp.mp4"
    
    # Create video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_output_path, fourcc, output_fps, (width, height))

    frame_count = 0
    processed_count = 0
    start_time = time.time()
    last_update_time = start_time

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1
            
            # Process only every nth frame based on frame_interval
            if frame_count % frame_interval != 0:
                continue

            # Resize frame if needed
            if max(frame.shape[0], frame.shape[1]) > max_dim:
                scale = max_dim / max(frame.shape[0], frame.shape[1])
                frame = cv2.resize(frame, (width, height))
            
            # Convert to grayscale
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Create blank output image
            output = np.zeros((height, width, 3), dtype=np.uint8)
            
            # Process image with dot matrix effect
            for y in range(0, height, dot_size + spacing):
                for x in range(0, width, dot_size + spacing):
                    # Get the average brightness in this region
                    roi = gray[y:min(y+dot_size, height), x:min(x+dot_size, width)]
                    if roi.size > 0:
                        brightness = np.mean(roi)
                        # Draw a filled circle
                        cv2.circle(output, (x + dot_size//2, y + dot_size//2), 
                                dot_size//2, (brightness, brightness, brightness), -1)
            
            out.write(output)
            processed_count += 1
            
            # Update progress every second
            current_time = time.time()
            if current_time - last_update_time >= 1.0:
                elapsed_time = current_time - start_time
                fps = processed_count / elapsed_time
                progress = (frame_count / total_frames) * 100
                eta = (total_frames - frame_count) / (frame_count / elapsed_time)
                
                print(f"Progress: {progress:.1f}% | "
                    f"Processed Frames: {processed_count} | "
                    f"Processing Speed: {fps:.1f} fps | "
                    f"ETA: {eta:.1f} seconds")
                
                last_update_time = current_time

            # Release some memory
            del gray
            del output

    except Exception as e:
        print(f"Error during processing: {str(e)}")
        cap.release()
        out.release()
        return False
    finally:
        # Release resources
        cap.release()
        out.release()

    print("\nInitial processing complete. Converting to web-compatible format...")

    # Convert to web-compatible format using FFmpeg with lower memory usage
    try:
        ffmpeg_cmd = [
            'ffmpeg',
            '-i', temp_output_path,
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-movflags', '+faststart',
            '-y',
            output_path
        ]
        
        print("Running FFmpeg conversion...")
        process = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
        
        if process.returncode == 0:
            print("FFmpeg conversion successful")
            # Clean up temporary file
            os.remove(temp_output_path)
            return True
        else:
            print("FFmpeg conversion failed:")
            print(process.stderr)
            return False
            
    except Exception as e:
        print(f"Error during FFmpeg conversion: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: python process_video.py <input_path> <output_path> <dot_size> <spacing>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    dot_size = int(sys.argv[3])
    spacing = int(sys.argv[4])

    success = process_video(input_path, output_path, dot_size, spacing)
    if success:
        print("\nVideo processing completed successfully!")
    else:
        print("\nVideo processing failed!")
        sys.exit(1) 