#!/bin/bash

# Accept env from first arg or ENV variable when sourced without arg support
ENV_INPUT="$1"
if [ -z "$ENV_INPUT" ] && [ -n "$ENV" ]; then
  ENV_INPUT="$ENV"
fi

case "$ENV_INPUT" in
  local)
    export FOUNDRY_PROFILE=local
    export WORLD_ADDRESS=$(./get-world-address.sh 31337)
    ;;
  redstone)
    export FOUNDRY_PROFILE=redstone
    export WORLD_ADDRESS=$(./get-world-address.sh 690)
    ;;
  *)
    echo "Unknown env: $ENV_INPUT" >&2
    exit 1
    ;;
esac
