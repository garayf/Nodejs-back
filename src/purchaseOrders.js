const { KnackApi } = require("../api");
const createOrUpdateRecords = require("../api/appenate");

const COMPANY_ID = 61652;
const API_KEY = "9cb87d8323364acab09a696e1a28c26b";

async function purchaseOrders(payload) {
  if (typeof payload !== "object") {
    return {
      status: 400,
      message: "Issue creating purchase order.",
      payload: payload,
    };
  }

  const data = payload?.AnswersJson?.page1;

  const { supplierOrSubby, type } = data;

  if (type === "Create") {
    const {
      generatePoNum,
      formatDateRequired,
      supplierId,
      comments,
      assetId,
      subbyOrSupplier,
      table,
      staffId,
      poStatus,
    } = data;

    const linesTable = Array.isArray(table) ? table : table ? [table] : [];
    console.log("CREATING");

    const poCreatePayload = {
      payload: {
        field_202: generatePoNum, // PO #
        field_23: formatDateRequired, // Date Required
        field_24: supplierId, // Supplier
        field_204: assetId, // Asset
        field_203: subbyOrSupplier,
        field_25: comments, // Comments
        field_26: subbyOrSupplier === "Subcontractor" ? "Pending" : poStatus,
        field_37: staffId, // Requested By
      },
    };
    const poCreateRes = await KnackApi.api("POST", 3, poCreatePayload);

    console.log("poCreateRes", poCreateRes);
    // Create Line Items
    let formattedLines = [];
    if (linesTable.length) {
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
    }

    if (formattedLines.length) {
      const linesRes = await KnackApi.bulk("POST", 6, formattedLines);
      console.log("RES:", linesRes);

      formatAppenatePayload(poCreateRes, linesRes);
    }
  } else if (type === "Collect") {
    console.log("COLLECTING");

    if (supplierOrSubby === "Subcontractor") {
      const subComments = data?.subComments;
      const subPrice = data?.subPrice;

      const subData = {
        id: data.poId,
        payload: {
          field_230: data.podId,
          field_229: supplierId,
          field_226: subComments,
          field_228: subPrice,
        },
      };

      await KnackApi.api("PUT", 20, subData);
    } else {
      const { poId, table, sumCompletedItems, countAvailableItems, docketURL } =
        data;
      const linesTable = Array.isArray(table) ? table : table ? [table] : "";

      // If all items have been completed, update po status to
      if (Number(sumCompletedItems) === Number(countAvailableItems)) {
        const poStatusUpdate = await KnackApi.api("PUT", 3, {
          id: poId,
          payload: {
            field_26: "Collected", // Po Status
          },
        });
        console.log("poStatusUpdate: ", poStatusUpdate);
      }

      let formattedLines = [];
      linesTable.map((line) => {
        const payload = {
          field_44:
            line?.collectedQ === "Yes" ? "Collected" : "Partially Collected",
          field_46:
            line?.collectedQ === "Yes" ? line?.qtyOrdered : line?.qtyCollected,
        };
        console.log("PAYLOAD", payload);
        formattedLines.push({
          id: line?.poItemId,
          ...payload,
        });
      });

      const result = await KnackApi.bulk("PUT", 6, formattedLines);
      console.log("UPDATING LINES", result);

      // Update Docket Photo
      await KnackApi.api("POST", 18, {
        payload: {
          field_209: poId,
          field_212: {
            filename: "po_docket",
            url: docketURL,
          },
        },
      });
    }
  }
}

module.exports = purchaseOrders;

async function formatAppenatePayload(poPayload, linesRes) {
  let poTableData = [];
  if (poPayload?.id) {
    poTableData.push([
      poPayload?.id, // Knack ID
      poPayload?.field_202, // PO #
      getId(poPayload?.field_204_raw) || "", // Asset Id
      getId(poPayload?.field_24_raw) || "", // Supplier ID
      poPayload?.field_25 || "", // Comments
      poPayload?.field_23 || "", // Date required
      poPayload?.field_203 || "", // Supplier / Subcontractor
      poPayload?.field_26, // Status
    ]);
  }

  const lines = linesRes?.success;
  console.log("PO ITEM RESULTS", lines);
  let linesPayload = [];
  if (lines) {
    lines.map((line) => {
      linesPayload.push([
        line?.id, // id
        getIdentifier(line.field_43_raw) || "", // Stock
        getId(line.field_43_raw), // Stock id
        getId(line.field_47_raw) || "", // Po Id
        line?.field_45 || "", // qty ordered
        line?.field_46 || "", // qty collected
        line?.field_205 || "", // comments
        line?.field_44 || "", // status
      ]);
    });
  }

  console.log("poTableData", poTableData);
  console.log("linesPayload", linesPayload);

  await createOrUpdateRecords(
    "60428066-7baf-4c14-990e-adb800098094",
    poTableData,
    API_KEY,
    COMPANY_ID
  );

  await createOrUpdateRecords(
    "5e03dc7e-5b16-405c-9721-adb80009a558",
    linesPayload,
    API_KEY,
    COMPANY_ID
  );
}

function getId(field) {
  return Array.isArray(field) && field.length > 0 ? field[0].id : "";
}

function getIdentifier(field) {
  return Array.isArray(field) && field.length > 0 ? field[0].identifier : "";
}
