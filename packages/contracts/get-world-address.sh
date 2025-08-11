#!/bin/sh
CHAIN_ID="$1"

# Prefer world address from installed @dust/world package
PKG_JSON="node_modules/@dust/world/worlds.json"
LOCAL_JSON="./worlds.json"

if [ -f "$PKG_JSON" ]; then
  ADDR=$(jq -r --arg CHAIN_ID "$CHAIN_ID" '.[$CHAIN_ID].address // empty' "$PKG_JSON")
fi

# Fallback to repo-local worlds.json
if [ -z "$ADDR" ] && [ -f "$LOCAL_JSON" ]; then
  ADDR=$(jq -r --arg CHAIN_ID "$CHAIN_ID" '.[$CHAIN_ID].address // empty' "$LOCAL_JSON")
fi

printf "%s" "$ADDR"
