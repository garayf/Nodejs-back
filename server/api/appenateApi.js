'use strict';
// Load modules

const Fs = require('fs');
const Path = require('path');
const Os = require('os');
const Boom = require('boom');
const Request = require('promise-request-retry');
const Axios = require('axios').default;
// let newpath =  Path.resolve( __dirname, "./plugin/axiosFormatize.js" )
// console.log(newpath);
// const AxiosFM = require(newpath);
const Moment= require('moment');
const { Console } = require('console');
const { partial } = require('lodash');

exports.plugin = {
    name: 'appenateApi',
    register: function (server) {
        const {
            Knack,
            KnackAuth
        } = server.plugins;
        const KNACK_OBJECTS_IDS = Knack.objects();
        const knackBaseUrl = 'https://api.knack.com/v1/';
        const builderTimezone = "Pacific/Auckland";

        const AxiosAPNT = Axios.create({
            // baseURL: 'https://secure.appenate.com/api/v2/',
            baseURL: 'https://secure-au.appenate.com/api/v2/',
            // timeout: 1000,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }
        });

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

        async function deleteRecordOnAPNT(formatType, recordsList){
            if(!formatType) return false;
            // if(!recordsList) return false;

            let datasourceID="";
            switch (formatType) {
              case "knack_fileviewer": datasourceID = process.env.APNT_Files_dsID; break;
              default: return false; break;
            }

            let delArray = [];
            try {
                let apntTableInfo = await getFromAPNT({
                    "Id": datasourceID,
                    "ReturnRows": true,
                    // "ExternalId": formatType,
                });
                if(apntTableInfo.TotalRows == 0) return false;
                // console.log(apntTableInfo.ExternalId,apntTableInfo.TotalRows);
                for (var knRecord of recordsList) {
                    // console.log(knRecord);
                    let found = apntTableInfo.Rows.find(apntRow => apntRow[0]==knRecord.id);
                    if(found) delArray.push(found[0]);
                }
                console.log("To delete: ", delArray);
            } catch (e) {
                console.log(e);
                return false;
            }
            if(delArray.length == 0) return true;

            try {
                let delResponse = await postToAPNT({
                    "Id": datasourceID,
                    "DeletedRows": delArray
                });
                return true;
            } catch (e) {
                console.log(e);
            }

            return false;
        };

        async function updateAPNTdataSource(formatType, recordsList, stage){
            if(!formatType) return false;

            var datasourceID="", knackObj="", sFilters=[];
            if (formatType=="Asset_maintenance_form"){
                knackObj = KNACK_OBJECTS_IDS.AssetsJobs;
                datasourceID = process.env.ASSETJOBS;
            }else if(formatType=="Asset_Issues_Update"){
                knackObj = KNACK_OBJECTS_IDS.AssetIssues;
                datasourceID = process.env.ASSETISSUES;
            } 


            var knackRecords="";
            // console.log(recordsList);
            if(recordsList)
                knackRecords = recordsList;
            else {
                try {
                    knackRecords = await Knack.getAllRecords(1,sFilters,knackObj);
                    // if(formatType=="am_notes") knackRecords = knackRecords.slice(0,5);
                } catch (e) {
                    console.log(e);
                }
            }

            //console.log(knackRecords.length);
            if(knackRecords.length == 0) return false;
            let formatForAPNT=[];
            if(formatType=="amiConcatNotes"){
                formatForAPNT = await ApntAmiConcatNotesFormat(knackRecords);
            }else{
                formatForAPNT = ConvertRecordsFormat_APNT(formatType, knackRecords);
            }
            console.log(formatForAPNT.length);
            if(formatForAPNT.length == 0) return false;
            // return formatForAPNT;
            //console.log(formatForAPNT);
            console.log("updateApenate")
            try {
                postToAPNT({
                    // "CompanyId": process.env.APPENATE_COMPANY_ID,
                    // "IntegrationKey": process.env.APPENATE_INTEGRATION_KEY,
                    "Id": datasourceID,
                    "NewRows": formatForAPNT
                });
            } catch (e) {
                console.log(e);
            }

        };

        function postToAPNT(postData){
            return new Promise( async (resolve,reject) =>  {
                console.log("Updating datasource...");
                AxiosAPNT.put("datasource/", {
                    ...postData,
                    "CompanyId": process.env.APPENATE_COMPANY_ID,
                    "IntegrationKey": process.env.APPENATE_INTEGRATION_KEY,
                    // "Id": datasourceID,
                    // "NewRows": formatForAPNT
                })
                .then(function(response){
                    console.log("Res Status: "+response.status+"-"+response.statusText);
                    resolve(response);
                })
                .catch(function(error){
                    console.log(error);
                    reject(error);
                });
            });
        };

        function getFromAPNT(getData){
            if(!getData) return false;
            return new Promise( async (resolve,reject) =>  {
              console.log("Getting records...");
                let getURLext = `?CompanyId=${process.env.APPENATE_COMPANY_ID}&IntegrationKey=${process.env.APPENATE_INTEGRATION_KEY}`;
                getURLext+=`&Id=${getData.Id}&ReturnRows=${getData.ReturnRows || false}`;
                if(getData.ExternalId) getURLext+=`&ExternalId=${getData.ExternalId}`;
                // console.log(getURLext);
                AxiosAPNT.get("datasource"+getURLext)
                .then(function(response){
                    console.log("Res Status: "+response.status+"-"+response.statusText);
                    resolve(response.data.DataSource);
                })
                .catch(function(error){
                    let {status, statusText, headers, config, data} = error.response;
                    console.log(data);
                    // console.log(data.ResponseStatus.Errors);
                    reject(data);
                });
            });
        };

        var ConvertRecordsFormat_APNT = (recordType, knackRecords) => {
            let newRecords = [];
            let convertRecord = false;
            switch (recordType) {
                case "Asset_maintenance_form": convertRecord = apntAssetJobs; break;
                case "Asset_Issues_Update": convertRecord = apntAssetIssues; break;
                
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

        var apntAssetJobs = (recbody) => {
            //console.log(recbody);
            try {
                let payload = {
                    "KnackID": recbody.id,
                    "Job Id": recbody.field_180,
                    "Asset ID": recbody.field_93_raw[0].id,
                    "Display": recbody.field_181,
                    "Issue Count": recbody.field_182,
                    "Assigned To": "",
                    "Description": recbody.field_194,
                    "Status": recbody.field_95,
                    "Maintenance Status": "Stopped",
                };
                return Object.values(payload);
                // return payload;
            } catch (e) {
                console.log(e);
            }
            return false;
        };

        var apntAssetIssues = (recbody) => {
            //console.log(recbody);
            try {
                let payload = {
                    "KnackID": recbody.id,
                    "Issue": recbody.field_162,
                    "Asset Job ID": recbody.field_161_raw[0].id,
                    "Assigned To":  recbody.field_165_raw[0].id,                   
                    "Issue Status": recbody.field_163,
                    "Status": recbody.field_164,
                    "Issue Logs": recbody.field_194                    
                };
                return Object.values(payload);
                // return payload;
            } catch (e) {
                console.log(e);
            }
            return false;
        };

        var parsePageFormat = (jsonObj) => {
            let objArray = Object.entries(jsonObj);
            let newObj = {};
            for (var pair of objArray) {
                let attrVal = pair[1] === null? "" : pair[1];
                if(typeof pair[1] =="string"){
                    pair[1] = pair[1].replace(/\r?\n|\r/g, ".");
                }
                if(pair[1] == null) pair[1] = "";

                newObj[ pair[0] ] = pair[1];
            }
            return newObj;
        };

        var getFormFields = (formPayload) =>{
            let {AnswersJson, ...formData}=formPayload;
            let pages = Object.keys(AnswersJson).map(iKey => {return AnswersJson[iKey];});
            // console.log("PAGES: ", pages);
            for (var page of pages) {
                let parsedObj = parsePageFormat(page);
                formData = {...formData, ...parsedObj};
            }
            return formData;
        }

        var knackBehaviorSelection = (formType) => {
            switch (formType) {
                case "Asset_maintenance_form": return updateMaintenance;
                case "Create_jobs_form": return createJob;
                case "Create_issues_form": return takeIssues;                
            }
            return false;
        };
        
        async function executeKnackBehavior(formPayload){
            let fieldsData;
            let formType = "";
            if(formPayload.Entry) {
                console.log("Received normal APNT request");
                fieldsData = getFormFields(formPayload.Entry);
                formType = fieldsData.FormCode;
            }
            

            //console.log(fieldsData);
            //console.log("FormID: ", formType);
            // return false;
            
            if(formType){
                let executeFN = knackBehaviorSelection(formType);
                console.log(executeFN);
                if (!executeFN) {
                    return console.log("KnackBehavior not found.");
                }
                let result = await executeFN(formPayload, fieldsData, formType);
                console.log(result);                
            }else return console.log("Form not recognized.");
            
        };

        //*********************** */
        //knackBehavior Functions
        //*********************** */

        var createJob = async (formPayload, formData, formType) => {
            //console.log(formData);
            let knacksend = {
                method: 'POST',
                uri: knackBaseUrl+'scenes/scene_88/views/view_164/records/',
                form: {
                    field_93: formData.assetSelect,
                    //field_194: formData.description,
                }
            };       
            try {
                var res = await sendKnackViewRequest(knacksend);
                var jsonRes = JSON.parse( res.replace(/\r?\n|\r/g, "."))
                //console.log(jsonRes.record.id);

            } catch (e) {
                console.log(e);
            }  
            takeIssues(jsonRes.record.id,formData)
            updateAPNTdataSource("Asset_maintenance_form");            
        }

        var takeIssues2 = async (formData) => {
            console.log("issues");            
            if(formData.countNewIssues > 1){                    
                for (var i = 0 ; i < formData.countNewIssues ; i++){                        
                    createIssues2(formData,formData.newIssue[i]);
                }                    
            }else if(formData.countNewIssues == 1){
                createIssues2(formData,formData.newIssue);
            }            
        }

        var createIssues2 = async (formData,partialData) => {
            console.log(partialData);
            let knacksend = {
                method: 'POST',
                uri: knackBaseUrl+'scenes/scene_95/views/view_182/records/',
                form: {                    
                    "field_254": formData.assetDb,//asset
                    "field_161": formData.assetSelected, //Assetjob                         
                    "field_162": partialData.issueDescription, // description 
                    "field_163": partialData.status, // status
                    "field_165": formData.staffId, //asigned to  
                    "field_252": partialData.workDoneNI,//work done
                    "field_253": partialData.commentsNI,//comments
                    "field_164": partialData.resolvedStatusNI
                }
            };       
            try {            
                await sendKnackViewRequest(knacksend);                
            } catch (e) {
                console.log(e);
            }              
           
            updateAPNTdataSource("Asset_Issues_Update"); 
        }


        var takeIssues = async (jobID, formData) => {
            createIssues(formData,formData,jobID)
            /*
            if(formData.countIssues > 1){                    
                for (var i = 0 ; i < formData.countIssues ; i++){                        
                    createIssues(formData,formData.issues[i],jobID);
                }                    
            }else if(formData.countIssues == 1){
                createIssues(formData,formData.issues,jobID);
            }            
            */
        }

        var createIssues = async (formData,partialData,jobID) => {
            console.log(partialData);
            let knacksend = {
                method: 'POST',
                uri: knackBaseUrl+'scenes/scene_95/views/view_182/records/',
                form: {                    
                    "field_254": formData.assetSelect,//asset
                    "field_161": jobID, //Assetjob                         
                    "field_162": partialData.issueDescription, // description 
                    "field_163": partialData.status, // status
                    //"field_165": partialData.asignedTo //asigned to  
                }
            };       
            try {
                await sendKnackViewRequest(knacksend);                
            } catch (e) {
                console.log(e);
            }              
           
            updateAPNTdataSource("Asset_Issues_Update"); 
        }
        var updateMaintenance = async (formPayload, formData, formType) => {
            let knackRecordsAssetRecords = await Knack.getAllRecords(1,[],KNACK_OBJECTS_IDS.AssetsJobs);
            //console.log(staffID)    
            let replyBody = {status:"FAILED", error:null};      
            
            if (formData.start){
                var foundID = knackRecordsAssetRecords.find(kr =>                
                    formData.assetSelect == kr.id
                );    
                var knackPayload = {
                    "field_240": "In Progress",
                    "field_241": formData.staffId
                }
                createMaintenance("", formData,"");                
            }else{     

                takeIssues2(formData);    
                updateAPNTdataSource("Asset_maintenance_form");          
                updateMaintenancehours("", formData,"");    
                updateAssets("", formData,"");  
                
                                              
               
                
                if(formData.CountParts > 1){                    
                    for (var i = 0 ; i < formData.CountParts ; i++){                        
                        createMaintenancePart(formData,formData.partsUsedTable[i]);
                    }                    
                }else if(formData.CountParts == 1){
                    createMaintenancePart(formData,formData.partsUsedTable);
                } 

                if(formData.countAllCompletedItems > 1){                    
                    for (var i = 0 ; i < formData.countAllCompletedItems ; i++){                        
                        updateAssetIssues(formData,formData.workDoneTable[i]);
                    }                    
                }else if(formData.countAllCompletedItems == 1){
                    updateAssetIssues(formData,formData.workDoneTable);
                } 

                var foundID = knackRecordsAssetRecords.find(kr =>                
                    formData.assetSelected == kr.id
                );    
                var knackPayload = {
                    "field_240": "Stopped",                    
                    "field_95": formData.assetStatus
                }
            }
            //console.log(knackPayload)
            
            try {
                let knackCreate = await Knack.update({
                    objectKey: KNACK_OBJECTS_IDS.AssetsJobs,
                    id: foundID.id,
                    body: knackPayload
                })
                console.log("knack result");
                replyBody.status="SUCCESS"
            } catch (e) {
                console.log(e.error);
                console.log("Unexpected error updating record on database.")
            }                 
            
            return replyBody

        }

        //*********************** */
        //knackBehavior Extra Functions
        //*********************** */

        var createMaintenancePart = async (formData,part ) => {
            //let numberOfParts = formData.partsUsedTable   
            var knackPayload = {
                "field_124": formData.CompleteTime,//date
                "field_130": formData.assetSelected, //Assetjob         
                "field_109": part.stockDB, // stock   
                "field_111": part.stockBuyValue,
                "field_112": part.stockSellValue,    
                "field_113": part.quantityUsed       
            }            
            try {
                let knackCreate = await Knack.create({
                    objectKey: KNACK_OBJECTS_IDS.MaintenanceParts,     
                    body: knackPayload,
                })
                //console.log("knack result parts");    
                //console.log(knackPayload);           
            } catch (e) {
                console.log(e.error);
                console.log("Unexpected error updating record parts on database.")
            }            
        }

        var updateAssetIssues = async (total, partialData) => {
            let knackRecordsIssues = await Knack.getAllRecords(1,[],KNACK_OBJECTS_IDS.AssetIssues);
            var foundID = knackRecordsIssues.find(kr =>              
                partialData.assetIssue == kr.id          
            );                 
            var knackPayload = {
                //"field_163": total.assetStatus,//status
                "field_164": partialData.resolvedStatus, //Resolved  
                "field_165": total.staffId, //Asigned to      
                "field_252": partialData.workDone,// work done
                "field_253": partialData.comments// comments
            }            
            console.log(knackPayload);  
            //console.log(foundID.id);

            try {
                let knackCreate = await Knack.update({
                    objectKey: KNACK_OBJECTS_IDS.AssetIssues,
                    id: foundID.id,      
                    body: knackPayload,
                })
                console.log("knack result Assets issues");   
            } catch (e) {
                console.log(e.error);
                console.log("Unexpected error updating record assets issues on database.")
            }    
            //updateAPNTdataSource("")                      
        }

        var createMaintenance = async (formPayload, formData, formType) => {
            //let knackRecordsAssetRecords = await Knack.getAllRecords(1,[],KNACK_OBJECTS_IDS.MaintenanceHours);
            var knackPayload = {
                "field_190": formData.CompleteTime,
                "field_135": formData.assetSelect,                
                "field_133": formData.staffId,
                "field_186": "",
                "field_188": "",
                "field_243": formData.final_start_time,
                "field_244": "",     
            }
            try {
                let knackCreate = await Knack.create({
                    objectKey: KNACK_OBJECTS_IDS.MaintenanceHours,     
                    body: knackPayload,
                })
                //console.log("knack result");               
            } catch (e) {
                console.log(e.error);
                console.log("Unexpected error updating record on database.")
            }            
            return true
        }

        var updateAssets = async (formPayload, formData, formType) => {            
            let knackPayload = {
                "field_89": (formData.assetStatus=='Resolved')?'Operational':formData.assetStatus
            }
            let knackRecordsAssets = await Knack.getAllRecords(1,[],KNACK_OBJECTS_IDS.Assets);            
            //console.log("payload");
            //console.log(knackPayload);
            //console.log("asset selected") 
            //console.log(formData.assetSelected);

            var foundID = knackRecordsAssets.find(kr =>              
                formData.assetDb == kr.id         
            );  
            
            //console.log(foundID)       
            try {
                let knackCreate = await Knack.update({
                    objectKey: KNACK_OBJECTS_IDS.Assets,
                    id: foundID.id,
                    body: knackPayload
                })
                console.log("knack result");
            } catch (e) {
                console.log(e.error);
                console.log("Unexpected error updating record on database.")
            }           
            
        }

        var updateMaintenancehours = async (formPayload, formData, formType) => {
            let knackRecordsMaintenance = await Knack.getAllRecords(1,[],KNACK_OBJECTS_IDS.MaintenanceHours);

            var foundID = knackRecordsMaintenance.find(kr => {
                if (kr.field_135){
                    return formData.assetSelected == kr.field_135_raw[0].id && kr.field_244 == ""          
                }else return false;                      
            });    

            //console.log(foundID)
           
            var knackPayload = {                
                "field_244": formData.untitled61,     
            }
            try {
                let knackCreate = await Knack.update({
                    objectKey: KNACK_OBJECTS_IDS.MaintenanceHours,    
                    id: foundID.id,                
                    body: knackPayload,
                })
                //console.log("knack result update");
                //console.log(foundID.id)
                //console.log(knackPayload)
            } catch (e) {
                console.log(e.error);
                console.log("Unexpected error updating final time record on database.")
            }            
            return true
        }
       
        //*********************** */
        //Utility Functions
        //*********************** */  

        var removeEmptyFields = (obj) => {
            // ES10/ES2019 version doesn't work on Node v10.16.0
            // return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null && v != ""));
            return Object.entries(obj)
              .filter(([_, v]) => v != null && v != "")
              .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
        };

        const GetNumericValue = (numVal) =>{
            // If empty string, will treat as 0. Must validate empty in different function.
            if(!numVal) numVal = 0;
            return isNaN(numVal)? null : numVal = parseFloat(numVal);
        }           

        // ***********
        // ENDPOINTS
        // ***********

        server.route({
            method: 'POST',
            path: '/captureFileConnector',
            handler: async function (request, h) {

                let formPayload = request.payload;
                if(!formPayload.Entry) return false;
                let fieldsData = getFormFields(formPayload.Entry);
                let dataStr = JSON.stringify(fieldsData);

                return {jsonStr: dataStr};
            }
        });
        
        server.route({
            method: 'POST',
            path: '/captureFormsAPNT',
            handler: async function (request, h) {
                let formPayload = request.payload;
                // if(!formPayload.Entry) return false;
                //console.log(formPayload);
                executeKnackBehavior(formPayload);
                return formPayload;
            }
        });      
            
        server.route({
            method: 'GET',
            path: '/test',
            handler: async function (request, h) {
                //console.log("Endpoint Here");
                //console.log(KNACK_OBJECTS_IDS)
                updateAssets("timesheetsDB");
                return "Ok";
            }
        });

        
    }
};
