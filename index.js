const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 4000;
const app = express();
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());



app.get("/", (req, res) => {
  res.send("Fluency is running");
});

app.listen(port, () => {
  console.log(`Fluency Server is running on port ${port}`);
});
