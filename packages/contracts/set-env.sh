#!/bin/bash

ENV=$1

case "$ENV" in
  local)
    export FOUNDRY_PROFILE=local
    export WORLD_ADDRESS=$(./get-world-address.sh 31337)
    ;;
  redstone)
    export FOUNDRY_PROFILE=redstone
    export WORLD_ADDRESS=$(./get-world-address.sh 690)
    ;;
  *)
    echo "Unknown env: $ENV" >&2
    exit 1
    ;;
esac
