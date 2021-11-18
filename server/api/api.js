'use strict';
// Load modules

const Fs = require('fs');
const Fpath = require('path');
const Os = require('os');
const Boom = require('boom');
const Request = require('promise-request-retry');
const Promise = require('bluebird');

exports.plugin = {
    name: 'api',
    register: function (server) {
        const {
            Knack,
            KnackAuth
        } = server.plugins;
        const KNACK_OBJECTS_IDS = Knack.objects();
        const knackBaseUrl = 'https://api.knack.com/v1/';

        server.route({
            method: 'GET',
            path: '/test',
            handler: async function (request, h) {
                console.log("Endpoint Here");
                return "Ok";
            }
        });

        const sendKnackViewRequest = (submitInfo) => {
            return new Promise( async (resolve,reject) =>  {
                Request({
                    ...submitInfo,
                    headers: {
                      'X-Knack-Application-Id': process.env.KNACK_APP_ID,
                      'X-Knack-REST-API-KEY': process.env.KNACK_API_KEY
                    },
                    dataType: 'json',
                    contentType: 'application/json',
                    retry : 3,
                    accepted: [400,401,402,403,404,419, 500, 503],
                    delay: 5000
                })
                .then(function(response){
                    resolve(response);
                })
                .catch(function(error){
                    console.log(error.message);
                    console.log(error.error);
                    reject(error);
                });
            });
        };       

        server.route({
            method: 'POST',
            path: '/requestUnresolvedReport',
            handler: async function (request, h) {

                console.log("Received request for Unresolved Report.");
                let postReq = request.payload? request.payload : {user_request: false};
                // console.log(postReq);
                let response = {status: "failure", error: null};
                let assetRecords;
                try {
                    assetRecords = await Knack.getAllRecords(1,[
                        {field:"field_416",operator:"is not blank"},//Count - AM Issues not finalized
                        {field:"field_416",operator:"higher than",value:0},//Count - AM Issues not finalized
                        {field:"field_417",operator:"is",value:"Yes"},//"Unresolved" Issues for more than 7 days?
                    ],KNACK_OBJECTS_IDS.Assets);
                } catch (e) {
                    console.log(e);
                    response.error = "Failed to get Knack records.";
                    return response;
                }

                let assetsJsonArr = [];
                for (var astrec of assetRecords) {
                    let recBody = {
                        id: astrec.id,
                        Fleet_No: astrec.field_116,
                        Rego: astrec.field_205,
                        Last_checked: astrec.field_118,
                        No_Unresolved_Issues: astrec.field_416,
                        Last_Date_Minor_Issue: astrec.field_368,
                        No_of_Days_on_MI: astrec.field_412,
                        Last_Date_Safety_Issue: astrec.field_369,
                        No_of_Days_on_SI: astrec.field_413,
                        Last_Date_All_Good: astrec.field_370,
                        No_of_Days_on_AG: astrec.field_414,
                    }
                    assetsJsonArr.push(recBody);
                }

                if(postReq.user_request){
                    let blobRes = await generateReportAndSendEmail(assetsJsonArr, "unresolved_issues_report", true);
                    response = {...response,
                      ...blobRes
                    }
                    return response;
                }else generateReportAndSendEmail(assetsJsonArr, "unresolved_issues_report");

                return "Ok";
            }
        });
      

        async function generateReportAndSendEmail(recordsObjList, filename, returnFile){
            filename = filename || "newfile";
            // csvReportStr
            try {
                let csvBlob = await createCSVBlob(recordsObjList,filename);
                let blobRes = {...csvBlob};
                if(returnFile){
                    if(!csvBlob.knackURL){
                        blobRes.status = "failure";
                        blobRes.error = "Failed to upload file. Must create on browser.";
                    }else
                        blobRes.status = "success";
                    return blobRes;
                }

                let sendFile = "";
                let mailMSG = `Daily export "${filename}" failed to produce CSV file.`;
                if(csvBlob.knackURL){
                    mailMSG = `Daily export "${filename}" successfully generated.`;
                    sendFile = csvBlob.knackURL;
                }
                let mailDetails = {
                    method: 'POST',
                    uri: knackBaseUrl+'scenes/scene_55/views/view_85/records/',
                    form: {
                        // field_155: `Daily CSV TEST: "${filename}"`,
                        // field_157: "sebastian@soluntech.com",
                        field_155: `Daily CSV Export: "${filename}"`,
                        field_157: "keith@techenabled.nz",
                        field_158: mailMSG,
                        field_419: sendFile,
                        field_420: "Yes", //Send Email?
                    }
                };
                try {
                    await sendKnackViewRequest(mailDetails);
                    console.log("History Log Created!");
                } catch (e) {
                    console.log(e);
                }
            } catch (e) {
                console.log(e);
                // errMSG = "Something went wrong. Please try again."
            }
        };
        var createCSVBlob = async (orderItems, fileTitle, anchor) => {
            fileTitle = (fileTitle || "newfile") + ".csv";
            let csvString = generateColumnTitles(orderItems[0]);
            if(!csvString) return false;
            for (var item of orderItems) {
              csvString+=addNextLine(item);
            }
            // console.log(csvString);
            let newPath = Fpath.join(Os.tmpdir(), fileTitle);
            Fs.writeFileSync(newPath, csvString, 'binary');
            let uploadResponse;
            try {
                uploadResponse = await Knack.upload({
                    type: 'file',
                    body: {
                      name: fileTitle,
                      files: {
                        value: Fs.createReadStream(newPath),
                        options: {
                          fileTitle,
                          contentType: 'text/csv'
                          // contentType: 'application/pdf'
                        }
                      }
                    }
                });
                uploadResponse = JSON.parse(uploadResponse);
            } catch (e) {
                console.log("Failed to upload file to Knack repository.");
            }
            // console.log(uploadResponse);
            let blobJSON = {bodyStr: csvString, knackURL: uploadResponse? uploadResponse.public_url : false};
            return blobJSON;
        };
        var generateColumnTitles = (objectBody) => {
            try {
              let titleArray = Object.keys(objectBody);
              let columnTitles = ""; let i = 0; let endIndex = titleArray.length-1;
              for (var title of titleArray) {
                if(i!=0) {
                  let wordEnd = i == endIndex? "\n" : ",";
                  columnTitles += title.split("_").join(" ")+wordEnd;
                }
                i++;
              }
              return columnTitles;
            } catch (e) {
              console.log(e);
              return false;
            }
        };
        var addNextLine = (data, isTitleLine)=>{
            let values = Object.values(data);
            let lineStr = ""; let i=0; let endIndex = values.length-1;
            for (var val of values) {
              if(i!=0) {
                let wordEnd = i == endIndex? "\n" : ",";
                lineStr += `"${val}"`+wordEnd;
              }
              i++;
            }
            return lineStr;
        };


        server.route({
            method: 'POST',
            path: '/createServiceWarning',
            handler: async function (request, h) {
                console.log("Checking Service Limits");

                let warningRecords = "";
                try {
                  let knackRecords = await Knack.getAllRecords(1,[],KNACK_OBJECTS_IDS.Assets);
                  warningRecords = knackRecords.filter( amR => {
                      let checkType = amR.field_1, warningStatus = "Good", issueReported = false;
                      if(checkType != "Plant" && checkType != "Truck") return false;
                      let tempName = "";
                      if(checkType == "Plant"){
                          warningStatus = amR.field_375; //Check Hours Warning
                          issueReported = amR.field_377_raw; //AM Issue created for ServiceHR Limit?
                      }else{
                          warningStatus = amR.field_374; //Check Kilometers Warning
                          issueReported = amR.field_376_raw; //AM Issue created for ServiceKM Limit?
                      }
                      return warningStatus!="Good" && !issueReported;
                  });
                } catch (e) {
                    console.log(e);
                    return false;
                }

                // return warningRecords;
                // let results = await CreateServiceWarningAMIssue(warningRecords);
                // return results;
                CreateServiceWarningAMIssue(warningRecords);
                return "Ok";
            }
        });

        const CreateServiceWarningAMIssue = async (recordsList) => {
            let successArr = [], failArr = [];
            await Promise.map(recordsList, async (assetR) => {
                let fleetNo = assetR.field_116,  checkType = assetR.field_1, warningStatus = "";
                let comparisonFD = "", serviceVal = "";
                if (checkType == "Plant") {
                    comparisonFD = "Engine Hours";
                    serviceVal = assetR.field_123;
                    warningStatus = assetR.field_375;
                }else if(checkType == "Truck"){
                    comparisonFD = "Odometer";
                    serviceVal = assetR.field_122;
                    warningStatus = assetR.field_374;
                }else return false;

                let issueName = `asset_service_limit: ${checkType}_${warningStatus}`; //[CheckType]_[WarningStatus]
                let comment = "", issueCause = "", assetStatus = "";
                if (warningStatus == "Danger"){
                    comment = `Asset's[${fleetNo}] "${comparisonFD}" value has gone over the maintenance threshold [${serviceVal}].`;
                    issueCause = "Lack Of Maintenance";
                    assetStatus = "Safety Issue";
                }else{
                    comment = `Asset's[${fleetNo}] "${comparisonFD}" value is close to hitting maintenance threshold [${serviceVal}].`;
                    issueCause = "General Wear and tear";
                    assetStatus = "Minor Issue";
                }

                let amBody = {
                    field_309: assetR.id,
                    // field_314: userID,
                    field_311: issueName, //Issue Name
                    field_316: "New", //Issue Status
                    field_312: comment, //Comment
                    // field_313: "", //Photo Link
                    field_317: issueCause, //Cause of Issue
                    field_378:assetStatus, //Asset Status
                };

                try {
                    let result = await sendKnackViewRequest({
                        method : 'POST',
                        uri : knackBaseUrl+'scenes/scene_110/views/view_188/records/',
                        form : amBody
                    });
                    console.log("Updated Asset: ", fleetNo);
                    successArr.push(fleetNo);
                } catch (e) {
                    console.log("Error creating AM record.");
                    console.log(e);
                    failArr.push(fleetNo);
                }
            },{
              concurrency: 3
            });

            let results = {Success: successArr, Failure: failArr};
            console.log(results);
            return results;
        }


    }
};
