#!/bin/bash

echo "Running ApplicationStop script..."

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "Stopping application with PM2..."
    
    # Stop the application if it's running
    pm2 stop socket-server || true
    pm2 delete socket-server || true
    
    echo "Application stopped successfully"
else
    echo "PM2 not installed, skipping stop"
fi

exit 0
