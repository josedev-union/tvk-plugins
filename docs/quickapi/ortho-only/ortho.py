import os
import re
import sys
import json
import shutil
import argparse
import hashlib
import base64
import hmac
import requests
import mimetypes
import errno
from requests_toolbelt import MultipartEncoder

# CONSTANTS
ROUTE_PATH = 'api/simulations/ortho'


# OPTIONS
parser = argparse.ArgumentParser()
parser.add_argument('img_path', type=str, help='Image path to be processed')
parser.add_argument('-ci', '--client_id', default='ODMzNjkxOTc4NTE5Mk9tZT4rYVJ2_testext', type=str, help='Client ID (given by TastyTech)')
parser.add_argument('-cs', '--client_secret', default='7016d6ee59847abb24a56cb735335b10aa915f50755dfdcd41d926bb34808899', type=str, help='Client Secret or Exposed Secret (given by TastyTech)')
parser.add_argument('-ho', '--host', default='https://api.e91efc7.dentrino.ai', type=str, help='Host of the API')
parser.add_argument('-he', '--header', action='append', default=[], help='Additional header to send in the request', metavar='HEADER:VALUE')
parser.add_argument('-d', '--output_dir', default='./tmp/', type=str, help='Output of the images downloaded')
args = parser.parse_args()

def tobytes(value):
    if type(value) == str:
        return bytes(value, 'utf-8')
    return value

def md5(value):
    value = tobytes(value)
    return hashlib.md5(value).hexdigest()

def b64(value):
    value = tobytes(value)
    b64bytes = base64.b64encode(value)
    return b64bytes.decode('ascii')

def sha256_hmac(key, value):
    key = tobytes(key)
    value = tobytes(value)
    return hmac.new(
        key=key,
        msg=value,
        digestmod=hashlib.sha256
    ).hexdigest()

# Get Full URL
full_url = os.path.join(args.host, ROUTE_PATH)

# Request Params
def readfile(filepath):
    with open(filepath, 'rb') as f:
        return f.read()

img_photo_path = args.img_path
params = {
    'img_photo': {'type': 'img', 'path': img_photo_path, 'value': readfile(img_photo_path)},
}

# Multipart Files Param
def tomultipart(param):
    if param['type'] == 'img':
        filename = os.path.basename(param['path'])
        mime, _ = mimetypes.guess_type(param['path'])
        return (filename, param['value'], mime or 'image/jpeg')
    else:
        return param['value']

multipart_data = {k: tomultipart(v) for k,v in params.items()}

# Params Hashed
params_hashed = {k: md5(v['value']) for k,v in params.items()}

# Claims
claims = {
    'client_id': args.client_id,
    'params_hashed': params_hashed
}

# Generate Signature
claims_json = json.dumps(claims)
claims_b64 = b64(claims_json)
claims_hash = sha256_hmac(args.client_secret, claims_json)
signature = ':'.join([claims_b64, claims_hash])

# Headers
headers = {
    'Authorization': 'Bearer ' + signature
}

for he in args.header:
    m = re.match(r'^\s*([^:\s]+)\s*:(.*)', he)
    header = m[1]
    value = m[2]
    headers[header] = value

def printjson(value):
    pretty = None
    if value is not None:
        if type(value) == str:
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                print("! COULDN'T DECODE JSON.")
                print(value)
                return value
        pretty = json.dumps(dict(value), indent=4)
    print(pretty)
    return pretty

print("#############")
print("## REQUEST ##")
print("#############")
print("\n## CREDENTIALS BEING USED")
print("\nClient Id: {0}".format(args.client_id))
print("\nClient Secret: {0}".format(args.client_secret))
print("\n## URL")
print(full_url)
print("\n## CLAIMS")
printjson(claims)
print("\n## HEADERS")
printjson(headers)

response = requests.post(
    full_url,
    files=multipart_data,
    headers=headers
)

print("\n\n\n")
print("##############")
print("## RESPONSE ##")
print("##############")
print("\n## CODE")
print(response.status_code)
print("\n## HEADERS")
printjson(response.headers)
print("\n## BODY")
printjson(response.text)


res = None
try:
    res = json.loads(response.text)
except Exception:
    res = {'success': False}

if not res['success']:
    sys.exit()

print("\n## DOWNLOADING IMAGES")
def download_result_image(res, urlKey, filepath):
    url = res[urlKey]
    print("Downloading Image {0} to {1}...".format(urlKey, filepath))
    r = requests.get(url, stream=True)
    if r.status_code != 200:
        print("Couldn't download {0} [HttpCode:{1}]".format(urlKey, r.status_code))
        return
    with open(filepath, 'wb') as f:
        f.raw.decode_content = True
        shutil.copyfileobj(r.raw, f)
        print('Download Successful')

# Create output dir
try:
    os.makedirs(args.output_dir)
except OSError as err:
    if err.errno == errno.EEXIST:
        # ignore directory already exists
        pass
    else:
        raise

download_result_image(res, 'resultUrl', os.path.join(args.output_dir, 'result.jpg'))
download_result_image(res, 'beforeUrl', os.path.join(args.output_dir, 'before.jpg'))
