import React, { Component } from 'react';
import axios from 'axios';
import { Progress } from 'reactstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const FileDownload = require('js-file-download');
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedFile: null,
      loaded: 0,
      download: 0,
      disableUploadButton: false,
      disableDownloadButton: true,
      uploadedFile: null,
    }

  }
  checkMimeType = (event) => {
    //getting file object
    let files = event.target.files
    //define message container
    let err = []
    // list allow mime type
    const types = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    // loop access array
    for (let x = 0; x < files.length; x++) {
      // compare file type find doesn't matach
      if (types.every(type => files[x].type !== type)) {
        // create error message and assign to container   
        err[x] = files[x].type + ' is not a supported format\n';
      }
    };
    for (let z = 0; z < err.length; z++) {// if message not same old that mean has error 
      // discard selected file
      toast.error(err[z])
      event.target.value = null
    }
    return true;
  }
  maxSelectFile = (event) => {
    let files = event.target.files
    if (files.length > 1) {
      const msg = 'Only 1 images can be uploaded at a time'
      event.target.value = null
      toast.warn(msg)
      return false;
    }
    return true;
  }
  checkFileSize = (event) => {
    let files = event.target.files
    let size = 2000000
    let err = [];
    for (let x = 0; x < files.length; x++) {
      if (files[x].size > size) {
        err[x] = files[x].type + 'is too large, please pick a smaller file\n';
      }
    };
    for (let z = 0; z < err.length; z++) {// if message not same old that mean has error 
      // discard selected file
      toast.error(err[z])
      event.target.value = null
    }
    return true;
  }
  onChangeHandler = event => {
    var files = event.target.files
    console.log(files)
    if (this.maxSelectFile(event) && this.checkMimeType(event) && this.checkFileSize(event)) {
      // if return true allow to setState
      this.setState({
        selectedFile: files,
        loaded: 0
      })
    }
  }
  onClickHandler = () => {

    try {
      const data = new FormData()
      for (let x = 0; x < this.state.selectedFile.length; x++) {
        data.append('file', this.state.selectedFile[x])
      }
      axios.post("http://localhost:8000/uploadlocal", data, {
        onUploadProgress: ProgressEvent => {
          this.setState({
            loaded: (ProgressEvent.loaded / ProgressEvent.total * 100),
          })
        },
      })
        .then(res => { // then print response status
          this.setState({
            uploadedFile: res.data,
            disableDownloadButton: false
          })
          toast.success('Upload Success!')
        })
        .catch(err => { // then print response status
          toast.error('Upload Failed!')
        })
    } catch (err) {
      toast.warn('Please Upload Your Resume')
    }

  }
  onDownloadClick = () => {
    this.setState({
      disableUploadButton: true,
      disableDownloadButton: true
    })
    let file = this.state.uploadedFile
    try {
      if (!file) throw Error('INVALID_INPUT');
      axios.get("http://localhost:8000/download", {
        params: {
          fileName: file
        }
      })
        .then(res => { // then print response status
          let downloadUrl = 'https://cors-anywhere.herokuapp.com/' + res.data.urls[0]
          axios.get(downloadUrl, {
            crossDomain: true,
            onDownloadProgress: ProgressEvent => {
              this.setState({
                download: (ProgressEvent.loaded / ProgressEvent.total * 100),
              })
            },
          })
            .then(response => { // then print response status
              let data = JSON.stringify(response.data['Entities'])
              let saveFileName = `${Date.now()}-${file}`
              FileDownload(data, saveFileName);
              toast.success('Download Complete!')
            })
            .catch(err => { // then print response status
              toast.error('Download Failed')
            })
        })
        .catch(err => { // then print response status
          console.log(err)
          toast.error('Download Failed')
        })

      this.setState({
        disableUploadButton: false
      })
    } catch (e) {
      console.log(e)
      toast.error('Please Upload The File First!!!')
    }

  }

  render() {
    let { loaded, download, disableUploadButton, disableDownloadButton } = this.state
    console.log(disableDownloadButton, disableUploadButton, loaded, download)
    return (
      <main className="container">
        <div className="row jumbotron">
          <div className="offset-md-3 col-md-6">
            <div className="form-group files">
              <label>Upload Your File </label>
              <input type="file" className="form-control" multiple onChange={this.onChangeHandler} />
            </div>
            <div className="form-group">
              <ToastContainer />
              <Progress max="100" color="success" value={loaded} >{Math.round(loaded, 2)}%</Progress>

            </div>

            <button type="button" disabled={disableUploadButton} className="btn btn-success btn-block" onClick={this.onClickHandler}>Upload</button>

          </div>
        </div>
        <div className="row">
          <div className="offset-md-3 col-md-6">
            <ToastContainer />
            <button type="button" disabled={disableDownloadButton} className="btn btn-primary btn-block" onClick={this.onDownloadClick}>Download</button>
            <Progress max="100" color="info" value={download} >{Math.round(download, 2)}%</Progress>
          </div>
        </div>
      </main>
    );
  }
}

export default App;