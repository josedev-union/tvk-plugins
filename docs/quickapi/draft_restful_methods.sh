#!/bin/bash
## SIMULATE (ortho)
curl -XPOST \
  -F 'imgPhoto=@./face.jpg' \
  -F 'data={"captureType": "camera", "externalCustomerId": "custom-id", "feedbackScore": 0.45}' \
  "https://api.e91efc7.dentrino.ai/api/simulations/ortho?clientId=ODMzNjkxOTc4NTE5Mk9tZT4rYVJ2_testext" \
  | jq .
#{
#  "success": true,
#  "simulation": {
#    "id": "ODMzMzcwNDI4MzE3MkR2Q05ZMmpL",
#    "createdAt": "2022-10-20T19:55:16.828Z",
#    "metadata": {
#      "captureType": "camera",
#      "externalCustomerId": "my-custom-id"
#    },
#    "storage": {
#      "beforeUrl": "https://dentrino.../before.jpg",
#      "resultUrl": "https://dentrino.../result.jpg"
#    }
#  }
#}



## PATCH
curl -XPATCH \
  -H 'Content-Type: application/json' \
  -d '{"feedbackScore": 2.75}' \
  "https://api.e91efc7.dentrino.ai/api/simulations/<SIMULATION ID>?clientId=ODMzNjkxOTc4NTE5Mk9tZT4rYVJ2_testext" \
  | jq .
# {
#   "success": true,
#   "simulation": {
#     "id": "ODMzMzcyMzE4NjgyM1EzXEwvdDNd",
#     "createdAt": "2022-10-20T14:40:13.176Z",
#     "metadata": {
#       "feedbackScore": 2.75,
#       "externalCustomerId": "my-custom-id",
#       "captureType": "camera"
#     }
#   }
# }


## LIST
#curl "http://localhost:3000/api/simulations?clientId=ODMzNjkxOTc4NTE5Mk9tZT4rYVJ2_testext&metadata.captureType=file" | jq .
# {
#   "success": true,
#   "simulations": [
#     {
#       "id": "ODMzMzcyNDEwNzQ0Mkg0TEJ7QlRP",
#       "createdAt": "2022-10-20T14:24:52.557Z",
#       "params": {
#         "mode": "cosmetic",
#         "brightness": 0.15,
#         "styleMode": "auto",
#         "blend": "poisson",
#         "mixFactor": null,
#         "whiten": 0.15
#       },
#       "metadata": {
#         "externalCustomerId": "1234qwer",
#         "feedbackScore": 2.35,
#         "captureType": "file"
#       }
#     },
#     ...
#   ]
# }


## GET
#curl http://localhost:3000/api/simulations/ODMzMzcyMzE4NjgyM1EzXEwvdDNd?clientId=ODMzNjkxOTc4NTE5Mk9tZT4rYVJ2_testext | jq .
# {
#   "success": true,
#   "simulation": {
#     "id": "ODMzMzcyMzE4NjgyM1EzXEwvdDNd",
#     "createdAt": "2022-10-20T14:40:13.176Z",
#     "params": {
#       "mode": "cosmetic",
#       "brightness": 0.15,
#       "styleMode": "auto",
#       "blend": "poisson",
#       "mixFactor": null,
#       "whiten": 0.15
#     },
#     "metadata": {
#       "feedbackScore": 2.35,
#       "externalCustomerId": "customerABCD",
#       "captureType": "file"
#     }
#   }
# }
