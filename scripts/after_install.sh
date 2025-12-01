#!/bin/bash
set -e

echo "Running AfterInstall script..."

cd /home/ec2-user/socket-server

# Set HOME if not set
export HOME=${HOME:-/home/ec2-user}

# Ensure Bun is in PATH
export BUN_INSTALL="/home/ec2-user/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "Bun not found. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="/home/ec2-user/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    # Add Bun to PATH for future sessions
    echo 'export BUN_INSTALL="$HOME/.bun"' >> /home/ec2-user/.bashrc
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> /home/ec2-user/.bashrc
else
    echo "Bun is already installed"
fi

# Install dependencies if node_modules is not present or package.json changed
echo "Installing dependencies..."
bun install --production

# Set proper permissions
chown -R ec2-user:ec2-user /home/ec2-user/socket-server

echo "AfterInstall completed successfully"
