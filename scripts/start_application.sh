#!/bin/bash
set -e

echo "Running ApplicationStart script..."

cd /home/ec2-user/socket-server

# Ensure Bun is in PATH
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Load environment variables if .env file exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

# Start the application with PM2
echo "Starting application with PM2..."
pm2 start bun --name "socket-server" -- run start

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot (only needed once)
pm2 startup systemd -u ec2-user --hp /home/ec2-user || true

echo "Application started successfully"
