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
START_STYLE_PATH=$(dirname "$0")/start_style.jpg
END_STYLE_PATH=$(dirname "$0")/end_style.jpg

CLAIMS_JSON="{\"clientId\": \"$DENTRINO_CLIENT_ID\", \"paramsHashed\": \"none\"}"

PART1=$(echo -n $CLAIMS_JSON|base64 -w0)
PART2=$(echo -n $DENTRINO_CLIENT_SECRET | openssl sha256 -hmac "$CLAIMS_JSON")
SIGNATURE="$PART1:$PART2"

echo $SIGNATURE
res=$(curl -XPOST \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer $SIGNATURE" \
  -F "segmap=@$SEGMAP_PATH" \
  -F "imgStartStyle=@$START_STYLE_PATH" \
  -F "imgEndStyle=@$END_STYLE_PATH" \
  http://localhost:3000/api/synth)
  # "https://api.e91efc7.dentrino.ai/api/synth")

echo $res
