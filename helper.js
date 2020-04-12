const libre = require('libreoffice-convert');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');
let lib_convert = promisify(libre.convert)

async function convert(name) {
  try {
    let arr = name.split('.')
    const enterPath = path.join(__dirname, `/public/Resume/${name}`);
    const outputPath = path.join(__dirname, `/public/Resume/${arr[0]}.pdf`);
    // Read file
    let data = await fs.readFile(enterPath)
    let done = await lib_convert(data, '.pdf', undefined)
    await fs.writeFile(outputPath, done)
    return { success: true, fileName: arr[0] };
  } catch (err) {
    console.log(err)
    return { success: false }
  }
}
async function s3Upload(BUCKET, file, s3) {
  try {
    const enterPath = path.join(__dirname, `/public/Resume/${file}.pdf`);
    const fileName = path.basename(enterPath)
    let data = await fs.readFile(enterPath)
    var base64data = new Buffer.from(data, 'binary')
    let params = {
      Bucket: BUCKET,
      Key: fileName,
      Body: base64data
    }
    let res = await s3.putObject(params).promise();
    // { ETag: '"7f8e4d9785d80b357d024ef08ed2957e"' }
    if (res.ETag) {
      console.log(`Successfully uploaded file ${fileName} to S3 bucket.`)
      return { success: true, fileName: fileName }
    } else {
      console.log('Error occured while uploading to S3 bucket.')
      throw new Error('Upload to S3 was unsuccessfull!!')
    }
  } catch (err) {
    console.log(err)
    return { success: false }
  }
}

module.exports = {
  convert,
  s3Upload
};