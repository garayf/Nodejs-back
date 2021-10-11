const { API } = require("../api");
const createOrUpdateRecords = require("../api/appenate");

const COMPANY_ID = 61542;
const API_KEY = "1cf8b09d6ad242099fa67a76c8e864fa";

async function purchaseOrders(payload) {
  if (typeof payload !== "object") {
    return {
      status: 400,
      message: "Issue creating timesheet.",
      payload: payload,
    };
  }

  const data = payload?.AnswersJson?.page1;

  const { type } = data;

  if (type === "Create") {
    const {
      generatePoNum,
      formatDateRequired,
      supplierId,
      jobId,
      poValue,
      purchaseReason,
      docketURL,
      table,
      staffId,
    } = data;

    const linesTable = Array.isArray(table) ? table : table ? [table] : "";
    console.log("CREATING");

    const poCreatePayload = {
      payload: {
        field_152: generatePoNum, // PO #
        field_153: formatDateRequired, // Date Required
        field_154: supplierId, // Supplier
        field_163: jobId, // Job
        field_155: purchaseReason, // Notes
        field_174: docketURL,
        field_156:
          poValue === "Yes" ? "Pending Approval" : "Pending Collection", // Status
        field_157: staffId, // Requested By
      },
    };
    const poCreateRes = await API.api("POST", 19, poCreatePayload);

    console.log("poCreateRes", poCreateRes);
    // Create Line Items
    let formattedLines = [];
    linesTable.map(async (line) => {
      formattedLines.push({
        field_150: line.stockItem, // Stock
        field_164: line.stockQty, // Quantity
        field_175: line.stockComments, // Comments
        field_162: poCreateRes?.id, // Purchase Order
        field_161: line.awaitingOrRecieved, // Status
      });
    });

    const linesRes = await API.bulk("POST", 20, formattedLines);
    console.log("RES:", linesRes);

    formatAppenatePayload(poCreateRes, linesRes);
  } else if (type === "Collect") {
    console.log("COLLECTING");
    const { poId, table, sumCompletedItems, countAvailableItems, docketURL } =
      data;

    const linesTable = Array.isArray(table) ? table : table ? [table] : "";

    // If all items have been completed, update po status to
    if (Number(sumCompletedItems) === Number(countAvailableItems)) {
      const poStatusUpdate = await API.api("PUT", 19, {
        id: poId,
        payload: {
          field_156: "Collected", // Po Status
        },
      });
      console.log("poStatusUpdate: ", poStatusUpdate);
    }

    let formattedLines = [];
    linesTable.map((line) => {
      const payload = {
        field_161:
          line?.collectedQ === "Yes" ? "Collected" : "Partially Collected",
        field_177:
          line?.collectedQ === "Yes" ? line?.qtyOrdered : line?.qtyCollected,
      };
      console.log("PAYLOAD", payload);
      formattedLines.push({
        id: line?.poItemId,
        ...payload,
      });
    });

    const result = await API.bulk("PUT", 20, formattedLines);
    console.log("UPDATING LINES", result);

    // Update Docket Photo
    await API.api("POST", 22, {
      payload: {
        field_179: poId,
        field_182: {
          filename: "po_docket",
          url: docketURL,
        },
      },
    });
  }
}

module.exports = purchaseOrders;

async function formatAppenatePayload(poPayload, linesRes) {
  let poTableData = [];
  if (poPayload?.id) {
    poTableData.push([
      poPayload?.id, // Knack ID
      poPayload?.field_152, // PO #
      getId(poPayload?.field_163_raw), // Job ID
      getId(poPayload?.field_154_raw), // Supplier ID
      poPayload?.field_155, // Comments
      poPayload?.field_153, // Date required
      poPayload?.field_156, // Status
    ]);
  }

  const lines = linesRes?.success;
  console.log("PO ITEM RESULTS", lines);
  let linesPayload = [];
  if (lines) {
    lines.map((line) => {
      linesPayload.push([
        line?.id,
        line?.field_150,
        poPayload?.id,
        line?.field_164,
        line?.field_161,
      ]);
    });
  }

  console.log("poTableData", poTableData);
  console.log("linesPayload", linesPayload);

  await createOrUpdateRecords(
    "1d713cb4-855c-47a3-821a-ad8f018ae213",
    poTableData,
    API_KEY,
    COMPANY_ID
  );

  await createOrUpdateRecords(
    "41b40aed-da99-4919-922d-ad8f018b5231",
    linesPayload,
    API_KEY,
    COMPANY_ID
  );
}

function getId(field) {
  return Array.isArray(field) && field.length > 0 ? field[0].id : "";
}
