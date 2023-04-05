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

SEGMAP_PATH=$(dirname "$0")/synth_input0.png
START_STYLE_PATH=$(dirname "$0")/synth_style_start.jpg
END_STYLE_PATH=$(dirname "$0")/synth_style_end.jpg

CLAIMS_JSON="{\"clientId\": \"$DENTRINO_CLIENT_ID\", \"paramsHashed\": \"none\"}"

ENCODED_CLAIMS=$(echo -n $CLAIMS_JSON|base64 -w0)
CLAIMS_SIGNATURE=$(echo -n "$CLAIMS_JSON" | openssl dgst -sha256 -hex -hmac $DENTRINO_CLIENT_SECRET | sed 's/^.* //')

TOKEN="$ENCODED_CLAIMS:$CLAIMS_SIGNATURE"

curl -XPOST \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer $TOKEN" \
  -F "segmap=@$SEGMAP_PATH" \
  -F "imgStartStyle=@$START_STYLE_PATH" \
  -F "imgEndStyle=@$END_STYLE_PATH" \
  -F 'data={"mix_factor": 0.2}' \
  $DENTRINO_API/v1/api/synth
