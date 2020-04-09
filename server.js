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
let s3 = new aws.S3({ apiVersion: '2006-03-01' });
app.use(bodyParser.json());
app.use(cors())

const upload = multer({
  storage: multerS3({
    s3: s3,
    acl: 'public-read',
    bucket: 'awscdk-documentsbucket9ec9deb9-1u4iiltwuvyj4',
    key: function (req, file, cb) {
      console.log(file);
      cb(null, Date.now() + '-' + file.originalname);
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

app.listen(8000, function () {
  console.log('App running on port 8000');
});


