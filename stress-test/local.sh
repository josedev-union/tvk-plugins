#!/bin/bash

# curl $(./local.sh  | jq -r .resultUrl) -o result.jpg


# curl $(./local.sh  | jq -r .resultUrl) -o result_cosmetic_mix_manual_mf1.0_w0.0_b0.0.jpg
# curl $(./local.sh  | jq -r .resultUrl) -o result_cosmetic_mix_manual_mf0.0_w1.0_b0.0.jpg
# curl $(./local.sh  | jq -r .resultUrl) -o result_cosmetic_mix_manual_mf0.0_w0.0_b1.0.jpg
# curl $(./local.sh  | jq -r .resultUrl) -o result_cosmetic_auto_____________w0.0_b0.0.jpg
# curl $(./local.sh  | jq -r .resultUrl) -o result_ortho.jpg
# curl $(./local.sh  | jq -r .resultUrl) -o result.jpg

ROUTE="/${2:-ortho}"
PHOTO_PATH=${1:-./face-12kb.jpg} #./face-1.1mb.jpg # #./face-12mb.jpg
DATA_JSON="{\"mix_factor\": 1.0, \"whiten\": 0.5, \"brightness\": 0.5, \"style_mode\": \"mix_manual\"}"


CLIENT_ID="ODMzOTc3MjE1MTY4NXptT2tqKDh3T2U3KGV7Tg"
CLIENT_SECRET="NzQwNWM2ZmViODJlNDhmZTJmOWY4Njk0ZDFkZjZhODMyYzc0Yjg1OWZlMzNlYWMzNjYzMGZhNzA2OWZhOTkxYQ"
RECAPTCHA_TOKEN=""


PHOTO_MD5=$(cat $PHOTO_PATH | openssl md5 | awk '{ print $2 }')
DATA_MD5=$(echo -n "$DATA_JSON" | openssl md5 | awk '{ print $2 }')
PARAMS_HASHED="{\"img_photo\":\"$PHOTO_MD5\", \"data\":\"$DATA_MD5\"}"

CLAIMS_JSON="{\"client_id\":\"$CLIENT_ID\", \"request_params_signed\": $PARAMS_HASHED, \"recaptcha_token\": \"$RECAPTCHA_TOKEN\"}"

CLAIMS_B64=$(echo -n "$CLAIMS_JSON" | base64 -w0)
SIGNATURE=$(echo -n "$CLAIMS_JSON" | openssl dgst -sha256 -hmac "$CLIENT_SECRET" | awk '{ print $2 }')
AUTHORIZATION_TOKEN="$CLAIMS_B64:$SIGNATURE"

curl -XPOST \
  -H "Authorization: Bearer $AUTHORIZATION_TOKEN" \
  -H "Origin: http://localhost:3000" \
	-F "img_photo=@$PHOTO_PATH" \
  -F "data=$DATA_JSON" \
	"http://localhost:3000/api/quick-simulations$ROUTE"
  #"https://api.e91efc7.dentrino.ai/api/quick-simulations$ROUTE"

  #-H "Content-Type: application/json" \
  #-H "X-Forwarded-Proto: https" \
