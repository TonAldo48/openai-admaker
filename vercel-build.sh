#!/bin/bash

# Install system dependencies
yum install -y python3-devel
yum install -y ffmpeg

# Install Python dependencies
pip3 install -r requirements.txt

# Make the script executable
chmod +x vercel-build.sh

# Continue with the Next.js build
npm run build 