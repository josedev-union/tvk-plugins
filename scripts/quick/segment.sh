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
DENTRINO_API_SECRET=ff5da5e257233200e1c0a902bbce0c3f
IMAGE_PATH=$(dirname "$0")/seg_input.jpg
MD5_B64=$(cat $IMAGE_PATH | openssl md5 -binary | base64 -w0)
MSG=$USER_ID:$MD5_B64
KEY=$DENTRINO_CLIENT_SECRET:$DENTRINO_API_SECRET
SIGNATURE=$(echo -n "$MSG" | openssl dgst -sha256 -hex -hmac $KEY  | sed 's/^.* //')
AUTHORIZATION_TOKEN=$(echo -n "$DENTRINO_CLIENT_ID:$SIGNATURE" | base64 -w0)

curl -XPOST \
  -H "Content-Type: multipart/form-data" \
	-F "imgPhoto=@$IMAGE_PATH" \
	"https://api.e91efc7.dentrino.ai/api/segment?clientId=ODMyMDc2MzEwOTA5OGRVW3MvVnFU"



# with open("/tmp/segment.png", "wb") as binary_file:

#     # Write bytes to file
#     binary_file.write(result["result"])
