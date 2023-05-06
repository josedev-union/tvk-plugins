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

IMAGE_PATH=$(dirname "$0")/face1.jpg

CLAIMS_JSON="{\"clientId\": \"$DENTRINO_CLIENT_ID\", \"paramsHashed\": \"none\"}"
ENCODED_CLAIMS=$(echo -n $CLAIMS_JSON|base64 -w0)
CLAIMS_SIGNATURE=$(echo -n "$CLAIMS_JSON" | openssl dgst -sha256 -hex -hmac $DENTRINO_CLIENT_SECRET | sed 's/^.* //')

TOKEN="$ENCODED_CLAIMS:$CLAIMS_SIGNATURE"

curl -XPOST \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer $TOKEN" \
  -F "imgPhoto=@$IMAGE_PATH" \
  -F 'data={"whiten": 0.2}' \
  $DENTRINO_API/v1/api/whiten
