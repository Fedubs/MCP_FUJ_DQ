#!/bin/bash

echo "Starting Excel Analyzer - Multi-Phase Server"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Start the server
echo "Starting server..."
node server.js
