#!/bin/bash
HERE=$(dirname "$0")
CONTENT_MD5="d147VHnubHq4bHFdV4ObPA=="
CONTENT_TYPE="image/jpeg"
LENGTH_RANGE="0,1048576"
URL="https://storage.googleapis.com/dentrino-dev-us/ml-images/ODM4NjgzNTExMjYyMXs%2BOVRZNzVD/smile.jpg?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=dentrino-staging%40appspot.gserviceaccount.com%2F20210212%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20210212T212127Z&X-Goog-Expires=600&X-Goog-SignedHeaders=content-md5%3Bcontent-type%3Bhost%3Bx-goog-content-length-range&X-Goog-Signature=7f3d6e5e14469e97da541f303d6ccb136aeb4adf1a8a1a69fada2a1f7e33732757324c2f5d738f3093247370670d5f0b5d0e539cc9c5e353e57e439024d4d99bfa88795755502b5a998900d198c81e76d75e45439cbf4da6a4652680cab7807f4fe7597c2797d34347543d935e94e98c8adcbf3655e241f78902745a45b766057471d3b900b1ec2d027900bcd89d64159103fe0720564edc6df17f8673f69b95638de0a583521167825177e61ddf605c611921e15e1be1f7c86e6716491204f417594d71d8499d4c2f2c3d7628f76f22b71601690d9f99a73336e142422fa06f6c58b2c664e28f6e0685fb3f6210ab046d7f1a991067fa335d364004f9f6f87e"

curl -XPUT \
  --upload-file $HERE/faceimage.jpg \
  -H "Content-Type: $CONTENT_TYPE" \
  -H "Content-MD5: $CONTENT_MD5" \
  -H "x-goog-content-length-range: $LENGTH_RANGE" \
  -o tmp/outupload.txt \
  -i \
  $URL

cat tmp/outupload.txt
