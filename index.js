// Importación tradicional (CommonJS)
const express = require("express");

// Creación de la aplicación
const app = express();
const puerto = 3333;

// Endpoint raíz
app.get("/", (req, res) => {
  res.send("<h1>Api Rest Productos la 80</h1>");
});

// Escuchar
app.listen(puerto, () => {
  console.log(`SERVIDOR: http://localhost:${puerto}`);
});