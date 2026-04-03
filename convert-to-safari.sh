#!/bin/bash
# Converts this web extension into a Safari Web Extension Xcode project.
# Requires: macOS with Xcode 14+ and Safari 16.4+
#
# Usage: ./convert-to-safari.sh
#
# This will create a "Webpage To Text" Xcode project in the current directory.
# Open the .xcodeproj, build, and enable the extension in Safari > Preferences > Extensions.

set -e

if ! command -v xcrun &> /dev/null; then
  echo "Error: Xcode command line tools not found. Install Xcode first."
  exit 1
fi

echo "Converting web extension to Safari Web Extension..."
xcrun safari-web-extension-converter "$(pwd)" \
  --project-location "$(pwd)/SafariExtension" \
  --app-name "Webpage To Text" \
  --bundle-identifier com.example.webpage-to-text \
  --no-open

echo ""
echo "Done! Xcode project created at: SafariExtension/"
echo "Next steps:"
echo "  1. Open SafariExtension/Webpage To Text.xcodeproj"
echo "  2. Set your development team in Signing & Capabilities"
echo "  3. Build and run (Cmd+R)"
echo "  4. Enable the extension in Safari > Settings > Extensions"
