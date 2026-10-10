
require('dotenv').config();

const express = require('express');
const pool = require('./database');

const roomsRouter = require('./routes/rooms');
const reservationsRouter = require('./routes/reservations');

const app = express();
const PORT = process.env.PORT || 3000;

// Permite recibir solicitudes con cuerpo JSON.
app.use(express.json());

// Ruta principal.
app.get('/', (req, res) => {
    res.status(200).json({
        mensaje: 'API REST de reservas del hotel funcionando',
        endpoints: {
            habitaciones: '/rooms',
            reservas: '/reservations'
        }
    });
});

// Comprobar la conexión con MySQL.
app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT DATABASE() AS base_de_datos'
        );

        res.status(200).json({
            mensaje: 'Conexión con MySQL exitosa',
            base_de_datos: rows[0].base_de_datos
        });
    } catch (error) {
        console.error('Error de MySQL:', error.message);

        res.status(500).json({
            error: 'No se pudo consultar la base de datos.'
        });
    }
});

// Registrar las rutas de la API.
app.use('/rooms', roomsRouter);
app.use('/reservations', reservationsRouter);

// Ruta inexistente.
app.use((req, res) => {
    res.status(404).json({
        error: 'La ruta solicitada no existe.'
    });
});

// Manejar solicitudes JSON mal formadas.
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError &&
        err.status === 400 &&
        Object.prototype.hasOwnProperty.call(err, 'body')) {
        return res.status(400).json({
            error: 'El cuerpo de la solicitud contiene JSON inválido.'
        });
    }

    console.error(err);

    res.status(500).json({
        error: 'Error interno del servidor.'
    });
});

// Iniciar el servidor.
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});