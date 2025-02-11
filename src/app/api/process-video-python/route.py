from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import cv2
import numpy as np
import os
import tempfile
import requests
from urllib.parse import parse_qs
import base64
from typing import Dict, Any

def create_dot_matrix_frame(frame, dot_size, spacing):
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
                radius = int((brightness / 255.0) * (dot_size / 2))
                if radius > 0:
                    cv2.circle(
                        output,
                        (x + dot_size//2, y + dot_size//2),
                        radius,
                        255,
                        -1
                    )
    return output

def process_video(input_url, dot_size=10, spacing=2):
    # Download the video to a temporary file
    response = requests.get(input_url)
    if response.status_code != 200:
        raise Exception("Failed to download video")
    
    # Create temporary files for input and output
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_input:
        temp_input.write(response.content)
        temp_input_path = temp_input.name
    
    temp_output_path = tempfile.mktemp(suffix='.mp4')
    
    try:
        # Open the video file
        cap = cv2.VideoCapture(temp_input_path)
        if not cap.isOpened():
            raise Exception("Could not open video file")

        # Get video properties
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        # Resize if too large
        max_dim = 640
        if max(height, width) > max_dim:
            scale = max_dim / max(height, width)
            width = int(width * scale)
            height = int(height * scale)
            dot_size = max(1, int(float(dot_size) * scale))
            spacing = max(1, int(float(spacing) * scale))

        # Create video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(temp_output_path, fourcc, min(fps, 15), (width, height))

        frame_count = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Resize frame if needed
            if max(frame.shape[0], frame.shape[1]) > max_dim:
                frame = cv2.resize(frame, (width, height))
            
            # Process frame
            processed = create_dot_matrix_frame(frame, dot_size, spacing)
            
            # Convert back to BGR for writing
            processed_bgr = cv2.cvtColor(processed, cv2.COLOR_GRAY2BGR)
            out.write(processed_bgr)
            
            frame_count += 1
            if frame_count > 450:  # Limit to ~30 seconds at 15fps
                break

        cap.release()
        out.release()

        # Read the processed video
        with open(temp_output_path, 'rb') as f:
            processed_video = f.read()
            
        return processed_video

    finally:
        # Clean up temporary files
        if os.path.exists(temp_input_path):
            os.unlink(temp_input_path)
        if os.path.exists(temp_output_path):
            os.unlink(temp_output_path)

async def POST(request) -> Dict[str, Any]:
    try:
        # Parse the request body
        body = await request.json()
        input_url = body.get('inputUrl')
        dot_size = int(body.get('dotSize', 10))
        spacing = int(body.get('spacing', 2))
        
        if not input_url:
            return {
                'status': 400,
                'body': {'error': 'No input URL provided'}
            }
            
        # Process the video
        processed_video = process_video(input_url, dot_size, spacing)
        
        # Convert to base64 for response
        video_base64 = base64.b64encode(processed_video).decode('utf-8')
        
        return {
            'status': 200,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': {
                'processedVideo': video_base64
            }
        }
        
    except Exception as e:
        print(f"Error processing video: {str(e)}")  # Add logging
        return {
            'status': 500,
            'body': {'error': str(e)}
        } 