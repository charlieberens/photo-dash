const AWS = require("aws-sdk");
const dotenv = require("dotenv").config();

const upload = async (file, filename) => {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  });

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: filename,
    Body: file.data,
  };

  return s3.upload(params).promise();
};

const photoDel = async (key) => {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  });

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  };

  s3.deleteObject(params, async (err, data) => {
    console.log("deasd");
    if (err) {
      return { err };
    } else {
      return { data };
    }
  });
};

module.exports = {
  upload,
  photoDel,
};
