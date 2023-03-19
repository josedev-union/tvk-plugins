CLIENT_ID=ODMyMDc2MzEwOTA5OGRVW3MvVnFU
CLIENT_SECRET=abc77ee1fb7e50bfa2ab7e50edb8c2657106543df1cf4449f6d2ccd0ba033640
API_SECRET=ff5da5e257233200e1c0a902bbce0c3f
IMAGE_PATH=./tmp/seg.jpg
MD5_B64=$(cat $IMAGE_PATH | openssl md5 -binary | base64 -w0)
MSG=$USER_ID:$MD5_B64
KEY=$CLIENT_SECRET:$API_SECRET
SIGNATURE=$(echo -n "$MSG" | openssl dgst -sha256 -hex -hmac $KEY  | sed 's/^.* //')
AUTHORIZATION_TOKEN=$(echo -n "$CLIENT_ID:$SIGNATURE" | base64 -w0)

curl -XPOST \
  -H "Content-Type: multipart/form-data" \
	-F "imgPhoto=@./tmp/seg.jpg" \
	"http://localhost:3000/api/segment?clientId=ODMyMDc2MzEwOTA5OGRVW3MvVnFU"



# with open("/tmp/segment.png", "wb") as binary_file:

#     # Write bytes to file
#     binary_file.write(result["result"])