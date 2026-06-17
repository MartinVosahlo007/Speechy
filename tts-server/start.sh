#!/bin/bash
# Start script for Czech TTS application
# This starts the Python TTS backend server

echo "╔══════════════════════════════════════════════╗"
echo "║   Předčítač Českého Textu - TTS Server      ║"
echo "║   Model: k2-fsa/OmniVoice                   ║"
echo "║   Port: 18100                               ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "První spuštění může trvat déle kvůli přípravě modelu."
echo ""

cd "$(dirname "$0")"
python3 server.py
