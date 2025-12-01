#!/bin/bash
set -e

echo "Running BeforeInstall script..."

# Create application directory if it doesn't exist
if [ ! -d "/home/ec2-user/socket-server" ]; then
    echo "Creating application directory..."
    mkdir -p /home/ec2-user/socket-server
fi

# Clean up old deployment files (optional)
# Uncomment the following lines if you want to clean up before deploying
# echo "Cleaning up old files..."
# rm -rf /home/ec2-user/socket-server/*

echo "BeforeInstall completed successfully"
