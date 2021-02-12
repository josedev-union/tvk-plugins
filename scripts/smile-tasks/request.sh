#!/bin/bash
USER_ID=anuserid
MD5_B64=$(cat ../new-ml/teethmlserver/images/testface1.jpg | openssl md5 -binary | base64 -w0)
CLIENT_ID=ODM4Njg0MDQ3NjQxNGM0eVBoeVlRaFktfXpaWg
CLIENT_SECRET=MDgzZWY2ZWZiNGZkNGRhN2Q3ZmMxMzVkMWEyMjQwNWNmYzRlOWU1Nzc4NGQzNTI5N2I0MDc0NjRkMTNkNWRjNw
API_SECRET=ff5da5e257233200e1c0a902bbce0c3f

MSG=$USER_ID:$MD5_B64
KEY=$CLIENT_SECRET:$API_SECRET
SIGNATURE=$(echo -n "$MSG" | openssl dgst -sha256 -hex -hmac $KEY  | sed 's/^.* //')
RAWTOKEN=$CLIENT_ID:$SIGNATURE
AUTHTOKEN=$(echo -n "$RAWTOKEN" | base64 -w0)

echo "MSG: $MSG"
echo "KEY: $KEY"
echo "SIGNATURE: $SIGNATURE"
echo "RAWTOKEN: $RAWTOKEN"
echo "AUTHTOKEN: $AUTHTOKEN"

echo "curl -XPOST localhost:3000/api/users/$USER_ID/smile-tasks/solicitation -H \"Authorization: Bearer $AUTHTOKEN\" -H \"Content-Type: application/json\" -d \"{\\"imageMD5\\":\\"$MD5_B64\\",\\"contentType\\":\\"image/jpeg\\"}\" -i"

curl -XPOST localhost:3000/api/users/$USER_ID/smile-tasks/solicitation \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"imageMD5\":\"$MD5_B64\",\"contentType\":\"image/jpeg\"}" \
  -o tmp/outrequest.json

cat tmp/outrequest.json | jq .
