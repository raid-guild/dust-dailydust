#!/bin/sh
CHAIN_ID="$1"

jq -r --arg CHAIN_ID "$CHAIN_ID" '.[$CHAIN_ID].address // empty' node_modules/@dust/world/worlds.json
