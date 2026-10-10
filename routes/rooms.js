
const express = require('express');
const pool = require('../database');

const router = express.Router();

const camposPermitidos = ['numero', 'tipo', 'valor'];

function validarHabitacion(datos) {
    const errores = [];

    if (datos.numero !== undefined &&
        (!Number.isInteger(Number(datos.numero)) ||
         Number(datos.numero) <= 0)) {
        errores.push('El número debe ser un entero positivo.');
    }

    if (datos.tipo !== undefined &&
        (typeof datos.tipo !== 'string' ||
         !datos.tipo.trim() ||
         datos.tipo.trim().length > 50)) {
        errores.push('El tipo debe tener entre 1 y 50 caracteres.');
    }

    if (datos.valor !== undefined &&
        (!Number.isFinite(Number(datos.valor)) ||
         Number(datos.valor) < 0 ||
         !/^\d+(\.\d{1,2})?$/.test(String(datos.valor)))) {
        errores.push('El valor debe ser un número no negativo con máximo dos decimales.');
    }

    return errores;
}

function responderError(res, error) {
    console.error(error);

    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            error: 'Ya existe una habitación con ese número.'
        });
    }

    return res.status(500).json({
        error: 'Error interno al consultar la base de datos.'
    });
}

// GET /rooms: consultar todas las habitaciones
router.get('/', async (req, res) => {
    try {
        const [habitaciones] = await pool.query(
            'SELECT * FROM habitaciones ORDER BY codigo'
        );

        res.status(200).json(habitaciones);
    } catch (error) {
        responderError(res, error);
    }
});

// GET /rooms/:codigo: consultar una habitación
router.get('/:codigo', async (req, res) => {
    const codigo = Number(req.params.codigo);

    if (!Number.isInteger(codigo) || codigo <= 0) {
        return res.status(400).json({
            error: 'El código debe ser un entero positivo.'
        });
    }

    try {
        const [habitaciones] = await pool.execute(
            'SELECT * FROM habitaciones WHERE codigo = ?',
            [codigo]
        );

        if (habitaciones.length === 0) {
            return res.status(404).json({
                error: 'Habitación no encontrada.'
            });
        }

        res.status(200).json(habitaciones[0]);
    } catch (error) {
        responderError(res, error);
    }
});

// POST /rooms: crear una habitación
router.post('/', async (req, res) => {
    const { numero, tipo, valor } = req.body;

    if (numero === undefined || tipo === undefined || valor === undefined) {
        return res.status(400).json({
            error: 'Los campos numero, tipo y valor son obligatorios.'
        });
    }

    const errores = validarHabitacion({ numero, tipo, valor });

    if (errores.length) {
        return res.status(400).json({ errores });
    }

    try {
        const [resultado] = await pool.execute(
            'INSERT INTO habitaciones (numero, tipo, valor) VALUES (?, ?, ?)',
            [Number(numero), tipo.trim(), Number(valor)]
        );

        res.status(201).json({
            mensaje: 'Habitación creada correctamente.',
            codigo: resultado.insertId,
            numero: Number(numero),
            tipo: tipo.trim(),
            valor: Number(valor)
        });
    } catch (error) {
        responderError(res, error);
    }
});

// PATCH /rooms/:codigo: actualizar campos específicos
router.patch('/:codigo', async (req, res) => {
    const codigo = Number(req.params.codigo);

    if (!Number.isInteger(codigo) || codigo <= 0) {
        return res.status(400).json({
            error: 'El código debe ser un entero positivo.'
        });
    }

    const datos = req.body;
    const campos = Object.keys(datos);

    if (campos.length === 0 ||
        campos.some(campo => !camposPermitidos.includes(campo))) {
        return res.status(400).json({
            error: 'Envía al menos un campo válido: numero, tipo o valor.'
        });
    }

    const errores = validarHabitacion(datos);

    if (errores.length) {
        return res.status(400).json({ errores });
    }

    try {
        const [existentes] = await pool.execute(
            'SELECT codigo FROM habitaciones WHERE codigo = ?',
            [codigo]
        );

        if (existentes.length === 0) {
            return res.status(404).json({
                error: 'Habitación no encontrada.'
            });
        }

        const asignaciones = campos.map(campo => `${campo} = ?`).join(', ');
        const valores = campos.map(campo => {
            if (campo === 'tipo') return datos[campo].trim();
            if (campo === 'numero') return Number(datos[campo]);
            return Number(datos[campo]);
        });

        await pool.execute(
            `UPDATE habitaciones SET ${asignaciones} WHERE codigo = ?`,
            [...valores, codigo]
        );

        const [actualizadas] = await pool.execute(
            'SELECT * FROM habitaciones WHERE codigo = ?',
            [codigo]
        );

        res.status(200).json({
            mensaje: 'Habitación actualizada correctamente.',
            habitacion: actualizadas[0]
        });
    } catch (error) {
        responderError(res, error);
    }
});

// DELETE /rooms/:codigo: eliminar una habitación
router.delete('/:codigo', async (req, res) => {
    const codigo = Number(req.params.codigo);

    if (!Number.isInteger(codigo) || codigo <= 0) {
        return res.status(400).json({
            error: 'El código debe ser un entero positivo.'
        });
    }

    try {
        const [resultado] = await pool.execute(
            'DELETE FROM habitaciones WHERE codigo = ?',
            [codigo]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                error: 'Habitación no encontrada.'
            });
        }

        res.status(200).json({
            mensaje: 'Habitación eliminada correctamente.'
        });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2' ||
            error.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({
                error: 'No se puede eliminar la habitación porque tiene reservas asociadas.'
            });
        }

        responderError(res, error);
    }
});

module.exports = router;