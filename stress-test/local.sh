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
RECAPTCHA_TOKEN=""


curl -XPOST \
	-F "imgPhoto=@$PHOTO_PATH" \
  -F "data=$DATA_JSON" \
  "https://api.e91efc7.dentrino.ai/api/simulations$ROUTE?clientId=$CLIENT_ID"

  #-H "Content-Type: application/json" \
  #-H "X-Forwarded-Proto: https" \
