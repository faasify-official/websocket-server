#!/bin/bash
set -e

echo "Running AfterInstall script..."

cd /home/ec2-user/socket-server

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "Bun not found. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    # Add Bun to PATH for future sessions
    echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
fi

# Ensure Bun is in PATH
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Install dependencies if node_modules is not present or package.json changed
echo "Installing dependencies..."
bun install --production

# Set proper permissions
chown -R ec2-user:ec2-user /home/ec2-user/socket-server

echo "AfterInstall completed successfully"
