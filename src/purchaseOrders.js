const { API } = require("../api");
const createOrUpdateRecords = require("../api/appenate");

const COMPANY_ID = 61542;
const API_KEY = "1cf8b09d6ad242099fa67a76c8e864fa";

async function purchaseOrders(payload) {
  if (typeof payload !== "object") {
    return {
      status: 400,
      message: "Issue creating purchase order.",
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
      comments,
      assetId,
      table,
      staffId,
    } = data;

    const linesTable = Array.isArray(table) ? table : table ? [table] : "";
    console.log("CREATING");

    const poCreatePayload = {
      payload: {
        field_202: generatePoNum, // PO #
        field_23: formatDateRequired, // Date Required
        field_24: supplierId, // Supplier
        field_204: assetId, // Asset
        field_25: comments, // Comments
        field_37: staffId, // Requested By
      },
    };
    const poCreateRes = await API.api("POST", 3, poCreatePayload);

    console.log("poCreateRes", poCreateRes);
    // Create Line Items
    let formattedLines = [];
    linesTable.map(async (line) => {
      formattedLines.push({
        field_43: line.stockId, // Stock
        field_45: line.stockQty, // Quantity
        field_48: line.buyRate, // Buy rate
        field_49: line.sellRate, // Buy rate
        field_205: line.stockComments, // Comments
        field_45: line.quantityOrdered,
        field_46: line.quantityCollected,
        field_47: poCreateRes?.id, // Purchase Order
        field_44: line.awaitingOrRecieved, // Status
      });
    });

    const linesRes = await API.bulk("POST", 6, formattedLines);
    console.log("RES:", linesRes);

    formatAppenatePayload(poCreateRes, linesRes);
  } // else if (type === "Collect") {
  //   console.log("COLLECTING");
  //   const { poId, table, sumCompletedItems, countAvailableItems, docketURL } =
  //     data;

  //   const linesTable = Array.isArray(table) ? table : table ? [table] : "";

  //   // If all items have been completed, update po status to
  //   if (Number(sumCompletedItems) === Number(countAvailableItems)) {
  //     const poStatusUpdate = await API.api("PUT", 19, {
  //       id: poId,
  //       payload: {
  //         field_156: "Collected", // Po Status
  //       },
  //     });
  //     console.log("poStatusUpdate: ", poStatusUpdate);
  //   }

  //   let formattedLines = [];
  //   linesTable.map((line) => {
  //     const payload = {
  //       field_161:
  //         line?.collectedQ === "Yes" ? "Collected" : "Partially Collected",
  //       field_177:
  //         line?.collectedQ === "Yes" ? line?.qtyOrdered : line?.qtyCollected,
  //     };
  //     console.log("PAYLOAD", payload);
  //     formattedLines.push({
  //       id: line?.poItemId,
  //       ...payload,
  //     });
  //   });

  //   const result = await API.bulk("PUT", 20, formattedLines);
  //   console.log("UPDATING LINES", result);

  //   // Update Docket Photo
  //   await API.api("POST", 22, {
  //     payload: {
  //       field_179: poId,
  //       field_182: {
  //         filename: "po_docket",
  //         url: docketURL,
  //       },
  //     },
  //   });
  // }
}

module.exports = purchaseOrders;

async function formatAppenatePayload(poPayload, linesRes) {
  let poTableData = [];
  if (poPayload?.id) {
    poTableData.push([
      poPayload?.id, // Knack ID
      poPayload?.field_202, // PO #
      getId(poPayload?.field_204_raw), // Asset Id
      getId(poPayload?.field_24_raw), // Supplier ID
      poPayload?.field_25, // Comments
      poPayload?.field_23, // Date required
      poPayload?.field_203, // Supplier / Subcontractor
      poPayload?.field_26, // Status
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
