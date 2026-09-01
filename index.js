require("dotenv").config();          // ← al principio

const express = require("express");
const app = express();

const puerto = process.env.MIPUERTO || 3333;   // ahora lee del .env

app.get("/", (req, res) => {
  res.send("<h1>Api Rest Productos la 80</h1>");
});

app.listen(puerto, () => {
  console.log(`SERVIDOR: http://localhost:${puerto}`);
});