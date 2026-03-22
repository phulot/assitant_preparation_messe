#!/bin/sh
set -e

OLLAMA_HOST="${OLLAMA_BASE_URL:-http://ollama:11434}"

echo "Waiting for Ollama to be ready at ${OLLAMA_HOST}..."
until wget -qO- "${OLLAMA_HOST}/api/tags" > /dev/null 2>&1; do
  sleep 2
done
echo "Ollama is ready."

echo "Pulling mistral model..."
wget -qO- --post-data='{"name":"mistral"}' "${OLLAMA_HOST}/api/pull" > /dev/null
echo "mistral pulled."

echo "Pulling nomic-embed-text model..."
wget -qO- --post-data='{"name":"nomic-embed-text"}' "${OLLAMA_HOST}/api/pull" > /dev/null
echo "nomic-embed-text pulled."

echo "Ollama init complete."
