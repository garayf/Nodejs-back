const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const purchaseOrders = require("./src/purchaseOrders");
const assetMaintenance = require("./src/assetMaintenance");

app.get("/", (req, res) => res.send("Server running!"));

app.post("/api/purchase-order", async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    const result = await purchaseOrders(body?.Entry);
    console.log(result);
  } catch (err) {
    console.log("ERROR", err);
  }
});

app.post("/api/asset-maintenance", async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    const result = await assetMaintenance(body?.Entry);
    console.log(result);
  } catch (err) {
    console.log("ERROR", err);
  }
});

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});
