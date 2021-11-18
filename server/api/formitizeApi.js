'use strict';
// Load modules

const Fs = require('fs');
const Fpath = require('path');
const Os = require('os');
const Boom = require('boom');
const Request = require('promise-request-retry');
const Axios = require('axios').default;
// let newpath =  Fpath.resolve( __dirname, "./plugin/axiosFormatize.js" )
// console.log(newpath);
// const AxiosFM = require(newpath);
const Moment= require('moment');

exports.plugin = {
    name: 'formitizeApi',
    register: function (server) {
        const {
            Knack,
            KnackAuth
            // ,AxiosFM
        } = server.plugins;
        const KNACK_OBJECTS_IDS = Knack.objects();
        const knackBaseUrl = 'https://api.knack.com/v1/';


        const AxiosFM = Axios.create({
            baseURL: 'https://service.formitize.com/api/rest/v2/',
            // timeout: 1000,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'User-Agent':process.env.FM_COMPANY
            },
            auth:{
              "username": process.env.FM_COMPANY_USER,
              "password": process.env.FM_USER_PASSWORD
            }
        });


        server.route({
            method: 'GET',
            path: '/test',
            handler: async function (request, h) {
                console.log("Test Endpoint");
                return "Ok";
            }
        });

        server.route({
          method: 'GET',
          path: '/getFMdatabases',
          handler: async function (request, h) {
            let dbURL = "https://service.formitize.com/api/rest/v2/database/list"

            AxiosFM.get('database/list')
            .then(function(response){
                // console.log(response.data);
                let payload = response.data.payload;
                console.log(payload);
                console.log("SUCCESS");
            })
            .catch(function(error){
                console.log(error.response);
            });

            return "Ok";
          }
        });

        var reformatChildArrToObject = (fieldsData) => {
            let shChildObj = {};
            for (var chdata of fieldsData) {
                if(!chdata.hasOwnProperty("value") && chdata.children){
                    let chArr = [];
                    let chEntries = Object.keys(chdata.children).map(iKey => {return chdata.children[iKey];});
                    for (var chEntry of chEntries) {
                        let chEarr = Object.keys(chEntry).map(iKey => {return chEntry[iKey];});
                        chArr.push( reformatChildArrToObject(chEarr) );
                    }
                    chdata = {name: chdata.name, value: chArr};
                }
                else if(!chdata.hasOwnProperty("value") && chdata.data){
                    let chd = Object.keys(chdata.data).map(iKey => {return chdata.data[iKey];});
                    chdata.value = chd;
                }
                shChildObj[chdata.name] = chdata.hasOwnProperty("value")? chdata.value : chdata;
            }
            return shChildObj;
        };
        var getFormFields = (formPayload) =>{
            let formFieldsArr = [];
            let content = formPayload.content;
            let formSubHeaders = Object.keys(content).map(iKey => {return content[iKey];});
            for (var fshEntry of formSubHeaders) {
                if(Object.keys(fshEntry).length > 1){
                    let arrData = [];
                    let fSHarr = Object.keys(fshEntry).map(iKey => {return fshEntry[iKey];});
                    for (var shCentry of fSHarr) {
                        let fieldsData = Object.keys(shCentry.children).map(iKey => {return shCentry.children[iKey];});
                        arrData.push( reformatChildArrToObject(fieldsData) );
                    }
                    formFieldsArr.push({name: fshEntry[0].name, data: arrData});
                }else{
                    let childFields = fshEntry[0].children;
                    let fieldsData = Object.keys(childFields).map(iKey => {return childFields[iKey];});
                    formFieldsArr = formFieldsArr.concat( fieldsData );
                }
            }
            let formFieldsObj = reformatChildArrToObject(formFieldsArr)
            formFieldsObj.attachments = formPayload.attachments[0].url;
            return formFieldsObj;
        }
        var sendKnackViewRequest = (submitInfo) => {
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

        let fmFormIDs = {
            [process.env.INC_REPORT_ID] : "incident_report_form",
            [process.env.LEAVE_REQ_ID] : "leave_request_form",
            [process.env.TIMESHEETSV2_ID] : "timesheetv2_form",
            [process.env.ASSETS_CHECK_ID] : "assets_checksheet",
            [process.env.TAKE5_FORM_ID] : "take5_form",
            [process.env.INSPECTION_CHECKLIST_ID] : "inspection_checklist_form",
            [process.env.BRIEFING_TOOLBOX_ID] : "briefing_toolbox_form",
            [process.env.STEP_BACK_ID] : "step_back_form",
            [process.env.DAILY_RECORD_SHEET_ID] : "daily_record_form",
        };

        server.route({
          method: 'POST',
          path: '/captureFormitizeSubmits',
          handler: async function (request, h) {
              let formPayload = request.payload;
              executeKnackBehavior(formPayload);
              return "Ok";
          }
        });

        async function executeKnackBehavior(formPayload){
            let fieldsData = getFormFields(formPayload);
            console.log("FormID: ", formPayload.formID);
            console.log("Simplified Format: ", fieldsData);
            let formType = fmFormIDs[formPayload.formID];
            if(formType){
                let executeFN = knackBehaviorSelection(formType);
                console.log(executeFN);
                if (!executeFN) {
                    return console.log("KnackBehavior not found.");
                }

                let result = await executeFN(formPayload, fieldsData, formType);
                console.log(result);
                let userEmail = fieldsData.UserEmail;
                if(!userEmail) return console.log("User email not found.");
                // console.log(userEmail);
                // return console.log("Prevent Email");
                let mailMSG = result.status=="SUCCESS"?
                  `Successfully saved data on database.`
                : `Error saving data on database:\n ${result.error}`;
                let mailDetails = {
                    method: 'POST',
                    uri: knackBaseUrl+'scenes/scene_55/views/view_85/records/',
                    form: {
                        field_155: formType,
                        field_157: userEmail,
                        field_158: mailMSG
                    }
                };
                try {
                    await sendKnackViewRequest(mailDetails);
                    console.log("Notification Email Sent!");
                } catch (e) {
                    console.log(e);
                }

            } else return console.log("Form not recognized.");
        };
        var knackBehaviorSelection = (formType) => {
            switch (formType) {
                case "incident_report_form": return createIncidentReport;
                case "leave_request_form": return createLeaveRequestRecord;
                case "timesheetv2_form": return manageTimesheetForm;
                case "assets_checksheet": return updateAssetRecord;
                case "take5_form": return uploadFileToJobRecord;
                case "inspection_checklist_form": return uploadFileToJobRecord;
                case "briefing_toolbox_form": return uploadFileToJobRecord;
                case "step_back_form": return uploadFileToJobRecord;
                case "daily_record_form": return uploadFileToJobRecord;
            }
            return false;
        };

        var searchKnackDBforJob = async (jobNoID) => {
            try {
                let jobRecords = await Knack.find({
                  objectKey: KNACK_OBJECTS_IDS.Jobs,
                  filters: [{field:"field_137",operator:"is",value:jobNoID}]
                });
                if(jobRecords.records.length != 1) return false;

                return jobRecords.records[0];
            } catch (e) {
                console.log(e);
                return false;
            }
        }
        var searchKnackDBforAsset = async (fleetNo) => {
            try {
                let assetRecords = await Knack.find({
                  objectKey: KNACK_OBJECTS_IDS.Assets,
                  filters: [{field:"field_116",operator:"is",value:fleetNo}]
                });
                if(assetRecords.records.length != 1) return false;

                return assetRecords.records[0];
            } catch (e) {
                console.log(e);
                return false;
            }
        }
        async function createTSdetailrecords(timesheetID, formData){

            if(formData.ProjectHours.length > 0){
                console.log("start job allocation");
                for (var jobAllocation of formData.ProjectHours) {
                    try {
                        let jobNoID = jobAllocation.AllocProjectName;
                        let jobRecord = await searchKnackDBforJob(jobNoID);
                        if(!jobRecord) continue; //skip process

                        let allocBody = {
                            field_215: timesheetID, //timesheet connection
                            field_216: jobRecord.id, //job connection
                            field_217: jobAllocation.AllocProjectHours
                        };

                        console.log(jobAllocation.TypeOfWork);
                        if (jobAllocation.TypeOfWork['0']=="Operater") {
                            let assetRecord = await searchKnackDBforAsset(jobAllocation.AssetNo);
                            if(assetRecord) allocBody.field_218 = assetRecord.id; //asset connection
                        }

                        let knackCreate = await Knack.create({
                            objectKey: KNACK_OBJECTS_IDS.Timesheet_Alloc_Details,
                            body: allocBody
                        })
                    } catch (e) {
                        console.log(e);
                        console.log("Error creating timesheet details: JOB");
                    }
                }
            }
            // if(formData.AssetHours && formData.AssetHours.length > 0){
            //     console.log("start asset allocation");
            //     for (var assetAllocation of formData.AssetHours) {
            //         try {
            //             let assetRecord = await searchKnackDBforAsset(assetAllocation.AssetNo);
            //             if(!assetRecord) continue; //skip process
            //
            //             let knackCreate = await Knack.create({
            //                 objectKey: KNACK_OBJECTS_IDS.Timesheet_Alloc_Details,
            //                 body: {
            //                   field_215: timesheetID, //timesheet connection
            //                   field_218: assetRecord.id, //job connection
            //                   field_217: assetAllocation.AllocAssetHours
            //                 }
            //             })
            //         } catch (e) {
            //             console.log("Error creating timesheet details: ASSET");
            //         }
            //     }
            // }
        };

        var manageTimesheetForm = async (formPayload, formData, formType) => {
            let replyBody = {status:"FAILED", error:null};
            // return replyBody;

            if(formType!="timesheetv2_form"){
                replyBody.error = "Unexpected formType selected.";
                return replyBody;
            }

            if(!formData.StaffEmail){
                replyBody.error = "Missing form required data.";
                return replyBody;
            }

            let staffRecords="", fdStaffRecord="";
            try {
                staffRecords = await Knack.find({
                    objectKey: KNACK_OBJECTS_IDS.Staff,
                    filters: [{field:"field_10",operator:"is",value:formData.StaffEmail}]
                });
                console.log("Found Staff: ", staffRecords.records.length);
                // console.log(staffRecords.records);
                if(staffRecords.records.length != 1){
                  replyBody.error = "Error finding Staff user on database.";
                  return replyBody;
                }
                fdStaffRecord = staffRecords.records[0];
            } catch (e) {
                console.log(e);
                replyBody.error = "Unexpected error finding Staff record.";
                return replyBody;
            }

            // LookUpStatus: 'Signed Out', || 'Signed In'
            // ConfirmStatus: { '0': 'Signing In' } || 'I am Signing Out'
            let formAction = formData.ConfirmStatus['0'];
            let isV2UpdateRequest = formAction == "I am Signing Out"? true : false;
            let dateField = "";

            if(!isV2UpdateRequest && fdStaffRecord.field_101 > 0){
                replyBody.error = "There is already a SignedIn/Active timesheet running for this user.";
                return replyBody;
            }
            if(isV2UpdateRequest && fdStaffRecord.field_101 == 0){
                replyBody.error = "No SignedIn/Active timesheet found for this user.";
                return replyBody;
            }
            if(isV2UpdateRequest && fdStaffRecord.field_101 > 1){//may change in the future
                replyBody.error = "More than one SignedIn/Active timesheet found for this user.";
                return replyBody;
            }

            let reqInfo;
            // Convert date/time values into Knack friendly format
            let dateInput, timeInput;
            if (isV2UpdateRequest) {
                dateField = "field_84"
                dateInput = formData.FinishDate // '20 May 2021'
                timeInput = formData.FinishTime // '05:01 pm'
            }else{
                dateField = "field_83";
                dateInput = formData.StartDate // '20 May 2021'
                timeInput = formData.StartTime // '05:01 pm'
            }
            let combinedTxt = new Date(dateInput+" "+timeInput);
            let knackDate = Moment(combinedTxt, 'DD/MM/YYYY hh:mma').format('DD/MM/YYYY hh:mma');
            console.log("Found Date: ", knackDate);
            if(knackDate=="Invalid date"){
                replyBody.error = "Form invalid date input.";
                return replyBody;
            }

            if(isV2UpdateRequest){

                let tmsheetRecords="";
                try {
                    tmsheetRecords = await Knack.find({
                        objectKey: KNACK_OBJECTS_IDS.Timesheets,
                        filters: [
                          // {field:"field_81",operator:"is",value:jobRecords.records[0].id}, Not possible to look for JOB
                          {field:"field_100",operator:"is",value:"Signed In"},
                          {field:"field_90",operator:"is",value:fdStaffRecord.id},
                        ]
                    });
                    console.log("Found Timesheet: ", tmsheetRecords.records.length);
                    // console.log(tmsheetRecords.records);
                    if(tmsheetRecords.records.length != 1) {
                      replyBody.error = "Error finding active timesheet.";
                      return replyBody;
                    }
                } catch (e) {
                    console.log(e);
                    replyBody.error = "Unexpected error finding Timesheet record.";
                    return replyBody;
                }

                let timesheetID = tmsheetRecords.records[0].id;

                let timesheetPayload = {
                    field_88: "", //sign-in notes
                    field_89: formData.SignOutComments, //comments
                    field_90: fdStaffRecord.id,
                    [dateField]: knackDate
                };
                reqInfo = {
                    method : 'PUT',
                    uri : knackBaseUrl+'scenes/scene_54/views/view_84/records/'+timesheetID,
                    form : timesheetPayload,
                }

                if (!formData.ProjectHours) formData.ProjectHours = [];
                // if (!formData.AssetHours) formData.AssetHours = [];
                // if(formData.ProjectHours.length > 0 || formData.AssetHours.length > 0){
                if(formData.ProjectHours.length > 0){
                    try {
                        await createTSdetailrecords(timesheetID,formData);
                    } catch (e) {
                        console.log(e);
                    }
                }
            }else {
                // }else if(formAction == "Signing In"){
                let jobRecord="";
                try {
                    let jobNoID = formData.SelectProject;
                    jobRecord = await searchKnackDBforJob(jobNoID);
                    console.log("Found Job: ", jobRecord.id);
                } catch (e) {
                    console.log(e);
                }
                if(!jobRecord){
                    replyBody.error = "Unexpected error finding Job record.";
                    return replyBody;
                }

                let timesheetPayload = {
                    field_81: jobRecord.id,
                    field_88: formData.SignInComment, //sign-in notes
                    field_89: "", //Comments
                    field_90: fdStaffRecord.id,
                    [dateField]: knackDate
                };
                reqInfo = {
                    method : 'POST',
                    uri : knackBaseUrl+'scenes/scene_53/views/view_82/records/',
                    form : timesheetPayload,
                }
                console.log("Timesheet payload: ", timesheetPayload);
            }

            console.log("Ajax Request: ", reqInfo);
            // return ;
            let knackSubmit="";
            try {
                knackSubmit = await sendKnackViewRequest(reqInfo);
                replyBody.status="SUCCESS";
                knackSubmit = JSON.parse(knackSubmit);
            } catch (e) {
                console.log(e);
                replyBody.error = "Unexpected error updating Timesheets database."
                return replyBody;
            }
            try {
                fdStaffRecord.field_32 = knackSubmit.record.field_100; //Staff "Working Status"
                if(!isV2UpdateRequest) fdStaffRecord.field_211 = knackSubmit.record.field_83;//Staff "Last SignedIn"
                updateFormitizeLookUPTable("staffusers",process.env.FMTABLE_STAFF,[ fdStaffRecord ]);
            } catch (e) {
                console.log(e);
            }

            return replyBody;
        };

        var uploadFileToJobRecord = async (formPayload, formData, formType) => {
            let replyBody = {status:"FAILED", error:null};
            if(formType!="take5_form" && formType!="inspection_checklist_form" && formType!="briefing_toolbox_form"
              && formType!="step_back_form" && formType!="daily_record_form"){
                replyBody.error = "Unexpected formType selected.";
                return replyBody;
            }
            let formDescription = "Registered UploadFile Formitize";
            switch (formType) {
                case "take5_form": formDescription = "Job Take 5 Update"; break;
                case "inspection_checklist_form": formDescription = "Site Inspection Checklist"; break;
                case "briefing_toolbox_form": formDescription = "Site Briefing Toolbox"; break;
                case "step_back_form": formDescription = "Step Back Update"; break;
                case "daily_record_form": formDescription = "Daily Record Sheet"; break;
                default: break;
            }

            let jobRecord="";
            let jobNoID = formData.JobSelected || "";
            if(!formData.UserEmail || !jobNoID){
                replyBody.error = "Missing form required data.";
                return replyBody;
            }
            try {
                jobRecord = await searchKnackDBforJob(jobNoID);
                console.log("Found Job: ", jobRecord.id);
            } catch (e) {
                console.log(e);
            }
            if(!jobRecord){
                replyBody.error = "Unexpected error finding Job record.";
                return replyBody;
            }

            let accountRecords, userID="";
            try {
                accountRecords = await Knack.find({
                    objectKey: KNACK_OBJECTS_IDS.Accounts,
                    filters: [{field:"field_5",operator:"is",value:formData.UserEmail}]
                });
                console.log("Found Accounts: ", accountRecords.records.length);
                // console.log(accountRecords.records);
                if(accountRecords.records.length == 1) userID = accountRecords.records[0].id;
            } catch (e) {
                console.log(e);
            }

            let knackPayload = {
                field_207: formData.attachments,
                field_206: userID,
                field_230: formDescription
            }
            if(formData.SafeToWork){
                //If Take5Form, update the "Is Safe to Work" field on Job record too.
                knackPayload.field_2 = formData.SafeToWork? formData.SafeToWork['0'] : "No";
            }

            console.log("Knack Payload: ");
            console.log(knackPayload);
            // return;

            let reqInfo = {
                method : 'PUT',
                uri : knackBaseUrl+'scenes/scene_72/views/view_107/records/'+jobRecord.id,
                form : knackPayload
            }

            // Update Only
            try {
                let knackSubmit = await sendKnackViewRequest(reqInfo);
                replyBody.status="SUCCESS";
            } catch (e) {
                console.log(e.error);
                replyBody.error = "Unexpected error uploading file to Job."
            }

            return replyBody;
        }

        var updateAssetRecord = async (formPayload,formData,formType) =>{
            let replyBody = {status:"FAILED", error:null};
            if(formType!="assets_truck_form" && formType!="assets_checksheet"){
                replyBody.error = "Unexpected formType selected.";
                return replyBody;
            }

            let assetRecords, assetID="";
            try {
                assetRecords = await Knack.find({
                    objectKey: KNACK_OBJECTS_IDS.Assets,
                    filters: [{field:"field_116",operator:"is",value:formData.FleetNumber}]
                });
                console.log("Found Assets: ", assetRecords.records.length);
                // console.log(assetRecords.records);
                if(assetRecords.records.length != 1){
                    replyBody.error = "Error finding Asset record on database.";
                    return replyBody;
                }
                assetID = assetRecords.records[0].id;
            } catch (e) {
                console.log(e);
                replyBody.error = "Unexpected error finding Asset record.";
                return replyBody;
            }

            let accountRecords, userID="";
            try {
                accountRecords = await Knack.find({
                    objectKey: KNACK_OBJECTS_IDS.Accounts,
                    filters: [{field:"field_5",operator:"is",value:formData.UserEmail}]
                });
                console.log("Found Accounts: ", accountRecords.records.length);
                // console.log(accountRecords.records);
                if(accountRecords.records.length == 1) userID = accountRecords.records[0].id;
            } catch (e) {
                console.log(e);
            }

            let knackPayload = {
                field_1: formData.CheckType? formData.CheckType['0'] : "Heavy Truck",
                field_118: formData.LastChecked,
                field_121: formData.Hubo,
                field_197: formData.Odometer,
                field_120: formData.Cof,
                field_119: formData.RegoDue,
                field_122: formData.ServiceKM,
                field_124: formData.Status['0'],
                field_161: formData.attachments,
                field_200: userID
            }

            console.log("Knack Payload: ");
            console.log(knackPayload);
            // return;

            let reqInfo = {
                method : 'PUT',
                uri : knackBaseUrl+'scenes/scene_70/views/view_103/records/'+assetID,
                form : knackPayload
            }

            // Update Only
            let knackSubmit="";
            try {
                knackSubmit = await sendKnackViewRequest(reqInfo);
                replyBody.status="SUCCESS";
                knackSubmit = JSON.parse(knackSubmit);
            } catch (e) {
                console.log(e.error);
                replyBody.error = "Unexpected error updating Asset on database."
                return replyBody;
            }
            try {
                updateFormitizeLookUPTable("assets",process.env.FMTABLE_ASSETS,[ knackSubmit.record ]);
            } catch (e) {
                console.log(e);
            }

            return replyBody;
        };

        var createLeaveRequestRecord = async (formPayload,formData,formType) =>{
            let replyBody = {status:"FAILED", error:null};
            if(formType!="leave_request_form"){
                replyBody.error = "Unexpected formType selected.";
                return replyBody;
            }

            if(!formData.UserEmail || !formData.ReasonLeave
               || !formData.StartDate || !formData.EndDate){
                replyBody.error = "Missing form required data.";
                return replyBody;
            }

            let staffRecords;
            try {
                staffRecords = await Knack.find({
                    objectKey: KNACK_OBJECTS_IDS.Staff,
                    filters: [{field:"field_10",operator:"is",value:formData.UserEmail}]
                });
                console.log("Found Staff: ", staffRecords.records.length);
                // console.log(staffRecords.records);
                if(staffRecords.records.length != 1){
                    replyBody.error = "Error finding Staff user on database.";
                    return replyBody;
                }
            } catch (e) {
                console.log(e);
                replyBody.error = "Unexpected error finding Staff record.";
                return replyBody;
            }

            let calStartDate = Moment(new Date(formData.StartDate), 'DD/MM/YYYY hh:mma');
            let calEndDate = Moment(new Date(formData.EndDate), 'DD/MM/YYYY hh:mma');
            // let knackDate = Moment(combinedTxt, 'DD/MM/YYYY hh:mma').format('DD/MM/YYYY hh:mma');
            var complexDate = {
                date: calStartDate.format('DD/MM/YYYY'),
                hours: calStartDate.format('hh'),
                minutes: calStartDate.format('mm'),
                am_pm: calStartDate.format('a'),
                to: {
                  date: calEndDate.format('DD/MM/YYYY'),
                  hours: calEndDate.format('hh'),
                  minutes: calEndDate.format('mm'),
                  am_pm: calEndDate.format('a'), //"12:00PM"
                }
            };

            let knackPayload;
            try {
                knackPayload = {
                    field_170: staffRecords.records[0].id,
                    field_175: formData.LeaveType['0'],
                    field_171: formData.StartDate,
                    field_172: formData.EndDate,
                    field_173: complexDate,
                    field_168: formData.ReasonLeave, //Comment
                    // field_176: formData.EmployeeSignatureDate, //Date of Request
                    field_194: formData.EmployeeSignature.image,
                    // field_19X: formData.SupervisorSignatureDate,
                    field_195: formData.attachments,
                };
            } catch (e) {
                console.log(e);
                replyBody.error = "Unexpected error processing the form data.";
            }

            console.log("Knack Payload: ");
            console.log(knackPayload);
            // return;
            try {
              let knackCreate = await Knack.create({
                  objectKey: KNACK_OBJECTS_IDS.Leave_requests,
                  body: knackPayload
              })
              replyBody.status="SUCCESS";
            } catch (e) {
              console.log(e.error);
              replyBody.error = "Unexpected error creating record on database."
            }

            return replyBody;
        };

        var createIncidentReport = async (formPayload, formData, formType) => {
            let replyBody = {status:"FAILED", error:null};
            if(formType!="incident_report_form"){
                replyBody.error = "Unexpected formType selected.";
                return replyBody;
            }

            let jobRecord="";
            let jobNoID = formData.JobSelected || "";
            if(!formData.UserEmail || !jobNoID){
                replyBody.error = "Missing form required data.";
                return replyBody;
            }
            try {
                jobRecord = await searchKnackDBforJob(jobNoID);
                console.log("Found Job: ", jobRecord.id);
            } catch (e) {
                console.log(e);
            }
            if(!jobRecord){
                replyBody.error = "Unexpected error finding Job record.";
                return replyBody;
            }

            let address ={
                street: formData.EventLocation || "",
                city: "",
                state: "",
                zip: ""
            };
            let combinedTxt = new Date(formData.EventDate+" "+formData.EventTime);
            let knackDate = Moment(combinedTxt, 'DD/MM/YYYY hh:mma').format('DD/MM/YYYY hh:mma');
            let knackPayload = {
                field_186: formData.IncidentName,
                field_141: formData.NamePersonReporting,
                field_227: formData.DepartmentSelect['0'],
                field_228: formData.NotifiableEvent['0'],
                field_226: jobRecord.id,
                field_142: address, //Location of Event
                field_196: formData.EventLocation, //Location string
                field_209: formData.attachments,
                field_191: formData.formPhoto_1.images['0'] || "",
                field_192: formData.formPhoto_2.images['0'] || "",
                field_140: knackDate,
            }


            console.log("Knack Payload: ");
            console.log(knackPayload);
            // return;
            // try {
            //     let knackCreate = await Knack.create({
            //         objectKey: KNACK_OBJECTS_IDS.Accident_incident_registers,
            //         body: knackPayload
            //     })
            //     replyBody.status="SUCCESS";
            // } catch (e) {
            //     console.log(e.error);
            //     replyBody.error = "Unexpected error creating record on database."
            // }
            let reqInfo = {
                method : 'POST',
                uri : knackBaseUrl+'scenes/scene_85/views/view_136/records/',
                form : knackPayload
            }
            try {
                await sendKnackViewRequest(reqInfo);
                replyBody.status="SUCCESS";
            } catch (e) {
                console.log(e.error);
                replyBody.error = "Unexpected error creating Incident Report on database."
                return replyBody;
            }

            return replyBody;
        };

        server.route({
            method: 'PATCH',
            path: '/update_formitize_staffmembers',
            handler: async function (request, h) {
                let payload = request.payload || {knack_record:null};
                let payList = payload.knack_record? [payload.knack_record] : false;
                updateFormitizeLookUPTable("staffusers",process.env.FMTABLE_STAFF,payList);
                // updateFormitizeLookUPTable("staffusers",process.env.FMTABLE_STAFF);
                return "Ok";
            }
        });
        server.route({
            method: 'PATCH',
            path: '/update_formitize_jobs',
            handler: async function (request, h) {
                let payload = request.payload || {knack_record:null};
                let payList = payload.knack_record? [payload.knack_record] : false;
                updateFormitizeLookUPTable("jobs",process.env.FMTABLE_JOBS,payList);
                // updateFormitizeLookUPTable("jobs",process.env.FMTABLE_JOBS);
                return "Ok";
            }
        });
        server.route({
            method: 'PATCH',
            path: '/update_formitize_assets',
            handler: async function (request, h) {
                let payload = request.payload || {knack_record:null};
                let payList = payload.knack_record? [payload.knack_record] : false;
                updateFormitizeLookUPTable("assets",process.env.FMTABLE_ASSETS,payList);
                // updateFormitizeLookUPTable("assets",process.env.FMTABLE_ASSETS);
                return "Ok";
            }
        });

        async function updateFormitizeLookUPTable(formatType, tableName, recordsList){
            if(!formatType) return false;
            if(!tableName) return false;

            var primaryKey="", knackObj="";
            if (formatType=="jobs"){
                knackObj = KNACK_OBJECTS_IDS.Jobs;
                primaryKey = "JobAutoID"
            }else if(formatType=="assets"){
                knackObj = KNACK_OBJECTS_IDS.Assets;
                primaryKey = "FleetNo"
            }else if(formatType=="staffusers"){
                knackObj = KNACK_OBJECTS_IDS.Staff;
                primaryKey = "Email"
            }

            var knackRecords="";
            // console.log(recordsList);
            if(recordsList)
                knackRecords = recordsList;
            else {
                try {
                    knackRecords = await Knack.getAllRecords(1,[],knackObj);
                } catch (e) {
                    console.log(e);
                }
            }

            console.log(knackRecords.length);
            if(knackRecords.length == 0) return false;
            let knToFmRecords = convertRecordsFormat_KnToFm(formatType, knackRecords);
            console.log(knToFmRecords.length);
            // console.log(knToFmRecords);

            postToFMdatabase(tableName,{
                "payload": knToFmRecords,
                "pk": [primaryKey]
            });
        };
        function postToFMdatabase(dbName, postData){
            if(!dbName) return false;
            // if(postData.payload.length == 1) console.log("Call Formitize: ", postData);
            AxiosFM.post("database/"+dbName, postData)
            .then(function(response){
                console.log("Res Status: "+response.status+"-"+response.statusText);
            })
            .catch(function(error){
                console.log(error);
            });
        }

        var convertRecordsFormat_KnToFm = (recordType, knackRecords) => {
            let newRecords = [];
            let convertRecord = false;
            switch (recordType) {
                case "jobs": convertRecord = fmJobFormat; break;
                case "assets": convertRecord = fmAssetFormat; break;
                case "staffusers": convertRecord = fmStaffFormat; break;
            }
            if(!convertRecord) return false;

            for (var recbody of knackRecords) {
                try {
                    let payload = convertRecord(recbody);
                    if(payload) newRecords.push(payload);
                } catch (e) {
                    console.log(e);
                }
            }
            return newRecords;
        };
        var fmStaffFormat = (recbody) => {
            try {
                if(!recbody.field_10) return false;
                let fmDate = Moment(recbody.field_211, 'DD/MM/YYYY hh:mma').format('DD/MM/YYYY HH:mm'); //Formitize needs Military time
                let payload = {
                    "Name": recbody.field_9,
                    "Email": recbody.field_10? recbody.field_10_raw.email : "",
                    "PIN": recbody.field_34,
                    "Status": recbody.field_32,
                    "LastSignIn": fmDate,
                };
                return payload;
            } catch (e) {
                console.log(e);
            }
            return false;
        };
        var fmAssetFormat = (recbody) => {
            try {
                if(!recbody.field_116) return false;
                let payload = {
                    "QR": recbody.field_114, //Knack AutoIncrement
                    "REGO": recbody.field_205,
                    "SerialNumber": recbody.field_115,
                    "AssignedTo": recbody.field_129? recbody.field_129_raw[0].identifier : "", //Staff user
                    "FleetNo": recbody.field_116,
                    "Make": recbody.field_126,
                    "Model": recbody.field_127,
                    "MakeModel": recbody.field_117,
                    "CheckType": recbody.field_1,
                    "LastChecked": recbody.field_118,
                    "RegoDue": recbody.field_119,
                    "WOFCOF": recbody.field_120,
                    "HuboEngineHours": ""+recbody.field_121,
                    "Odometer": ""+recbody.field_197,
                    "ServiceKms": ""+recbody.field_122,
                    "ServiceHours": ""+recbody.field_123,
                    "Status": recbody.field_124,
                    "DatePurchased": recbody.field_125,
                    "Year": recbody.field_128,
                };
                return payload;
            } catch (e) {
                console.log(e);
            }
            return false;
        };
        var fmJobFormat = (recbody) => {
            try {
                if(!recbody.field_14) return false;
                if(!recbody.field_137) return false;
                let payload = {
                    "JobNumber": recbody.field_137, //Job Number
                    "CustomerNumber": recbody.field_136, //Customer Number
                    "JobAutoID": ""+recbody.field_14, //Knack AutoIncrement
                    "ClientName": recbody.field_24? recbody.field_24_raw[0].identifier : "", //Client Name
                    "Description": recbody.field_22, //Description
                    "SiteAddress": recbody.field_21, //Site Address <<<
                    "InfoSummary": recbody.field_103, //Info Summary
                };
                return payload;
            } catch (e) {
                console.log(e);
            }
            return false;
        };

        // server.route({
        //     method: 'GET',
        //     path: '/testAuth',
        //     config: {
        //         handler: async function (request) {
        //           console.log("Endpoint Here");
        //
        //             return 'test';
        //         },
        //         pre: [
        //           { method: KnackAuth.authenticate_knack}
        //         ]
        //     }
        //
        // });


    }
};
