from scripts_src.utils import *

import requests
from requests_toolbelt import MultipartEncoder

PUBLIC_API_NAMESPACE = 'public-api/'
API_NAMESPACE = 'api/'

def request_api(method, host, route_path, headers, client_id, client_secret=None, recaptcha=None, data=None, images=None, send_json_only=False, public_call=False):
    params = {}
    if images is not None:
        for img_key in images.keys():
            img_path = images[img_key]
            params[img_key] = {'type': 'img', 'path': img_path, 'value': readfile(img_path)}

    if data is not None:
        params['data'] = {'type': 'json', 'value': json.dumps(data)}


    namespace = PUBLIC_API_NAMESPACE if public_call else API_NAMESPACE
    full_url = os.path.join(host, namespace, route_path)

    # Multipart Files Param
    multipart_data = {k: tomultipart(v) for k,v in params.items()}

    # Params Hashed
    params_hashed = {k: md5(v['value']) for k,v in params.items()}

    # Claims
    claims = {
        'clientId': client_id,
        'paramsHashed': params_hashed
    }
    if public_call and recaptcha:
        claims['recaptchaToken'] = recaptcha

    # Generate Signature
    if public_call:
        claims_json = json.dumps(claims)
        claims_b64 = b64(claims_json)
        claims_hash = sha256_hmac(client_secret, claims_json)
        signature = ':'.join([claims_b64, claims_hash])
    else:
        claims_json = json.dumps({'clientId': client_id})
        signature = b64(claims_json)

    # Headers
    headers['Authorization'] = 'Bearer ' + signature

    print("#############")
    print("## REQUEST ##")
    print("#############")
    print("\n## CREDENTIALS BEING USED")
    print("Client Id: {0}".format(client_id))
    print("Client Secret: {0}".format(client_secret))
    print("\n## URL")
    print(full_url)
    print("\n## DATA")
    printjson(data)
    print("\n## CLAIMS")
    printjson(claims)
    print("\n## HEADERS")
    printjson(headers)

    response = None
    if send_json_only:
        headers['Content-Type'] = 'application/json'
        data = None if 'data' not in params else params['data']['value']
        response = requests.request(
            method=method,
            url=full_url,
            data=data,
            headers=headers
        )
    else:
        response = requests.request(
            method=method,
            url=full_url,
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

    return response
