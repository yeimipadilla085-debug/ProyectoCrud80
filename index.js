import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Necesario en ES Modules (no existe __dirname por defecto)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const puerto = process.env.MIPUERTO || 3333;

// Middleware para poder recibir JSON en el body
app.use(express.json());

// Ruta del archivo de datos
const rutaDatos = path.join(__dirname, "datosProductos.json");

// Función auxiliar para leer productos
function leerProductos() {
  const data = fs.readFileSync(rutaDatos, "utf-8");
  return JSON.parse(data);
}

// Función auxiliar para guardar productos
function guardarProductos(productos) {
  fs.writeFileSync(rutaDatos, JSON.stringify(productos, null, 2));
}

// ---------- ENDPOINTS ----------

// Raíz
app.get("/", (req, res) => {
  res.send("<h1>Api Rest Productos la 80</h1>");
});

// GET /api/productos → listar todos
app.get("/api/productos", (req, res) => {
  const productos = leerProductos();
  res.json(productos);
});

// GET /api/productos/:id → uno por id
app.get("/api/productos/:id", (req, res) => {
  const productos = leerProductos();
  const id = parseInt(req.params.id);
  const producto = productos.find(p => p.id === id);

  if (!producto) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }
  res.json(producto);
});

// POST /api/productos → crear
app.post("/api/productos", (req, res) => {
  const { nombre, precio, stock, categoria } = req.body;

  // Validaciones
  if (!nombre || !precio || stock === undefined || !categoria) {
    return res.status(400).json({
      error: "Los campos nombre, precio, stock y categoria son obligatorios"
    });
  }
  if (precio <= 0) {
    return res.status(400).json({ error: "El precio debe ser mayor a 0" });
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ error: "El stock debe ser un entero ≥ 0" });
  }

  const productos = leerProductos();
  const nuevoId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;

  const nuevoProducto = {
    id: nuevoId,
    nombre,
    precio: Number(precio),
    stock: Number(stock),
    categoria,
    imagen: null          // o "sin imagen"
  };

  productos.push(nuevoProducto);
  guardarProductos(productos);

  res.status(201).json(nuevoProducto);
});

// PUT /api/productos/:id → actualizar
app.put("/api/productos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre, precio, stock, categoria } = req.body;

  // Mismas validaciones
  if (!nombre || !precio || stock === undefined || !categoria) {
    return res.status(400).json({
      error: "Los campos nombre, precio, stock y categoria son obligatorios"
    });
  }
  if (precio <= 0) {
    return res.status(400).json({ error: "El precio debe ser mayor a 0" });
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ error: "El stock debe ser un entero ≥ 0" });
  }

  const productos = leerProductos();
  const index = productos.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  productos[index] = {
    ...productos[index],
    nombre,
    precio: Number(precio),
    stock: Number(stock),
    categoria
    // imagen se deja como está (null por ahora)
  };

  guardarProductos(productos);
  res.json(productos[index]);
});

// DELETE /api/productos/:id
app.delete("/api/productos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  let productos = leerProductos();
  const index = productos.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  const eliminado = productos.splice(index, 1)[0];
  guardarProductos(productos);

  res.json({ mensaje: "Producto eliminado", producto: eliminado });
});

// Arrancar servidor
app.listen(puerto, () => {
  console.log(`SERVIDOR: http://localhost:${puerto}`);
});