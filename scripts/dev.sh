#!/bin/bash
# Development Environment Startup Script
# This is a convenience wrapper around compile_and_run.sh

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
exec "$SCRIPT_DIR/compile_and_run.sh" --dev "$@"
