const { API } = require("../api");
const GoogleDriveService = require('./api/googleDrive')
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

async function fetchFile(fileId) {
  const service = new GoogleDriveService(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, REFRESH_TOKEN);
  const res = await service.getFile(fileId)
  console.log("RES:", res)

  return res?.webViewLink
}

async function handleFileUpload(payload) {
  console.log("PAYLOAD", payload)
  if (typeof payload !== "object") {
    return 400;
  }

  const payloadData = payload?.AnswersJson?.page1;
  const file = await fetchFile(payloadData.fileName)
  console.log("FILE", file)
  console.log("FILE NAME", payloadData.fileName)
  let record = {}
  if(file) {
    const data = {
      payload: {
        field_60: payloadData.fileType,       // File Type
        field_88: payloadData?.assetId,       // Asset Id
        field_63: payloadData?.userId,   // Uploaded By
        field_64: payloadData?.jobId,        // Job
        field_62: file                       // File Url
      }
    }

    const res = await API.api("POST", 9, data)
    record = res;
    console.log("RES:", res)

    return 200;
  } else {
    return 400;
  }
}

module.exports = handleFileUpload;
