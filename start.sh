#!/bin/bash
echo "[Start] Installing dependencies..."
npm install --omit=dev
echo "[Start] Starting bot..."
node index.js
