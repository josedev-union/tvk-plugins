import os
import json
import hashlib
import base64
import hmac
import mimetypes

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

def readfile(filepath):
    with open(filepath, 'rb') as f:
        return f.read()

def tomultipart(param):
    if param['type'] == 'img':
        filename = os.path.basename(param['path'])
        mime, _ = mimetypes.guess_type(param['path'])
        return (filename, param['value'], mime or 'image/jpeg')
    else:
        return (None, param['value'])

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
