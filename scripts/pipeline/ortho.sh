#!/bin/bash

if [ -z "$DENTRINO_CLIENT_ID" ]; then
    echo "Please enter DENTRINO_CLIENT_ID:"
    read -r USERNAME_INPUT
    DENTRINO_CLIENT_ID=$USERNAME_INPUT
fi
if [ -z "$DENTRINO_CLIENT_SECRET" ]; then
    echo "Please enter DENTRINO_CLIENT_SECRET:"
    read -r USERNAME_INPUT
    DENTRINO_CLIENT_SECRET=$USERNAME_INPUT
fi
if [ -z "$DENTRINO_API" ]; then
    DENTRINO_API="https://api.e91efc7.dentrino.ai"
fi
echo "DENTRINO_API is $DENTRINO_API"

PHOTO_PATH=$(dirname "$0")/face1.jpg
START_STYLE_PATH=$(dirname "$0")/synth_style_start.jpg
END_STYLE_PATH=$(dirname "$0")/synth_style_end.jpg

DATA_JSON="{\"mixFactor\": 1, \"whiten\": 0, \"brightness\": 0, \"styleMode\": \"mix_manual\"}"

# v1rc
echo "Requesting ortho V1rc API... "
res=$(curl -XPOST \
  -F "imgPhoto=@$PHOTO_PATH" \
  -F "data=$DATA_JSON" \
  $DENTRINO_API/api/simulations/ortho?clientId=$DENTRINO_CLIENT_ID)

echo $res
simulation_id=$(echo $res | jq -r .simulation.id)

echo "Patching feedbackScore in cosmetic V1rc API... "
curl -XPATCH \
  -H 'Content-Type: application/json' \
  -d '{"feedbackScore": 2.75}' \
  "$DENTRINO_API/api/simulations/$simulation_id?clientId=$DENTRINO_CLIENT_ID" \
  | jq .

# v1
echo "Requesting ortho V1 API... "
CLAIMS_JSON="{\"clientId\": \"$DENTRINO_CLIENT_ID\", \"paramsHashed\": \"none\"}"
ENCODED_CLAIMS=$(echo -n $CLAIMS_JSON|base64 -w0)
CLAIMS_SIGNATURE=$(echo -n "$CLAIMS_JSON" | openssl dgst -sha256 -hex -hmac $DENTRINO_CLIENT_SECRET | sed 's/^.* //')
TOKEN="$ENCODED_CLAIMS:$CLAIMS_SIGNATURE"

curl -XPOST \
  -H "Authorization: Bearer $TOKEN" \
  -F "imgPhoto=@$PHOTO_PATH" \
  -F "data=$DATA_JSON" \
  $DENTRINO_API/v1/api/simulations/ortho?clientId=$DENTRINO_CLIENT_ID
