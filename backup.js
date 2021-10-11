$("head").append(
  "<link rel='apple-touch-icon-precomposed' sizes='57x57' href='https://iconifier.net/images/ghosted/apple-touch-icon-57x57.png' />"
);
$("head").append(
  "<link rel='apple-touch-icon-precomposed' sizes='72x72' href='https://iconifier.net/images/ghosted/apple-touch-icon-72x72.png' />"
);
$("head").append(
  "<link rel='apple-touch-icon-precomposed' sizes='114x114' href='https://iconifier.net/images/ghosted/apple-touch-icon-114x114.png' />"
);
$("head").append(
  "<link rel='apple-touch-icon-precomposed' sizes='144x144' href='https://iconifier.net/images/ghosted/apple-touch-icon-144x144.png' />"
);

const pageRendered = $.Deferred();
let openPoItemsMenu = true;
let globalPoID = "";
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

$(document).on(
  "knack-view-render.view_15 knack-view-render.view_27",
  async function (event, view, data) {
    const { ToggleSwitch } = Components;
    openPoItemsMenu = false;
    globalPoID = "";

    const toggleText =
      view.key === "view_15"
        ? "Check toggle to create purchase order items"
        : "Check toggle to create another purchase order item";
    $(`#${view.key} > form > div`).prepend(
      `<div id="toggleSwitch${view.key}"></div>`
    );
    ReactDOM.render(
      html`<${ToggleSwitch} text=${toggleText} />`,
      document.querySelector(`#toggleSwitch${view.key}`)
    );
  }
);

$(document).on(
  "knack-record-create.view_15",
  async function (event, view, data) {
    if (openPoItemsMenu) {
      globalPoID = data.id;
      Knack.closeModal();
      Knack.Navigation.redirectToURL(
        `#purchase-orders/view-purchase-order-details/${globalPoID}/add-purchase-order-item/${globalPoID}/`
      );
    }
    Knack.views["view_75"].model.fetch();
  }
);

$(document).on(
  "knack-record-create.view_42",
  async function (event, view, data) {
    Knack.Navigation.redirectToURL(
      `rawsons#asset-maintenance/view-asset-maintenance-details/${data.id}`
    );
  }
);

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
          stat=${available > 0 ? available : 0}
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

$(document).on("knack-view-render.view_23", async function (event, view, data) {
  const { Toggle } = Components;
  const itemsMenu = "#view_26";
  const itemsTable = "#view_24";
  const docketsMenu = "#view_31";
  const docketsTable = "#view_33";

  $(`${docketsMenu}, ${docketsTable}`).hide();

  const buttons = [
    { id: ["view_26, view_24"], name: "PO Items" },
    { id: ["view_31, view_33"], name: "Dockets" },
  ];

  $("#view_23").append(`<div id="poDetails"></div>`);
  ReactDOM.render(
    html`<${Toggle} buttons=${buttons} initView="view_23" />`,
    document.querySelector("#poDetails")
  );
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
  "knack-record-update.view_13", // Purchase Order
  "knack-record-update.view_25", // PO Item
  "knack-record-update.view_76", // Purchase Order
  "knack-record-update.view_81", // Purchase Order Item
  "knack-record-update.view_39", // Asset
  "knack-record-update.view_44", // Asset Maintenance (Pending)

  // Inline edit updates
  "knack-cell-update.view_1", // Supplier
  "knack-cell-update.view_5", // Stock
  "knack-cell-update.view_12", // Purchase Order
  "knack-cell-update.view_38", // Assets
];

$(document).on(editTableList.join(" "), async function (event, view, record) {
  let count = 0;
  const editRecordMapping = {
    // view_81: poItemFieldsMap,
  };

  const tableLookup = {
    view_19: "", // Inline edit Assets
    view_20: "", // Assets
    view_70: "", // Inline edit Suppliers
    view_71: "", // Suppliers
    view_75: "", // Inline edit Purchase Order
    view_76: "", // Purchase Order
    view_81: "", // Purchase Order Item
  };

  const lookup = {
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
  };

  const keyLookup = {
    view_2: "view_1", // Supplier
    view_6: "view_5", // Stock
    view_20: "view_19", // assets
    view_13: "view_12", // po
    view_39: "view_38", // timesheet
    view_44: "view_43", // asset maint
  };

  // const fieldMapping = editRecordMapping[view.key];
  // const table = tableLookup[view.key];

  // if (fieldMapping && table) {
  //   try {
  //     const result = await syncDataSource(fieldMapping, record, table);
  //   } catch (err) {
  //     console.log("ERROR:", err);
  //   }
  // }

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
  "knack-record-create.view_15", // Purchase Order
  "knack-record-create.view_27", // PO Item
  "knack-record-create.view_37", // Asset
  "knack-record-create.view_42", // Asset Maintenance (Pending)
];

$(document).on(createTableList.join(" "), async function (event, view, record) {
  // const createRecordMapping = {
  //   view_5: [jobFieldsMap, dailyLogMap],
  //   view_12: [staffFieldsMap, timesheetFieldsMap],
  //   view_18: assetFieldsMap,
  //   view_69: supplierFieldsMap,
  //   view_74: poFieldsMap,
  //   view_79: poItemFieldsMap,
  // };

  // const tableLookup = {
  //   view_5: [
  //     "de18c112-8697-4c3f-8f60-ad8f018b4028", // Job
  //     "cd5fb670-96ac-4134-8e51-ad8f018b2db3", // Job Daily Log
  //   ],
  //   view_12: [
  //     "0faab756-3e3b-4049-a64e-ad8f018ac603", // Staff
  //     "08dd80b5-01fb-41ba-bc8d-ad8f018ab5ac", // Staff Timesheets
  //   ],
  //   view_18: "7e1cbea7-bacf-46b4-a4b0-ad8f018af46b", // Assets
  //   view_69: "11f83467-5a34-4447-bed4-ad8f0182dfce", // Suppliers
  //   view_74: "1d713cb4-855c-47a3-821a-ad8f018ae213", // Purchase Order
  //   view_79: "41b40aed-da99-4919-922d-ad8f018b5231", // Purchase Order Item
  // };

  const lookup = {
    view_4: "Successfully created supplier!",
    view_8: "Successfully created stock!",
    view_15: "Successfully created purchase order!",
    view_27: "Successfully created po item!",
    view_37: "Successfully created asset!",
    view_42: "Successfully created asset maintenance!",
  };

  // const fieldMapping = createRecordMapping[view.key];
  // const table = tableLookup[view.key];

  // if (fieldMapping && table) {
  //   try {
  //     const result = await syncDataSource(fieldMapping, record, table);
  //   } catch (err) {
  //     console.log("ERROR:", err);
  //   }
  // }

  if (view.key !== "view_74" && view.key !== "view_79") Knack.closeModal();
  setTimeout(() => {
    displayToast("Success!", lookup[view.key]);
  }, 800);
  //clearTimeout(createTimer)
});

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

//const filters = Knack.views[view].getFilters();
//Knack.views[view].handleChangeFilters(filters);

// let maintActiveRenderCount = 0;

// $(document).on("knack-view-render.view_69", function (event, view, data) {
//   const {
//     ToastNotification,
//     CurrentAssetWorkedOn,
//     TwoColumnDetails,
//     DetailSection,
//   } = Components;

//   console.log({ displayToast });
//   if (displayToast) {
//     $("body").append(`<div id="toastNotification"></div>`);

//     ReactDOM.render(
//       html`
//         <${ToastNotification}
//           heading="Success!"
//           content="Successfully finished maintenance"
//         />
//       `,
//       document.querySelector(`#toastNotification`)
//     );
//     setTimeout(() => {
//       $("#toastNotification").remove();
//       displayToast = false;
//     }, 2000);
//   }

//   if (data.length === 0 && maintActiveRenderCount < 3) {
//     setTimeout(() => {
//       Knack.views.view_69.model.fetch();
//     }, 1000);
//     maintActiveRenderCount++;
//   }
//   $("#view_69 > div.kn-records-nav > div:nth-child(3)").hide();
//   $(".kn-list-content .kn-list-item-container").each(function (index) {
//     $($(this)).prepend(`<div id=activeAssetItem${index}></div>`);
//     $($(this)[0].childNodes[2].children[0].children[0]).hide();

//     ReactDOM.render(
//       html`
//       <${TwoColumnDetails}>
//         <${DetailSection} label="Created" body=${data[index].field_92}/>
//         <${DetailSection} label="Asset" body=${getIdentifier(
//         data[index].field_93_raw
//       )}/>
//         <${DetailSection} label="Assigned To" body=${getIdentifier(
//         data[index].field_97_raw
//       )}/>
//         <${DetailSection} label="Status" body=${data[index].field_95}/>
//       </${TwoColumnDetails}>
//     `,
//       document.querySelector(`#activeAssetItem${index}`)
//     );

//     if (data[index].field_141_raw.length > 0) {
//       ReactDOM.render(
//         html`<${CurrentAssetWorkedOn} />`,
//         document.querySelector(`#activeAssetItem${index}`)
//       );
//     }
//   });

// });
// let maintRenderCount = 0;

// $(document).on("knack-view-render.view_76", function (event, view, data) {
//   const { ToastNotification } = Components;
//   console.log({ displayToast });
//   if (displayToast) {
//     console.log({ displayToast });
//     $("body").append(`<div id="toastNotification"></div>`);

//     ReactDOM.render(
//       html`
//         <${ToastNotification}
//           heading="Success!"
//           content="Successfully started maintenance!"
//         />
//       `,
//       document.querySelector(`#toastNotification`)
//     );
//     setTimeout(() => {
//       $("#toastNotification").remove();
//       displayToast = false;
//     }, 2000);
//   }

//   // Hide filters
//   $("#view_76 > div.kn-records-nav").hide();

//   if (data.length === 0 && maintRenderCount < 3) {
//     console.log("NO DATA: ", data);
//     setTimeout(() => {
//       Knack.views.view_76.model.fetch();
//     }, 1000);
//     maintRenderCount++;
//   }
//   console.log("DONE");
//   return;
// });

// $(document).on("knack-view-render.view_72", function (event, view, data) {
//   const maintenanceRecord = view.scene.scene_id;
//   const staffId = userId();
//   console.log("VIEW", view.scene.scene_id);

//   // Populate Asset Maint Id
//   $("#view_72-field_135").val(maintenanceRecord);
//   $("#view_72-field_135").trigger("liszt:updated");

//   // Populate staff ID
//   $("#view_72-field_133").val(staffId);
//   $("#view_72-field_133").trigger("liszt:updated");
// });

// $(document).on(
//   "knack-record-create.view_72",
//   async function (event, view, record) {
//     const { ToastNotification } = Components;
//     const maintRecord = record.field_135_raw[0].id;

//     const data = {
//       id: maintRecord,
//       payload: {
//         field_136: record.id,
//         field_141: userId(),
//       },
//     };
//     await KnackApi.api("PUT", 9, data);

//     Knack.closeModal();
//     closeModalRefresh();

//     displayToast = true;
//   }
// );

// // CRETE NEW ASSET DEFECT
// $(document).on(
//   "knack-record-create.view_80",
//   async function (event, view, record) {
//     console.log("RECORD", record);

//     const data = {
//       payload: {
//         field_133: getId(record.field_133_raw), // Staff Id
//         field_135: record.id, // Asset Maint Id
//         field_137: record.field_99, // Start Time
//       },
//     };
//     showSpinner();
//     try {
//       // Create Maintenance hours record
//       const hoursRes = await KnackApi.api("POST", 13, data);
//       console.log("hours", hoursRes);
//       if (hoursRes.id) {
//         // Update Maint record with hours Id
//         const maintRes = await KnackApi.api("PUT", 9, {
//           id: record.id,
//           payload: { field_136: hoursRes.id },
//         });

//         console.log("maintRes: ", maintRes);
//       }
//       console.log("RES: ", hoursRes);
//     } catch (err) {
//       console.log("ERROR: ", err);
//     }
//     hideSpinner();
//     navigatePreviousPage();
//   }
// );

// $(document).on(
//   "knack-record-update.view_78",
//   async function (event, view, record) {
//     const data = {
//       id: userId(),
//       payload: {
//         field_140: "Signed Out",
//       },
//     };
//     console.log("starting");

//     console.time("updating");
//     const res = await KnackApi.api("PUT", 4, data);
//     console.timeEnd("updating");
//     console.log("RES: ", res);

//     Knack.closeModal();
//     closeModalRefresh();
//     //location.reload();

//     displayToast = true;
//   }
// );
