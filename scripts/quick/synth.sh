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
SEGMAP_PATH=$(dirname "$0")/synth_input.png

CLAIMS_JSON="{\"clientId\": \"$DENTRINO_CLIENT_ID\", \"paramsHashed\": \"none\"}"

PART1=$(echo -n $CLAIMS_JSON|base64 -w0)
PART2=$(echo -n $DENTRINO_CLIENT_SECRET | openssl sha256 -hmac "$CLAIMS_JSON")
SIGNATURE="$PART1:$PART2"

echo $SIGNATURE
res=$(curl -XPOST \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer $SIGNATURE" \
  -F "segmap=@$SEGMAP_PATH" \
  "https://api.e91efc7.dentrino.ai/api/synth")

echo $res
