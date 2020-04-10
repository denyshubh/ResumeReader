const express = require('express');
const app = express();
const multer = require('multer')
const aws = require('aws-sdk'); //"^2.2.41"
const bodyParser = require('body-parser');
const multerS3 = require('multer-s3');
const cors = require('cors');

aws.config.getCredentials(function (err) {
  if (err) console.log(err.stack);
  // credentials not loaded
  else {
    console.log('Successfully retrieved the global aws configuration')
  }
});
aws.config.update({ region: 'us-east-1' });
const s3 = new aws.S3({ apiVersion: '2006-03-01' });
const dynamodb = new aws.DynamoDB();
const outTable = 'awscdk-OutputTable875D8E18-1NM637OBRWUKY'
const docTable = 'awscdk-DocumentsTable7E808EE5-1REOV6ARFO9LQ'
const BUCKET = 'awscdk-documentsbucket9ec9deb9-1u4iiltwuvyj4'
app.use(bodyParser.json());
app.use(cors())
let FILE_NAME = "";
const upload = multer({
  storage: multerS3({
    s3: s3,
    acl: 'public-read',
    bucket: BUCKET,
    key: function (req, file, cb) {
      FILE_NAME = file.originalname
      cb(null, FILE_NAME);
    }
  })
}).array('file');

app.post('/upload', function (req, res) {

  upload(req, res, function (err) {

    if (err instanceof multer.MulterError) {
      return res.status(500).json(err)
      // A Multer error occurred when uploading.
    } else if (err) {
      return res.status(500).json(err)
      // An unknown error occurred when uploading.
    }

    return res.status(200).send(req.file)
    // Everything went fine.
  })
});

const getResult = async (file) => {
  let params = {
    ExpressionAttributeNames: {
      "#ON": "objectName",
      "#ID": "documentId",
      "#STATUS": "documentStatus"
    },
    ExpressionAttributeValues: {
      ":filename": {
        S: file
      }
    },
    FilterExpression: "objectName = :filename",
    ProjectionExpression: "#ON, #ID, #STATUS",
    TableName: docTable,
  }
  let data = dynamodb.scan(params)
  let res = await data.promise()
  return res['Items']
}

const getS3LocationOfAnalysedFile = async (documentId) => {
  let params = {
    ExpressionAttributeNames: {
      "#OP": "outputPath",
      "#ID": "documentId",
      "#OT": "outputType"
    },
    ExpressionAttributeValues: {
      ":id": {
        S: documentId
      }
    },
    KeyConditionExpression: "documentId = :id",
    ProjectionExpression: "#OP, #ID, #OT",
    TableName: outTable,
  }
  let data = dynamodb.query(params)
  let res = await data.promise()
  return res['Items']
}
const getSignedUrl = (file) => {
  const signedUrlExpireSeconds = 60 * 5 // your expiry time in seconds.
  const url = s3.getSignedUrl('getObject', {
    Bucket: BUCKET,
    Key: file,
    Expires: signedUrlExpireSeconds
  })
  return url;
}

app.get('/download', async (req, res) => {
  try {
    console.log(`File received is ${req.query}`)
    let file = req.query['fileName'][0]
    let data = await getResult(file);
    if (!data) {
      console.log('NO DATA FOUND IN DOCUMENTS TABLE Means Data is not uploaded to s3 or there is problem in the infrastructure. Need human validation');
      return res.status(404).json({ message: 'Either You have not uploaded your resume or there is network issue. Please try again' })
    }
    data = data[0]
    if (data['documentStatus']['S'] === 'SUCCEEDED') {
      let files = await getS3LocationOfAnalysedFile(data['documentId']['S'])
      if (!files) {
        console.log('No such document exists in output table.')
        return res.status(500).json({ message: 'Internal Server Error. Please contact the service provider.' })
      } else {
        let signedURLS = []
        for (let i = 0; i < files.length; i++) {
          let file = files[i]['outputType'].split('');
          switch (file[2]) {
            case 'Text':
              console.log('do something with Text File')
              break;
            case 'TextInReadingOrder':
              console.log('do something with TextInreadingOrder File')
              break;
            case 'EntityText':
              // console.log('do something with Entity File')
              let url = getSignedUrl(files[i]['outputPath'])
              signedURLS.push(url)
              break;
            case 'Forms':
              console.log('do something with Forms')
              break;
            case 'Response':
              console.log('do something with Textract Response')
              break;
            case 'Tables':
              console.log('do something with Tables')
              break;
            default:
              console.log('Something Went Wrong!!!')

          }
        }
        return res.status(200).send({ urls: signedURLS })
      }
    } else {
      console.log('Data is still in process state')
      return res.status(404).json({ message: 'Data is still being processed. Please try again after few seconds.' })
    }
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Please Upload a File' })
  }
});

app.listen(8000, function () {
  console.log('App running on port 8000');
});


