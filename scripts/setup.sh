#!/usr/bin/env bash
set -e

echo "Starting declarative setup flow..."

# 1. Node.js Version Check
version_greater_equal() {
  printf '%s\n%s' "$2" "$1" | sort -V -C
}

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Please install Node.js >= 20.19.0."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/^v//')
REQUIRED_VERSION="20.19.0"

if ! version_greater_equal "$NODE_VERSION" "$REQUIRED_VERSION"; then
  echo "Error: Node.js version >= $REQUIRED_VERSION is required. Detected version $NODE_VERSION."
  exit 1
fi

echo "Node.js version $NODE_VERSION detected (>= $REQUIRED_VERSION)."

# 2. OS & Architecture Detection
OS="$(uname -s)"
ARCH="$(uname -m)"

echo "Detected Operating System: $OS"
echo "Detected Architecture: $ARCH"

# 3. System Dependencies Installation
if [ "$OS" = "Darwin" ]; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "Error: Homebrew is not installed. Please install it first: https://brew.sh/"
    exit 1
  fi
  echo "macOS detected. Installing dependencies via Homebrew..."
  # Only run if Brewfile exists
  if [ -f "Brewfile" ]; then
    brew bundle --file=Brewfile
  else
    echo "Error: Brewfile not found."
    exit 1
  fi

elif [ "$OS" = "Linux" ]; then
  # Verify we are on a Debian-based distro by checking for apt-get
  if command -v apt-get >/dev/null 2>&1; then
    echo "Debian-based Linux detected. Installing dependencies via apt-get..."
    export DEBIAN_FRONTEND=noninteractive
    sudo -E apt-get update
    sudo -E apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libvips-dev
  else
    echo "Error: apt-get not found. Only Debian/Ubuntu-based Linux distributions are supported by this script automatically."
    echo "Please install the equivalent packages manually for your distribution."
    exit 1
  fi

else
  echo "Unsupported OS: $OS. Please install system dependencies manually."
  exit 1
fi

# 4. Project Dependencies Installation
echo "Installing project dependencies using pnpm..."
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not installed. Installing pnpm globally..."
  npm install -g pnpm
fi

pnpm install

echo "Setup completed successfully! You can now run 'pnpm test'."
