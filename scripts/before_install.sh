#!/bin/bash
set -e

echo "Running BeforeInstall script..."

# Create application directory if it doesn't exist
if [ ! -d "/home/ec2-user/socket-server" ]; then
    echo "Creating application directory..."
    mkdir -p /home/ec2-user/socket-server
else
    # Clean up old deployment files to avoid conflicts
    echo "Cleaning up old files..."
    cd /home/ec2-user/socket-server
    sudo rm -rf node_modules 2>/dev/null || true
fi

echo "BeforeInstall completed successfully"
