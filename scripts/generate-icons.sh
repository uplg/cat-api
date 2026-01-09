#!/bin/bash

# Script to generate PWA icons from the SVG
# Requires: rsvg-convert (librsvg) or ImageMagick

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ICONS_DIR="$PROJECT_DIR/frontend/public/icons"
SOURCE_SVG="$PROJECT_DIR/frontend/public/cat.svg"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN} Generating PWA icons${NC}"

mkdir -p "$ICONS_DIR"

SIZES=(72 96 128 144 152 192 384 512)

if command -v rsvg-convert &> /dev/null; then
    CONVERTER="rsvg"
elif command -v convert &> /dev/null; then
    CONVERTER="imagemagick"
elif command -v sips &> /dev/null; then
    CONVERTER="sips"
else
    echo -e "${YELLOW}Installing librsvg...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install librsvg
        CONVERTER="rsvg"
    else
        echo "Install librsvg or ImageMagick:"
        echo "  Ubuntu: sudo apt install librsvg2-bin"
        echo "  macOS: brew install librsvg"
        exit 1
    fi
fi

for SIZE in "${SIZES[@]}"; do
    OUTPUT="$ICONS_DIR/icon-${SIZE}x${SIZE}.png"
    echo -e "  Generating: ${SIZE}x${SIZE}..."
    
    case $CONVERTER in
        rsvg)
            rsvg-convert -w "$SIZE" -h "$SIZE" "$SOURCE_SVG" -o "$OUTPUT"
            ;;
        imagemagick)
            convert -background none -resize "${SIZE}x${SIZE}" "$SOURCE_SVG" "$OUTPUT"
            ;;
        sips)
            echo -e "${YELLOW}  sips does not support SVG, creating a placeholder...${NC}"
            convert -size "${SIZE}x${SIZE}" xc:'#3b82f6' \
                -gravity center -pointsize $((SIZE/3)) -fill white \
                -annotate 0 '🐱' "$OUTPUT" 2>/dev/null || \
            echo -e "${YELLOW}  Unable to create icon ${SIZE}x${SIZE}${NC}"
            ;;
    esac
done

echo ""
echo -e "${GREEN} Icons generated in: $ICONS_DIR${NC}"
echo ""
echo -e "Files created:"
ls -la "$ICONS_DIR"
