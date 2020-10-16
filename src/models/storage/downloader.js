import {env} from '../../config/env'
import aws from 'aws-sdk'

export const downloader = new (class {
  download(fileKey) {
    console.log("Downloading file with key: " + fileKey);

    var s3 = new aws.S3();
    var params = { 
      Bucket: env.s3Bucket,
      Key: fileKey
    };  
    return s3.getObject(params).promise()
      .catch((error) => {
        console.error("Error downloading from S3: ", error.message);
        return Promise.reject(error);
      }); 
  }
})()