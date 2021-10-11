const express = require("express");
const Os = require("os");
const bodyParser = require("body-parser");
// const formidable = require("express-formidable");
// const formData = require("express-form-data");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 8000;

// const path = Os.tmpdir();

// const options = {
//   uploadDir: path,
//   autoClean: true,
// };

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
// app.use(formData.parse(options));

const purchaseOrders = require("./src/purchaseOrders");
const Leave = require("./src/leave");
const handleFileUpload = require("./src/files");
const processFileUpload = require("./src/processFileConnector");

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

app.post("/api/leave", async (req, res) => {
  res.sendStatus(200);

  const body = req.body;
  const result = await Leave(body?.Entry);
  console.log(result);
});

// app.post("/api/file-test", async (req, res) => {
//   res.sendStatus(200);

//   const file = req.body.file;
//   console.log("FILE", file)

//   const result = processFileUpload(file);
// });

app.post("/api/handle-file-upload", async (req, res) => {
  const body = req.body;
  console.log("BODY", body);
  res.sendStatus(200);
  try {
    const result = await handleFileUpload(body?.Entry);
    const status = result ? Number(result) : 200;
    console.log("RESULT STATUS", result);
    res.sendStatus(status);
  } catch (err) {
    console.log("ERROR", err);
  }
});

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});
