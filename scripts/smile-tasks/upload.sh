#!/bin/bash
CONTENT_MD5="d147VHnubHq4bHFdV4ObPA=="
CONTENT_TYPE="image/jpeg"
LENGTH_RANGE="0,1048576"
URL="https://storage.googleapis.com/dentrino-dev-us/ml-images/ODM4NjgzODkyMTI4N2tpLlI%2BY1NT/smile.jpg?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=dentrino-staging%40appspot.gserviceaccount.com%2F20210212%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20210212T201758Z&X-Goog-Expires=601&X-Goog-SignedHeaders=content-md5%3Bcontent-type%3Bhost%3Bx-goog-content-length-range&X-Goog-Signature=5c6d2d27b68602b57d5f7245b72e259f262606e786f238ae3304475a1259c9b15e7f60584ef02a9a165e553d0d21735e0dfe2adb04f6cd368a5e9cc5d170b44e87ac77533139a2f706ab60937fa318f33bdf77685b85171d2f54caa774551499bfd9273df3dec0d5a48390062061c21f813751da14f9dc7b61fd54a71adb835940dcb34a22d1b7ff919562d128e165bd3a341eeb9bfcbc13520a7c6990606585ab5e8a8a614ea48b9fb1105e5a90c3b11540d2f84f8c30403af25dfc492b87a4f253b797677b3c7d861419fc9364360f8ce33c7596127dda7fbb0a11ae8123398e8c89a9de937b8db213287e99ff75920f5089d4218ead2e8cf0cb2821a69b97"

curl -XPUT \
  --upload-file ../new-ml/teethmlserver/images/testface1.jpg \
  -H "Content-Type: $CONTENT_TYPE" \
  -H "Content-MD5: $CONTENT_MD5" \
  -H "x-goog-content-length-range: $LENGTH_RANGE" \
  -o tmp/outupload.txt \
  -i \
  $URL

cat tmp/outupload.txt
