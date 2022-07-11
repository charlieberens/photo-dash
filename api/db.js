const AWS = require("aws-sdk");
const dotenv = require("dotenv").config();

const get = async () => {
  AWS.config.update({
    accessKeyId: process.env.AWS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.ALBUM_DB_REGION,
  });
  const docClient = new AWS.DynamoDB.DocumentClient();

  const params = {
    TableName: process.env.ALBUM_DB_NAME,
    ReturnValues: "ALL_OLD",
  };

  const response = await docClient.scan(params).promise();
  if (!response.Items) {
    return { success: false, err: err.toString() };
  } else {
    return { success: true, items: response.Items };
  }
};

const put = async (albumID, albumName) => {
  try {
    AWS.config.update({
      accessKeyId: process.env.AWS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: process.env.ALBUM_DB_REGION,
    });

    const docClient = new AWS.DynamoDB.DocumentClient();

    const params = {
      TableName: process.env.ALBUM_DB_NAME,
      Item: {
        album_id: albumID,
        album_name: albumName,
      },
      ReturnValues: "ALL_OLD",
    };

    const { success } = await docClient.put(params).promise();
    if (!success) {
      return {
        success: false,
      };
    } else {
      return {
        success: true,
        message: `Added ${albumName}`,
      };
    }
  } catch (err) {
    console.log(err);
    return { err: err.toString() };
  }
};

const addPhotos = async (albumID, photos) => {
  try {
    AWS.config.update({
      accessKeyId: process.env.AWS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: process.env.ALBUM_DB_REGION,
    });

    const docClient = new AWS.DynamoDB.DocumentClient();

    const params = {
      TableName: process.env.ALBUM_DB_NAME,
      Key: {
        album_id: albumID,
      },
      UpdateExpression: "ADD photos :photos",
      ExpressionAttributeValues: {
        ":photos": docClient.createSet(photos),
      },
      ReturnValues: "UPDATED_NEW",
    };

    const response = await docClient.update(params).promise();
    console.log(response);
    return response;
  } catch (err) {
    console.log(err);
    return { err: err.toString() };
  }
};

module.exports = {
  put,
  get,
  addPhotos,
};
