#!/bin/bash

# Create releases directory if it doesn't exist
mkdir -p releases

# Remove existing zip file if it exists
if [ -f releases/eventide-teleporter.zip ]; then
    rm releases/eventide-teleporter.zip
fi

# Compile files excluding src, node_modules, package.json, and .ignore
# Assuming compilation involves copying files to a temp directory
TEMP_DIR=$(mktemp -d)
WORKING_DIR=$(pwd)


# Create a new directory for the release
mkdir -p "$TEMP_DIR/eventide-teleporter"

# Copy all files into the new directory
rsync -av --exclude='src/' --exclude='node_modules/' --exclude=".git/" --exclude='package.json' --exclude='package-lock.json' --exclude='.gitignore' --exclude='.vscode/' --exclude='exclude.txt' --exclude='release_script.sh' --exclude='release_script.bat' --exclude='minify.js' --exclude='releases/' . "$TEMP_DIR/eventide-teleporter/"

# Minify JavaScript files
node minify.js "$TEMP_DIR/eventide-teleporter"

# Create the zip file in the temp directory
cd "$TEMP_DIR" && zip -r eventide-teleporter.zip *

# Move the zip file to the releases directory
mv "$TEMP_DIR/eventide-teleporter.zip" "$WORKING_DIR/releases/eventide-teleporter.zip"

# Clean up the temporary directory
rm -rf "$TEMP_DIR"