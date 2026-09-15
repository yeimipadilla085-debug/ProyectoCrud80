require("dotenv").config();

const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const registroMiddleware = require("./src/middleware/registroMiddleware");
const manejadorErrores = require("./src/middleware/manejadorErrores.js");
const autenticacion = require("./src/middleware/autenticacion.js");

const miApp = express();
const miPuerto = process.env.MIPUERTO || 3333;
const archivoProductos = "./datosProductos.json";
const carpetaUploads = "./uploads";
const jswtoken = require("jsonwebtoken");

if (!fs.existsSync(carpetaUploads)) fs.mkdirSync(carpetaUploads);

miApp.use(express.json());
miApp.use(registroMiddleware);
miApp.use(autenticacion);
miApp.use("/uploads", express.static(path.resolve(carpetaUploads)));



// ---------- Multer ----------
const tiposPermitidos = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, carpetaUploads),
        filename: (req, file, cb) =>
            cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
    }),
    fileFilter: (req, file, cb) =>
        tiposPermitidos.includes(file.mimetype)
            ? cb(null, true)
            : cb(new Error("Solo se permiten imágenes JPG, PNG, WEBP o GIF")),
    limits: { fileSize: 5 * 1024 * 1024 }
});




// ---------- Helpers ----------
const leerProductos = () => JSON.parse(fs.readFileSync(archivoProductos, "utf-8"));

const guardarProductos = (productos) =>
    fs.writeFileSync(archivoProductos, JSON.stringify(productos, null, 2));

function validarProducto({ nombre, precio, stock, categoria }) {
    if (!nombre?.trim() || precio === undefined || precio === "" ||
        stock === undefined || stock === "" || !categoria?.trim()) {
        return "Nombre, precio, stock y categoria son obligatorios";
    }

    const precioNumero = Number(precio);
    const stockNumero = Number(stock);

    if (!Number.isFinite(precioNumero) || precioNumero <= 0) {
        return "El precio debe ser un número mayor a 0";
    }
    if (!Number.isInteger(stockNumero) || stockNumero < 0) {
        return "El stock debe ser un entero positivo o 0";
    }

    return { nombre: nombre.trim(), precio: precioNumero, stock: stockNumero, categoria: categoria.trim() };
}





// ---------- Rutas ----------
miApp.get("/", (req, res) => res.send("<h1>API REST Productos la 80</h1>"));

miApp.get("/error", (req, res, next) => next(new Error("Error provocado, intencional")));

miApp.get("/api/productos", (req, res) => {
    try {
        res.status(200).json(leerProductos());
    } catch {
        res.status(500).json({ mensaje: "Error al obtener los productos" });
    }
});

miApp.get("/api/productos/:id", (req, res) => {
    try {
        const producto = leerProductos().find(p => p.id === parseInt(req.params.id));
        if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });
        res.status(200).json(producto);
    } catch {
        res.status(500).json({ mensaje: "Error al buscar el producto" });
    }
});

miApp.post("/api/productos", upload.single("imagen"), (req, res) => {
    try {
        const datos = validarProducto(req.body);
        if (typeof datos === "string") return res.status(400).json({ mensaje: datos });

        const productos = leerProductos();
        const nuevoId = productos.length ? Math.max(...productos.map(p => p.id)) + 1 : 1;

        const nuevoProducto = {
            id: nuevoId,
            ...datos,
            imagen: req.file ? `/uploads/${req.file.filename}` : null
        };

        productos.push(nuevoProducto);
        guardarProductos(productos);

        res.status(201).json({ mensaje: "Producto creado correctamente", producto: nuevoProducto });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al crear el producto" });
    }
});

miApp.put("/api/productos/:id", upload.single("imagen"), (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const productos = leerProductos();
        const posicion = productos.findIndex(p => p.id === id);

        if (posicion === -1) return res.status(404).json({ mensaje: "Producto no encontrado" });

        const datos = validarProducto(req.body);
        if (typeof datos === "string") return res.status(400).json({ mensaje: datos });

        productos[posicion] = {
            id,
            ...datos,
            imagen: req.file ? `/uploads/${req.file.filename}` : (productos[posicion].imagen || null)
        };

        guardarProductos(productos);

        res.status(200).json({ mensaje: "Producto actualizado correctamente", producto: productos[posicion] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al actualizar el producto" });
    }
});

miApp.delete("/api/productos/:id", (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const productos = leerProductos();
        const posicion = productos.findIndex(p => p.id === id);

        if (posicion === -1) return res.status(404).json({ mensaje: "Producto no encontrado" });

        const [productoEliminado] = productos.splice(posicion, 1);

        if (productoEliminado.imagen) {
            const rutaImagen = path.join(carpetaUploads, path.basename(productoEliminado.imagen));
            if (fs.existsSync(rutaImagen)) fs.unlinkSync(rutaImagen);
        }

        guardarProductos(productos);

        res.status(200).json({ mensaje: "Producto eliminado correctamente", producto: productoEliminado });
    } catch {
        res.status(500).json({ mensaje: "Error al eliminar el producto" });
    }
});

miApp.use(manejadorErrores);




//enpoint inicio de sesión
miApp.post("/api/login", (req, res) => {
   //capturar del usuario
    const { usuario, clave } = req.body;
    //simular datos del usuraio de una bd
    const datoUsuario = {"usuario": "Yeimy", "clave": "1234"}
    //validar datos del usuario
    if (usuario !== datoUsuario.usuario || clave !== datoUsuario.clave) {
       return res.status(400).json({ mensaje: "Usuario o clave incorrectos" });
    }
    //generar y verificar

    const token = jswtoken.sign(
      {usuario: usuario},
      process.env.JWT_SECRET,
      {expiresIn: "1h"},
    )

    res.json(token)
});


miApp.listen(miPuerto, () => {
    console.log(`SERVIDOR: http://localhost:${miPuerto}`);
    console.log(`IMÁGENES: http://localhost:${miPuerto}/uploads`);
});