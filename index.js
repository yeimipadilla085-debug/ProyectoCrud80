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

// Middleware
miApp.use(express.json());
miApp.use(registroMiddleware);
miApp.use(autenticacion);


// =====================================================
// CONFIGURACIÓN DE MULTER
// =====================================================

const carpetaUploads = "./uploads";

if (!fs.existsSync(carpetaUploads)) {
    fs.mkdirSync(carpetaUploads);
}

const almacenamiento = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, carpetaUploads);
    },

    filename: (req, file, cb) => {

        const extension = path.extname(file.originalname);

        const nombreArchivo =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            extension;

        cb(null, nombreArchivo);
    }

});

const upload = multer({

    storage: almacenamiento,

    fileFilter: (req, file, cb) => {

        const tiposPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (tiposPermitidos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Solo se permiten imágenes JPG, PNG, WEBP o GIF"));
        }

    },

    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
    }

});

// Mostrar imágenes (carpeta pública)
miApp.use("/uploads", express.static(path.resolve(carpetaUploads)));


// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function leerProductos() {
    return JSON.parse(fs.readFileSync(archivoProductos, "utf-8"));
}

function guardarProductos(productos) {
    fs.writeFileSync(archivoProductos, JSON.stringify(productos, null, 2));
}

// Valida el body y devuelve { error } o { datos }
function validarProducto(body) {

    const { nombre, precio, stock, categoria } = body;

    const vacio = valor => valor === undefined || String(valor).trim() === "";

    if (vacio(nombre) || vacio(precio) || vacio(stock) || vacio(categoria)) {
        return { error: "Nombre, precio, stock y categoria son obligatorios" };
    }

    const precioNumero = Number(precio);
    const stockNumero = Number(stock);

    if (!Number.isFinite(precioNumero) || precioNumero <= 0) {
        return { error: "El precio debe ser un número mayor a 0" };
    }

    if (!Number.isInteger(stockNumero) || stockNumero < 0) {
        return { error: "El stock debe ser un entero positivo o 0" };
    }

    return {
        datos: {
            nombre: nombre.trim(),
            precio: precioNumero,
            stock: stockNumero,
            categoria: categoria.trim()
        }
    };
}

// Ruta de la imagen subida, o la que ya tenía el producto
function rutaImagenSubida(req, anterior = null) {
    return req.file ? `/uploads/${req.file.filename}` : anterior;
}


// =====================================================
// ENDPOINTS
// =====================================================

miApp.get("/", (req, res) => {
    res.send("<h1>API REST Productos la 80</h1>");
});

// Endpoint para provocar un error
miApp.get("/error", (req, res, next) => {
    next(new Error("Error provocado, intencional"));
});

// GET - Listar todos los productos
miApp.get("/api/productos", (req, res, next) => {
    try {
        res.status(200).json(leerProductos());
    } catch (error) {
        next(error);
    }
});

// GET - Buscar producto por id
miApp.get("/api/productos/:id", (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const producto = leerProductos().find(p => p.id === id);

        if (!producto) {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        res.status(200).json(producto);
    } catch (error) {
        next(error);
    }
});

// POST - Crear producto
miApp.post("/api/productos", upload.single("imagen"), (req, res, next) => {
    try {
        const { error, datos } = validarProducto(req.body);

        if (error) {
            return res.status(400).json({ mensaje: error });
        }

        const productos = leerProductos();

        const nuevoProducto = {
            id: productos.length > 0
                ? Math.max(...productos.map(p => p.id)) + 1
                : 1,
            ...datos,
            imagen: rutaImagenSubida(req)
        };

        productos.push(nuevoProducto);
        guardarProductos(productos);

        res.status(201).json({
            mensaje: "Producto creado correctamente",
            producto: nuevoProducto
        });
    } catch (error) {
        next(error);
    }
});

// PUT - Actualizar producto
miApp.put("/api/productos/:id", upload.single("imagen"), (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const productos = leerProductos();
        const posicion = productos.findIndex(p => p.id === id);

        if (posicion === -1) {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        const { error, datos } = validarProducto(req.body);

        if (error) {
            return res.status(400).json({ mensaje: error });
        }

        productos[posicion] = {
            id,
            ...datos,
            imagen: rutaImagenSubida(req, productos[posicion].imagen || null)
        };

        guardarProductos(productos);

        res.status(200).json({
            mensaje: "Producto actualizado correctamente",
            producto: productos[posicion]
        });
    } catch (error) {
        next(error);
    }
});

// DELETE - Eliminar producto
miApp.delete("/api/productos/:id", (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const productos = leerProductos();
        const posicion = productos.findIndex(p => p.id === id);

        if (posicion === -1) {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        const productoEliminado = productos.splice(posicion, 1)[0];

        // Eliminar la imagen del servidor, si tenía una
        if (productoEliminado.imagen) {
            const rutaImagen = path.join(
                carpetaUploads,
                path.basename(productoEliminado.imagen)
            );

            if (fs.existsSync(rutaImagen)) {
                fs.unlinkSync(rutaImagen);
            }
        }

        guardarProductos(productos);

        res.status(200).json({
            mensaje: "Producto eliminado correctamente",
            producto: productoEliminado
        });
    } catch (error) {
        next(error);
    }
});


// =====================================================
// MANEJO DE ERRORES (SIEMPRE AL FINAL)
// =====================================================

miApp.use(manejadorErrores);


// =====================================================
// SERVIDOR
// =====================================================

miApp.listen(miPuerto, () => {
    console.log(`SERVIDOR: http://localhost:${miPuerto}`);
    console.log(`IMÁGENES: http://localhost:${miPuerto}/uploads`);
});