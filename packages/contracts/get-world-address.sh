#!/bin/sh
CHAIN_ID="$1"

if [ "$CHAIN_ID" = "31337" ]; then
    jq -r --arg CHAIN_ID "$CHAIN_ID" '.[$CHAIN_ID].address // empty' ../../../dust/packages/world/worlds.json
else
    jq -r --arg CHAIN_ID "$CHAIN_ID" '.[$CHAIN_ID].address // empty' node_modules/@dust/world/worlds.json
fi
