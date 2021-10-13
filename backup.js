const pageRendered = $.Deferred();
let openPoItemsMenu = true;
let globalPoID = "";
let __globalSupplierId = ""
// let displayToast = false;

$(document).on("knack-view-render.any", function (event, scene) {
  $(".kn-modal-bg").off("click");
});

$(document).on("knack-scene-render.any", function (event, page) {
  // Returns that the page has finished loading.
  pageRendered.resolve(event, page);
});

KnackInitAsync = function ($, callback) {
  window.$ = $;
  LazyLoad.js(
    [
      "https://unpkg.com/htm@2.2.1",
      "https://unpkg.com/react@17/umd/react.production.min.js",
      "https://unpkg.com/react-dom@17/umd/react-dom.production.min.js",
      "https://knack-server.herokuapp.com/lib",
    ],
    function () {
      const { createContext, useState, useEffect, useRef } = React;
      window.KnackApi = new lib.utils.KnackApi(
        "6109af925a5ef5001eef4787",
        "5d3b2f08-3582-4d1f-bfd1-4390002e4856"
      );
      window.html = htm.bind(React.createElement); // Bind htm to a global variable

      window.Components = {
        ToggleSwitch,
        ToastNotification,
        SectionHeader,
        CurrentAssetWorkedOn,
        Toggle,
        StatCard,
      };

      function ToggleSwitch({ text }) {
        const [toggle, setToggle] = useState(true);
        useEffect(() => {
          openPoItemsMenu = toggle;
        }, [toggle]);
        console.log("toggle", toggle);
        return html`
          <div class="toggle-switch_btn">
            <p>${text}</p>
            <label class="switch">
              <input
                onClick=${() => setToggle(!toggle)}
                type="checkbox"
                checked=${toggle}
              />
              <span class="slider round"></span>
            </label>
          </div>
        `;
      }

      function ToastNotification({ heading, content }) {
        return html`
          <div class="toast-wrapper">
            <div class="heading-wrapper">
              <i class="fa fa-check-circle"></i>
              <span class="toast-heading">${heading}</span>
              <div class="close-wrapper">
                <span class="toast-close"><i class="fa fa-close"></i></span>
              </div>
            </div>
            <span class="toast-content">${content}</span>
          </div>
        `;
      }

      function SectionHeader({ heading, navigatePage, btnText }) {
        return html`
          <div class="section-header-wrapper">
            <h1>${heading}</h1>
            <button class="section-edit-btn" onClick=${navigatePage}>
              <i class="fa fa-pencil"></i>
              ${btnText}
            </button>
          </div>
        `;
      }

      function CurrentAssetWorkedOn() {
        return html`
          <div class="current-asset">
            Currently Worked On:
            <span class="icon is-small">
              <i class="fa fa-clock-o"></i>
            </span>
            Ben Little
          </div>
        `;
      }

      function StatCard({ heading, stat }) {
        return html`
          <div class="stat-item">
            <h4 class="stat-heading">${heading}</h4>
            <div class="stat-desc">
              <p>${stat}</p>
            </div>
          </div>
        `;
      }

      function Toggle({ buttons, initView }) {
        const [toggle, setToggle] = useState(initView);

        function toggleDisplay(id) {
          setToggle(id);
          buttons.map((button) => {
            if (Array.isArray(button.id)) {
              button.id.map((item) => {
                if (id.includes(item)) {
                  $(
                    `${item
                      .split(", ")
                      .map((i) => `#${i}`)
                      .join(", ")}`
                  ).show();
                } else {
                  $(
                    `${item
                      .split(", ")
                      .map((i) => `#${i}`)
                      .join(", ")}`
                  ).hide();
                }
              });
            } else {
              if (button.id === id) {
                $(`#${button.id}`).show();
              } else {
                $(`#${button.id}`).hide();
              }
            }
          });
        }
        return html`
          <div class="btn-group">
            ${buttons.map((button) => {
              console.log("BUTTON", button);
              console.log("TOGGLE", toggle);
              let btnClass = "";
              if (Array.isArray(button.id) && !Array.isArray(toggle)) {
                btnClass = button.id.includes(toggle)
                  ? "btn-is-active btn-toggle"
                  : "btn-toggle";
              } else {
                btnClass =
                  button.id === toggle
                    ? "btn-is-active btn-toggle"
                    : "btn-toggle";
              }
              return html`
                <button
                  key=${Array.isArray(button.id)
                    ? button.id.join(",")
                    : button.id}
                  class=${btnClass}
                  onClick=${() => toggleDisplay(button.id)}
                >
                  ${button.name}
                </button>
              `;
            })}
          </div>
        `;
      }
      callback();
    }
  );
};

/*****************************************************
 *
 * PAGE FUNCTIONS
 *
 *****************************************************/

const tableRefreshViews = [
  "knack-record-update.view_29",
  "knack-record-update.view_43",
  "knack-record-update.view_49",

  // Create Views
  "knack-record-create.view_51",
];

// Whenever a record has been updated, this will refresh the table view instead of refreshing the page to display edited data
$(document).on(tableRefreshViews.join(" "), function (event, view, record) {
  console.log("VIEW: ", view.key);
  let count = 0;

  const lookup = {
    // Suppliers
    view_2: "view_1", // Edit Supplier

    // Stock
    view_6: "view_5", // Edit Stock

    // Purchase Orders
    view_13: "view_12", // Edit PO

    // Stock > Add Adjustment
    view_51: "view_21",
  };

  const key = lookup[view.key];
  console.log("LOOKUP: ", key);
  // Prevent circular loop
  if (count === 0) Knack.views[key].model.fetch();
  count++;
});

// $(document).on(
//   "knack-view-render.view_15 knack-view-render.view_27",
//   async function (event, view, data) {
//     const { ToggleSwitch } = Components;
//     openPoItemsMenu = false;
//     globalPoID = "";

//     const toggleText =
//       view.key === "view_15"
//         ? "Check toggle to create purchase order items"
//         : "Check toggle to create another purchase order item";
//     $(`#${view.key} > form > div`).prepend(
//       `<div id="toggleSwitch${view.key}"></div>`
//     );
//     ReactDOM.render(
//       html`<${ToggleSwitch} text=${toggleText} />`,
//       document.querySelector(`#toggleSwitch${view.key}`)
//     );
//   }
// );

$(document).on(
  "knack-record-create.view_15",
  async function (event, view, data) {
    Knack.Navigation.redirectToURL(
      `#purchase-orders/view-purchase-order-details/${data.id}`
    );
  }
);

// $(document).on(
//   "knack-record-create.view_42",
//   async function (event, view, data) {
//     Knack.Navigation.redirectToURL(
//       `rawsons#asset-maintenance/view-asset-maintenance-details/${data.id}`
//     );
//   }
// );

$(document).on(
  "knack-record-create.view_27",
  async function (event, view, data) {
    if (openPoItemsMenu) {
      const url = window.location.href.split("rawsons")[1];
      Knack.closeModal();
      Knack.Navigation.redirectToURL(url);
    }
  }
);

// Updates stock available when stock has been adjusted.
$(document).on(
  "knack-record-create.view_51",
  async function (event, view, record) {
    // console.log("DATA", data)
    showSpinner();
    const stockId = getId(record.field_56_raw);
    console.log({ stockId });
    const data = {
      id: stockId,
    };
    const stockPayload = await KnackApi.api("GET", 2, data);

    console.log("stockPayload", stockPayload);

    const result = await syncDataSource(
      stockFieldMap,
      stockPayload,
      "70f6163e-4b1e-4d77-a3b9-adb7002b3396"
    );
    console.log("UPDATE RES", result);
    hideSpinner();
    closeModalRefresh();
  }
);

// Updated asset job database if a safety issue has been specified.
$(document).on(
  "knack-record-create.view_97",
  async function (event, view, record) {
    // console.log("DATA", data)
    if (record.field_163 === "Safety Issue") {
      showSpinner();
      const assetJob = getId(record.field_161_raw);
      console.log({ assetJob });
      const data = {
        id: assetJob,
      };

      const jobPayload = await KnackApi.api("GET", 9, data);

      console.log("jobPayload", jobPayload);

      const result = await syncDataSource(
        assetJobMap,
        jobPayload,
        "0a3c37c3-fd5e-47e9-9631-adb7015c2a68"
      );
      console.log("UPDATE RES", result);
      hideSpinner();
      closeModalRefresh();
    }
  }
);

$(document).on("knack-view-render.view_38", async function (event, view, data) {
  const { Toggle } = Components;
  const plant = "#view_54";
  const certs = "#view_55";
  const general = "#view_53";
  $(`${general}, ${plant}, ${certs}`).hide();

  const buttons = [
    { id: "view_38", name: "Vehicles" },
    { id: "view_54", name: "Plant" },
    { id: "view_55", name: "Certs" },
    { id: "view_53", name: "General" },
  ];

  $(".view-column.view-column-group-1").append(`<div id="react2"></div>`);
  ReactDOM.render(
    html`<${Toggle} buttons=${buttons} initView="view_38" />`,
    document.querySelector("#react2")
  );
});

// ASSET MAINTENANCE DETAILS
// $(document).on("knack-view-render.view_56", async function (event, view, data) {
//   const { Toggle } = Components;

//   const partMenu = "#view_99";
//   const partTable = "#view_98";
//   const labourMenu = "#view_102";
//   const labourTable = "#view_101";

//   $(`${partMenu}, ${partTable}, ${labourMenu}, ${labourTable}`).hide();

//   const buttons = [
//     { id: ["view_96", "view_94"], name: "Issues" },
//     { id: ["view_99", "view_98"], name: "Parts" },
//     { id: ["view_102", "view_101"], name: "Labour" },
//     { id: ["view_72", "view_73"], name: "Subcontractors" },
//   ];

//   $(".view-column.view-column-group-1").append(
//     `<div id="assetMaintDetails"></div>`
//   );
//   ReactDOM.render(
//     html`<${Toggle} buttons=${buttons} initView="view_96" />`,
//     document.querySelector("#assetMaintDetails")
//   );
// });

// STOCK DETAILS PAGE
$(document).on("knack-view-render.view_21", async function (event, view, data) {
  const { Toggle, StatCard, TwoColumnDetails, DetailSection } = Components;
  const parts = "#view_61";
  const adjustmentMenu = "#view_50";
  const adjustmentTable = "#view_52";

  $(`${parts}, ${adjustmentMenu}, ${adjustmentTable}`).hide();

  const buttons = [
    { id: "view_22", name: "Stock In" },
    { id: "view_61", name: "Stock Out" },
    { id: ["view_50, view_52"], name: "Stock Adjustments" },
  ];

  const available = Number(data.field_105);
  const ordered = Number(data.field_106);
  const collected = Number(data.field_103);

  $(".view-column.view-column-group-1").append(`
    <div id="stockStats"></div>
  `);

  ReactDOM.render(
    html`
      <div class="stat-group">
        <${StatCard}
          heading="Stock Available"
          stat=${available > 0 || available < 0 ? available : 0}
        />
        <${StatCard}
          heading="Stock Ordered"
          stat=${ordered > 0 ? ordered : 0}
        />
        <${StatCard}
          heading="Stock Collected"
          stat=${collected > 0 ? collected : 0}
        />
      </div>
    `,
    document.querySelector("#stockStats")
  );

  $(".view-column.view-column-group-1").append(`<div id="stockDetails"></div>`);
  ReactDOM.render(
    html`<${Toggle} buttons=${buttons} initView="view_22" />`,
    document.querySelector("#stockDetails")
  );
});

// $(document).on("knack-view-render.view_23", async function (event, view, data) {
//   const { Toggle } = Components;
//   const itemsMenu = "#view_26";
//   const itemsTable = "#view_24";
//   const docketsMenu = "#view_31";
//   const docketsTable = "#view_33";

//   $(`${docketsMenu}, ${docketsTable}`).hide();

//   const buttons = [
//     { id: ["view_26, view_24"], name: "PO Items" },
//     { id: ["view_31, view_33"], name: "Dockets" },
//   ];

//   $("#view_23").append(`<div id="poDetails"></div>`);
//   ReactDOM.render(
//     html`<${Toggle} buttons=${buttons} initView="view_23" />`,
//     document.querySelector("#poDetails")
//   );
// });

$(document).on(
  "knack-view-render.view_23",
  async function (event, view, data) {
    __globalSupplierId = getId(data.field_24_raw)
  }
);

$(document).on("knack-view-render.view_27", async function (event, view, data) {
     $("#view_27-field_233").val(__globalSupplierId);
     $("#view_27-field_233").trigger("liszt:updated");
     $("#view_27-field_43").trigger("liszt:updated");

     // $("#kn-input-field_233").hide();
});

$(document).on("knack-view-render.view_40", async function (event, view, data) {
  const { Toggle } = Components;
  const filesMenu = "#view_89";
  const filesTable = "#view_91";

  $(`${filesMenu}, ${filesTable}`).hide();

  const buttons = [
    { id: "view_81", name: "Defects" },
    { id: ["view_89", "view_91"], name: "Files" },
  ];

  $("#view_40").append(`<div id="assetDetails"></div>`);
  ReactDOM.render(
    html`<${Toggle} buttons=${buttons} initView="view_81" />`,
    document.querySelector("#assetDetails")
  );
});

const editTableList = [
  "knack-record-update.view_2", // Supplier
  "knack-record-update.view_6", // Stock
  "knack-record-update.view_112", // Staff
  "knack-record-update.view_13", // Purchase Order
  "knack-record-update.view_25", // PO Item
  "knack-record-update.view_39", // Asset
  "knack-record-update.view_44", // Asset Jobs
  "knack-record-update.view_95", // Asset Issues

  // Inline edit updates
  "knack-cell-update.view_1", // Supplier
  "knack-cell-update.view_5", // Stock
  "knack-cell-update.view_12", // Purchase Order
  "knack-cell-update.view_38", // Assets
];

$(document).on(editTableList.join(" "), async function (event, view, record) {
  let count = 0;
  const editRecordMapping = {
    // Staff
    view_112: staffFieldMap,
    // Suppliers
    view_2: supplierFieldsMap,
    view_1: supplierFieldsMap,
    // Stock
    view_6: stockFieldMap,
    view_5: stockFieldMap,
    // Purchase Orders
    view_13: poFieldMap,
    view_12: poFieldMap,
    view_25: poLinesMap,

    // Assets
    view_38: assetFieldMap, // Inline
    view_39: assetFieldMap,
    view_44: assetJobMap,
    view_95: assetIssuesMap,
  };

  const tableLookup = {
    // Staff
    view_112: "d0c20128-cd76-49f7-91e5-adb8000c3583",
    // Suppliers
    view_2: "7a1c8e0a-3f16-406a-b388-adb8000888d2",
    view_1: "7a1c8e0a-3f16-406a-b388-adb8000888d2",
    // Stock
    view_6: "70f6163e-4b1e-4d77-a3b9-adb7002b3396",
    view_5: "70f6163e-4b1e-4d77-a3b9-adb7002b3396",
    // Purchase Orders
    view_13: "60428066-7baf-4c14-990e-adb800098094",
    view_12: "60428066-7baf-4c14-990e-adb800098094",
    view_25: "5e03dc7e-5b16-405c-9721-adb80009a558", // PO Item
    // Assets
    view_38: "5eb4932b-d454-47ba-becb-adb7001ff0d1", // Asset (Inline)
    view_39: "5eb4932b-d454-47ba-becb-adb7001ff0d1", // Asset
    view_44: "0a3c37c3-fd5e-47e9-9631-adb7015c2a68", // Asset Job
    view_95: "dd7b6fd5-569f-4537-a553-adb700221608", // Asset issues
  };

  const lookup = {
    view_112: "Successfully updated staff!",
    view_1: "Successfully updated supplier!",
    view_2: "Successfully updated supplier!",
    view_5: "Successfully updated stock!",
    view_6: "Successfully updated stock!",
    view_19: "Successfully updated asset!",
    view_20: "Successfully updated asset!",
    view_12: "Successfully updated purchase order!",
    view_13: "Successfully updated purchase order!",
    view_25: "Successfully updated po item!",
    view_38: "Successfully updated asset!",
    view_39: "Successfully updated asset!",
    view_44: "Successfully updated maintenance!",
    view_95: "Successfully updated issue!",
  };

  const keyLookup = {
    view_112: "view_111", // Staff
    view_2: "view_1", // Supplier
    view_6: "view_5", // Stock
    view_20: "view_19", // assets
    view_13: "view_12", // po
    view_39: "view_38", // timesheet
    view_44: "view_43", // asset maint
  };

  const fieldMapping = editRecordMapping[view.key];
  const table = tableLookup[view.key];

  if (fieldMapping && table) {
    try {
      const result = await syncDataSource(fieldMapping, record, table);
      console.log("RESULT", result);
    } catch (err) {
      console.log("ERROR:", err);
    }
  }

  if (count === 0 && keyLookup[view.key])
    Knack.views[keyLookup[view.key]].model.fetch();
  count++;

  console.log("COUNT", count);

  Knack.closeModal();
  setTimeout(() => {
    displayToast("Success!", lookup[view.key]);
  }, 800);
});

const createTableList = [
  "knack-record-create.view_4", // Supplier
  "knack-record-create.view_8", // Stock
  "knack-record-create.view_110", // Staff
  "knack-record-create.view_15", // Purchase Order
  "knack-record-create.view_27", // PO Item
  "knack-record-create.view_37", // Asset
  "knack-record-create.view_42", // Asset Job
  "knack-record-create.view_97", // Asset issues
];

$(document).on(createTableList.join(" "), async function (event, view, record) {
  const createRecordMapping = {
    view_4: supplierFieldsMap,
    view_8: stockFieldMap,
    view_110: staffFieldMap,
    view_15: poFieldMap,
    view_27: poLinesMap,
    view_37: assetFieldMap,
    view_42: assetJobMap,
    view_97: assetIssuesMap,
  };

  const tableLookup = {
    view_4: "7a1c8e0a-3f16-406a-b388-adb8000888d2", // Supplier
    view_8: "70f6163e-4b1e-4d77-a3b9-adb7002b3396", // Stock
    view_110: "d0c20128-cd76-49f7-91e5-adb8000c3583", // Staff
    view_15: "60428066-7baf-4c14-990e-adb800098094", // Purchase Order
    view_27: "5e03dc7e-5b16-405c-9721-adb80009a558", // PO Item
    view_37: "5eb4932b-d454-47ba-becb-adb7001ff0d1", // Asset
    view_42: "0a3c37c3-fd5e-47e9-9631-adb7015c2a68", // Asset Job
    view_97: "dd7b6fd5-569f-4537-a553-adb700221608", // Asset issues
  };

  const lookup = {
    view_4: "Successfully created supplier!",
    view_8: "Successfully created stock!",
    view_110: "Successfully created staff!",
    view_15: "Successfully created purchase order!",
    view_27: "Successfully created po item!",
    view_37: "Successfully created asset!",
    view_42: "Successfully created asset maintenance!",
    view_97: "Successfully created issue!",
  };

  const fieldMapping = createRecordMapping[view.key];
  const table = tableLookup[view.key];

  if (fieldMapping && table) {
    try {
      const result = await syncDataSource(fieldMapping, record, table);
      console.log("result", result);
    } catch (err) {
      console.log("ERROR:", err);
    }
  }

  if (view.key !== "view_74" && view.key !== "view_79") Knack.closeModal();
  setTimeout(() => {
    displayToast("Success!", lookup[view.key]);
  }, 800);
  //clearTimeout(createTimer)
});

/*****************************************************
 *
 * FIELD MAPPING
 *
 *****************************************************/

const staffFieldMap = {
  knackId: "id",
  name: "field_215",
  address: {
    lookup: "field_217_raw",
    values: ["street", "street2", "city"],
  },
  phone: {
    lookup: "field_218_raw",
    values: ["formatted"],
  },
  email: {
    lookup: "field_216_raw",
    values: ["email"],
  },
  status: "field_219",
};

const assetFieldMap = {
  knackId: "id",
  asset: "field_68",
  type: "field_70",
  lastChecked: "field_81",
  rego: "field_73",
  wofCof: "field_79",
  hours: "field_84",
  serviceDue: "field_86",
  operational: "field_89",
  status: "field_91",
};

const assetJobMap = {
  knackId: "id",
  jobNum: "field_180",
  assetId: {
    lookup: "field_93_raw",
    values: ["id"],
  },
  display: "field_181",
  issueCount: "field_182",
  assignedTo: {
    lookup: "field_97_raw",
    values: ["id"],
  },
  description: "field_194",
  status: "field_95",
};

const assetIssuesMap = {
  knackId: "id",
  issue: "field_162",
  assetJobId: {
    lookup: "field_161_raw",
    values: ["id"],
  },
  assignedTo: {
    lookup: "field_165_raw",
    values: ["id"],
  },
  status: "field_163",
  resolved: "field_164",
};

const supplierFieldsMap = {
  knackID: "id",
  supplier: "field_1",
  address: {
    lookup: "field_4_raw",
    values: ["street", "street2", "city"],
  },
  phone: {
    lookup: "field_5_raw",
    values: ["formatted"],
  },
  email: {
    lookup: "field_6_raw",
    values: ["email"],
  },
  status: "field_9",
};

const stockFieldMap = {
  knackId: "id",
  stockNum: "field_50",
  barcode: "field_12",
  stockId: "field_13",
  stockName: "field_14",
  supplierId: {
    lookup: "field_18_raw",
    values: ["id"],
  },
  stockAvailable: "field_105",
  buyRate: "field_16",
  sellRate: "field_17",
  margin: "field_150",
  stockUnit: "field_19",
  mov: "field_20",
  status: "field_207",
};

const poFieldMap = {
  knackId: "id",
  poNum: "field_3",
  assetId: {
    lookup: "field_204_raw",
    values: ["id"],
  },
  supplierId: {
    lookup: "field_24_raw",
    values: ["id"],
  },
  comments: "field_25",
  dateRequired: "field_23",
  supplierOrSubby: "field_203",
  status: "field_26",
};

const poLinesMap = {
  knackId: "id",
  stockName: {
    lookup: "field_43_raw",
    values: ["identifier"],
  },
  stockId: {
    lookup: "field_43_raw",
    values: ["id"],
  },
  poId: {
    lookup: "field_47_raw",
    values: ["id"],
  },
  quantityOrdered: "field_45",
  quantityCollected: "field_46",
  comments: "field_205",
  status: "field_44",
};

/*****************************************************
 *
 * UTILS
 *
 *****************************************************/

function displayToast(heading, content) {
  const { ToastNotification } = Components;
  $("body").append(`<div id="toastNotification"></div>`);

  ReactDOM.render(
    html` <${ToastNotification} heading=${heading} content=${content} /> `,
    document.querySelector(`#toastNotification`)
  );
  setTimeout(() => {
    $("#toastNotification").remove();
  }, 2500);
  //clearTimeout(toastTimer)
}

function closeModalRefresh() {
  Knack.closeModal();
  location.hash = location.hash + "#";
  return;
}

function softRefresh() {
  location.hash = location.hash + "#";
}
function navigatePreviousPage() {
  Knack.Navigation.redirectToParentPage();
}

function getIdentifier(field) {
  return Array.isArray(field) && field.length > 0 ? field[0].identifier : "";
}

function getId(field) {
  return Array.isArray(field) && field.length > 0 ? field[0].id : "";
}
function userId() {
  return Knack.getUserAttributes().id;
}

function userValues() {
  return Knack.getUserAttributes().values;
}
function isArray(data) {
  return Array.isArray(data) && data.length > 0 ? true : false;
}

function relocate(url, delay) {
  setTimeout(function () {
    window.location.href = url;
  }, delay);
}

function showSpinner() {
  $("#knack-body").attr("style", "pointer-events:none !important");
  Knack.showSpinner();

  return;
}

function hideSpinner() {
  $("#knack-body").attr("style", "pointer-events:auto !important");
  Knack.hideSpinner();

  return;
}

async function syncDataSource(formatedData, record, table) {
  const payload = formatedData;

  return fetch("https://knack-server.herokuapp.com/api/appenate-sync", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      company_id: 61652,
      api_key: "9cb87d8323364acab09a696e1a28c26b",
      payload: payload,
      record: record,
      table: table,
    }),
  })
    .then((response) => {
      return response.status;
    })
    .catch((error) => {
      return error;
    });
}

//const filters = Knack.views[view].getFilters();
//Knack.views[view].handleChangeFilters(filters);
