const { KnackApi } = require("../api");

async function assetMaintenance(payload) {
  if (typeof payload !== "object") {
    return {
      status: 400,
      message: "Issue creating purchase order.",
      payload: payload,
    };
  }

  const data = payload?.AnswersJson?.page1;
  const { staffId, assetId, workDoneTable, partsUsedTable, updateAssetStatus } =
    data;

  const workTable = Array.isArray(workDoneTable)
    ? workDoneTable
    : workDoneTable
    ? [workDoneTable]
    : [];

  const partsTable = Array.isArray(partsUsedTable)
    ? partsUsedTable
    : partsUsedTable
    ? [partsUsedTable]
    : [];

  let formattedStatusLines = [];
  let formattedWorkLines = [];
  if (workTable.length) {
    workTable.map(async (line) => {
      const data = {
        id: line.issueId,
        field_164: line.resolvedStatus,
      }

      formattedStatusLines.push(data);

      formattedWorkLines.push({
        field_185: line.issueId, // Issue Id
        field_135: assetId, // Asset Job
        field_133: staffId, // Staff
        field_186: line.workDone ? String(line.workDone) : "", // Work Done
        field_187: line.hoursSpent || 0,
        field_188: line.photoUrl || "",
        field_189: line.comments || "",
      });
    });
  }

  let formattedPartLines = [];
  if (partsTable.length) {
    partsTable.map((line) => {
      formattedPartLines.push({
        field_184: line.issueId2, // Issue Id
        field_130: assetId, // Asset Job
        field_109: line.partID, // Stock
        field_123: staffId, // Created By
        field_113: line.quantityUsed, // Quantity Used
        field_213: line.partComments, // Comments
        field_111: line.stockBuyValue,
        field_112: line.stockSellValue,
      });
    });
  }

  try {
    if (formattedWorkLines.length) {
      const worklinesRes = await KnackApi.bulk("POST", 13, formattedWorkLines);
      console.log("worklinesRes >>>>>> ", worklinesRes);
    }

    if (formattedPartLines.length) {
      const partslinesRes = await KnackApi.bulk("POST", 11, formattedPartLines);
      console.log("partslinesRes >>>> ", partslinesRes);
    }

    console.log("formattedStatusLines >>>>>>> ", formattedStatusLines);
    if (formattedStatusLines.length) {
      console.log("formattedStatusLines LENGTH", formattedStatusLines.length);
      const statuslinesRes = await KnackApi.bulk(
        "PUT",
        16,
        formattedStatusLines
      );
      console.log("statuslinesRes >>>> ", statuslinesRes);
    }

    if(updateAssetStatus === 'Resolved') {
      const statusData = {
        id: assetId,
        payload: {
          field_96: "Yes"
        },
      };
      console.log("statusData", statusData);
      const statusRes = await KnackApi.api("PUT", 9, statusData)

      console.log("statusRes >>>>>", statusRes);
    }

    if(data.assetStatusId) {
      // Update asset status
      const statusData = {
        id: data.assetStatusId,
        payload: {
          field: data.assetStatus,
        },
      };

      const assetStatusRes = await KnackApi.api("PUT", 10, statusData);

      console.log("assetStatusRes", assetStatusRes);
    }

  } catch (err) {
    console.log("ERROR: ", err);
  }
}

module.exports = assetMaintenance;
