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
PUBLIC_API_NAMESPACE = 'public-api/'
API_NAMESPACE = 'api/'
COSMETIC_PATH = 'simulations/cosmetic'
ORTHO_PATH = 'simulations/ortho'

ORTHO_OPT_MODE = 'ortho'
COSMETIC_OPT_MODE = 'cosmetic'

# OPTIONS
parser = argparse.ArgumentParser()
parser.add_argument('mode', type=str, choices=[ORTHO_OPT_MODE, COSMETIC_OPT_MODE], help='"cosmetic" or "ortho"')
parser.add_argument('img_path', type=str, help='Image path to be processed')
parser.add_argument('-ci', '--client_id', default='ODMzNjkxMTQ4NTY2OXo+bzk2MUdm_default_test', type=str, help='Client ID (given by TastyTech)')
parser.add_argument('-cs', '--client_secret', default='8cf23bceb0f34a868da2fcd2e59eede16ac6d5953d3b77f6bc9827aa4cac8209', type=str, help='Client Secret or Exposed Secret (given by TastyTech)')
parser.add_argument('-ho', '--host', default='https://api.e91efc7.dentrino.ai', type=str, help='Host of the API')
parser.add_argument('-he', '--header', action='append', default=[], help='Additional header to send in the request', metavar='HEADER:VALUE')
parser.add_argument('-d', '--output_dir', default='./tmp/', type=str, help='Output of the images downloaded')

# Public API Options
parser.add_argument('-p', '--public', action='store_true', help='Uses public API (makes call to front-end)')
parser.add_argument('--recaptcha', type=str, help="Google Recaptcha V3 token in case the client is using it")
parser.add_argument('--origin', type=str, default='http://localhost:8080', help='Set the request origin for CORS')

# Cosmetic Options
parser.add_argument('-i_w', '--whiten', default=0.15, type=float, help='[0.0 ~ 1.0] Whitening filter for resulting style. (cosmetic simulations only)')
parser.add_argument('-i_b', '--brightness', default=0.15, type=float, help='[0.0 ~ 1.0] Brightness filter for resulting style. (cosmetic simulations only)')
parser.add_argument('-i_mf', '--mix_factor', default=None, type=float, help='[0.0 ~ 1.0] Mix manually between start and end styles (cosmetic simulations only)')
args = parser.parse_args()

is_cosmetic = args.mode == COSMETIC_OPT_MODE
is_ortho = args.mode == ORTHO_OPT_MODE

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
namespace = PUBLIC_API_NAMESPACE if args.public else API_NAMESPACE
route_path = COSMETIC_PATH if is_cosmetic else ORTHO_PATH
full_url = os.path.join(args.host, namespace, route_path)

# Generate Cosmetic Data JSON
data = None
if is_cosmetic:
    data = {
        'whiten': args.whiten,
        'brightness': args.brightness,
    }
    if args.mix_factor is not None:
        data['style_mode'] = 'mix_manual'
        data['mix_factor'] = args.mix_factor
    else:
        data['style_mode'] = 'auto'


# Request Params
def readfile(filepath):
    with open(filepath, 'rb') as f:
        return f.read()

img_photo_path = args.img_path
params = {
    'img_photo': {'type': 'img', 'path': img_photo_path, 'value': readfile(img_photo_path)},
}
if data is not None:
    params['data'] = {'type': 'json', 'value': json.dumps(data)}

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
if args.public and args.recaptcha:
    claims['recaptcha_token'] = args.recaptcha

# Generate Signature
claims_json = json.dumps(claims)
claims_b64 = b64(claims_json)
claims_hash = sha256_hmac(args.client_secret, claims_json)
signature = ':'.join([claims_b64, claims_hash])

# Headers
headers = {
    'Authorization': 'Bearer ' + signature
}

if args.public:
    headers['Origin'] = args.origin

for he in args.header:
    m = re.match(r'^\s*([^:\s]+)\s*:(.*)', he)
    header = m[1]
    value = m[2]
    headers[header] = value

def printjson(value):
    pretty = None
    if value is not None:
        if type(value) == str:
            value = json.loads(value)
        pretty = json.dumps(dict(value), indent=4)
    print(pretty)
    return pretty

print("#############")
print("## REQUEST ##")
print("#############")
print("\n## CREDENTIALS BEING USED")
print("Client Id: {0}".format(args.client_id))
print("Client Secret: {0}".format(args.client_secret))
print("\n## URL")
print(full_url)
print("\n## DATA")
printjson(data)
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

res = json.loads(response.text)
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
