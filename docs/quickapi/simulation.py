import os
import re
import sys
import json
import shutil
import argparse
import errno

sys.path.append(os.path.abspath(os.getcwd()))

from scripts_src.utils import *
from scripts_src.request_api import *

# CONSTANTS
COSMETIC_PATH = 'simulations/cosmetic'
ORTHO_PATH = 'simulations/ortho'

ORTHO_OPT_MODE = 'ortho'
COSMETIC_OPT_MODE = 'cosmetic'

FILE_CAPTURE_TYPE = 'file'
CAMERA_CAPTURE_TYPE = 'camera'

DEFAULT_CLIENT_ID = 'ODMzNjkxMTQ4NTY2OXo+bzk2MUdm_default_test'
DEFAULT_CLIENT_SECRET = '8cf23bceb0f34a868da2fcd2e59eede16ac6d5953d3b77f6bc9827aa4cac8209'
DEFAULT_CLIENT_EXPOSED_SECRET = 'a493e5c386bf6e32951010fc4f1844810a722a798fda824168f79913eda6489c'

# OPTIONS
parser = argparse.ArgumentParser()
parser.add_argument('mode', type=str, choices=[ORTHO_OPT_MODE, COSMETIC_OPT_MODE], help='"cosmetic" or "ortho"')
parser.add_argument('img_path', type=str, help='Image path to be processed')
parser.add_argument('-ci', '--client_id', default=DEFAULT_CLIENT_ID, type=str, help='Client ID (given by TastyTech)')
parser.add_argument('-cs', '--client_secret', default=None, type=str, help='Client Secret or Exposed Secret (given by TastyTech)')
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

parser.add_argument('--feedback_score', default=None, type=float, help='[0.0 ~ 5.0] User score for simulation')
parser.add_argument('--capture_type', default=None, type=str, choices=[FILE_CAPTURE_TYPE, CAMERA_CAPTURE_TYPE], help='How photo was captured (camera / file)')
parser.add_argument('--external_customer_id', default=None, type=str, help='Optional external customer id')
args = parser.parse_args()

is_cosmetic = args.mode == COSMETIC_OPT_MODE
is_ortho = args.mode == ORTHO_OPT_MODE

if args.client_secret is None:
    args.client_secret = DEFAULT_CLIENT_EXPOSED_SECRET if args.public else DEFAULT_CLIENT_SECRET

# Get Full URL
route_path = COSMETIC_PATH if is_cosmetic else ORTHO_PATH

# Generate Cosmetic Data JSON
data = {}
if is_cosmetic:
    data['whiten'] = args.whiten
    data['brightness'] = args.brightness
    if args.mix_factor is not None:
        data['styleMode'] = 'mix_manual'
        data['mixFactor'] = args.mix_factor
    else:
        data['styleMode'] = 'auto'

if args.feedback_score is not None:
    data['feedbackScore'] = args.feedback_score

if args.capture_type is not None:
    data['captureType'] = args.capture_type

if args.external_customer_id is not None:
    data['externalCustomerId'] = args.external_customer_id

# Request Params
headers = {}
if args.public:
    headers['Origin'] = args.origin

for he in args.header:
    m = re.match(r'^\s*([^:\s]+)\s*:(.*)', he)
    header = m[1]
    value = m[2]
    headers[header] = value

# ID: ODMzMzczMTE5Nzc3M2RfeDBYQTlN Secret: 9f4e637d109d99a3bc5d061eb05373e3badb96d506c412bd188e7a649fc7533e Exposed Secret: 7529c5a789ce7fc4bfaa02fe4d9a0887a745b052300c6dc83b10c09b827071cf

# POST
#response = request_api(
#    method = 'POST',
#    host = args.host,
#    route_path = route_path,
#    public_call = args.public,
#    data = data,
#    images = {'imgPhoto': args.img_path},
#    headers = headers,
#    client_id = args.client_id,
#    client_secret = args.client_secret,
#    recaptcha = args.recaptcha,
#    send_json_only = False
#)

# GET
#response = request_api(
#    method = 'GET',
#    host = args.host,
#    route_path = "simulations/ODMzMzczMDA4MTI4MDUtJCZNQSQt",
#    public_call = args.public,
#    headers = headers,
#    client_id = args.client_id,
#    client_secret = args.client_secret,
#    recaptcha = args.recaptcha,
#    send_json_only = True
#)

# List
response = request_api(
    method = 'GET',
    host = args.host,
    route_path = "simulations?metadata.captureType=camera",
    public_call = args.public,
    headers = headers,
    client_id = args.client_id,
    client_secret = args.client_secret,
    recaptcha = args.recaptcha,
    send_json_only = True
)


# PATCH
#response = request_api(
#    method = 'PATCH',
#    host = args.host,
#    route_path = "simulations/ODMzMzczMDA4MTI4MDUtJCZNQSQt",
#    data = {
#        'external_customer_id': 'newcustomerid_2',
#    },
#    public_call = args.public,
#    headers = headers,
#    client_id = args.client_id,
#    client_secret = args.client_secret,
#    recaptcha = args.recaptcha,
#    send_json_only = True
#)

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
