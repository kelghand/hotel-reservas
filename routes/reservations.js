
const express = require('express');
const pool = require('../database');

const router = express.Router();

const camposPermitidos = [
    'codigo_habitacion',
    'nombre_cliente',
    'telefono_cliente',
    'fecha_reservacion',
    'fecha_entrada',
    'fecha_salida'
];

function validarFecha(fecha) {
    if (typeof fecha !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const fechaReal = new Date(`${fecha}T00:00:00Z`);

    return !Number.isNaN(fechaReal.getTime()) &&
        fechaReal.toISOString().slice(0, 10) === fecha;
}

function validarReserva(datos) {
    const errores = [];

    if (datos.codigo_habitacion !== undefined &&
        (!Number.isInteger(Number(datos.codigo_habitacion)) ||
         Number(datos.codigo_habitacion) <= 0)) {
        errores.push('codigo_habitacion debe ser un entero positivo.');
    }

    for (const campo of ['nombre_cliente', 'telefono_cliente']) {
        if (datos[campo] !== undefined &&
            (typeof datos[campo] !== 'string' ||
             !datos[campo].trim() ||
             datos[campo].length > (campo === 'nombre_cliente' ? 100 : 20))) {
            errores.push(`${campo} es obligatorio y tiene una longitud inválida.`);
        }
    }

    for (const campo of [
        'fecha_reservacion',
        'fecha_entrada',
        'fecha_salida'
    ]) {
        if (datos[campo] !== undefined &&
            !validarFecha(datos[campo])) {
            errores.push(`${campo} debe tener una fecha válida en formato YYYY-MM-DD.`);
        }
    }

    const entrada = datos.fecha_entrada;
    const salida = datos.fecha_salida;

    if (entrada && salida &&
        validarFecha(entrada) && validarFecha(salida) &&
        salida <= entrada) {
        errores.push('La fecha de salida debe ser posterior a la fecha de entrada.');
    }

    return errores;
}

function responderError(res, error) {
    console.error(error);

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            error: 'La habitación indicada no existe.'
        });
    }

    return res.status(500).json({
        error: 'Error interno al consultar la base de datos.'
    });
}

async function verificarDisponibilidad(
    codigoHabitacion,
    entrada,
    salida,
    excluirCodigo = null
) {
    let sql = `
        SELECT codigo
        FROM reservas
        WHERE codigo_habitacion = ?
          AND fecha_entrada < ?
          AND fecha_salida > ?
    `;

    const parametros = [codigoHabitacion, salida, entrada];

    if (excluirCodigo !== null) {
        sql += ' AND codigo <> ?';
        parametros.push(excluirCodigo);
    }

    const [reservas] = await pool.execute(sql, parametros);

    return reservas.length === 0;
}

// GET /reservations: consultar todas las reservas
router.get('/', async (req, res) => {
    try {
        const [reservas] = await pool.query(`
            SELECT r.*, h.numero AS numero_habitacion, h.tipo AS tipo_habitacion
            FROM reservas r
            INNER JOIN habitaciones h ON r.codigo_habitacion = h.codigo
            ORDER BY r.codigo
        `);

        res.status(200).json(reservas);
    } catch (error) {
        responderError(res, error);
    }
});

// GET /reservations/:codigo: consultar una reserva
router.get('/:codigo', async (req, res) => {
    const codigo = Number(req.params.codigo);

    if (!Number.isInteger(codigo) || codigo <= 0) {
        return res.status(400).json({
            error: 'El código debe ser un entero positivo.'
        });
    }

    try {
        const [reservas] = await pool.execute(`
            SELECT r.*, h.numero AS numero_habitacion, h.tipo AS tipo_habitacion
            FROM reservas r
            INNER JOIN habitaciones h ON r.codigo_habitacion = h.codigo
            WHERE r.codigo = ?
        `, [codigo]);

        if (reservas.length === 0) {
            return res.status(404).json({
                error: 'Reserva no encontrada.'
            });
        }

        res.status(200).json(reservas[0]);
    } catch (error) {
        responderError(res, error);
    }
});

// POST /reservations: crear una reserva
router.post('/', async (req, res) => {
    const {
        codigo_habitacion,
        nombre_cliente,
        telefono_cliente,
        fecha_reservacion,
        fecha_entrada,
        fecha_salida
    } = req.body;

    const datos = {
        codigo_habitacion,
        nombre_cliente,
        telefono_cliente,
        fecha_reservacion,
        fecha_entrada,
        fecha_salida
    };

    if (Object.values(datos).some(valor => valor === undefined || valor === null)) {
        return res.status(400).json({
            error: 'Todos los campos de la reserva son obligatorios.'
        });
    }

    const errores = validarReserva(datos);

    if (errores.length) {
        return res.status(400).json({ errores });
    }

    try {
        const [habitaciones] = await pool.execute(
            'SELECT codigo FROM habitaciones WHERE codigo = ?',
            [Number(codigo_habitacion)]
        );

        if (habitaciones.length === 0) {
            return res.status(400).json({
                error: 'La habitación indicada no existe.'
            });
        }

        const disponible = await verificarDisponibilidad(
            Number(codigo_habitacion),
            fecha_entrada,
            fecha_salida
        );

        if (!disponible) {
            return res.status(409).json({
                error: 'La habitación ya está reservada durante esas fechas.'
            });
        }

        const [resultado] = await pool.execute(`
            INSERT INTO reservas (
                codigo_habitacion,
                nombre_cliente,
                telefono_cliente,
                fecha_reservacion,
                fecha_entrada,
                fecha_salida
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
            Number(codigo_habitacion),
            nombre_cliente.trim(),
            telefono_cliente.trim(),
            fecha_reservacion,
            fecha_entrada,
            fecha_salida
        ]);

        res.status(201).json({
            mensaje: 'Reserva creada correctamente.',
            codigo: resultado.insertId
        });
    } catch (error) {
        responderError(res, error);
    }
});

// PATCH /reservations/:codigo: actualizar una reserva
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
            error: 'Envía al menos un campo válido de la reserva.'
        });
    }

    const errores = validarReserva(datos);

    if (errores.length) {
        return res.status(400).json({ errores });
    }

    try {
        const [actuales] = await pool.execute(
            'SELECT * FROM reservas WHERE codigo = ?',
            [codigo]
        );

        if (actuales.length === 0) {
            return res.status(404).json({
                error: 'Reserva no encontrada.'
            });
        }

        const reserva = { ...actuales[0], ...datos };
        reserva.codigo_habitacion = Number(reserva.codigo_habitacion);

        const [habitaciones] = await pool.execute(
            'SELECT codigo FROM habitaciones WHERE codigo = ?',
            [reserva.codigo_habitacion]
        );

        if (habitaciones.length === 0) {
            return res.status(400).json({
                error: 'La habitación indicada no existe.'
            });
        }

        const erroresCompletos = validarReserva(reserva);

        if (erroresCompletos.length) {
            return res.status(400).json({
                errores: erroresCompletos
            });
        }

        const disponible = await verificarDisponibilidad(
            reserva.codigo_habitacion,
            reserva.fecha_entrada,
            reserva.fecha_salida,
            codigo
        );

        if (!disponible) {
            return res.status(409).json({
                error: 'La habitación ya está reservada durante esas fechas.'
            });
        }

        const asignaciones = campos.map(campo => `${campo} = ?`).join(', ');

        const valores = campos.map(campo => {
            if (campo === 'codigo_habitacion') {
                return Number(datos[campo]);
            }

            if (campo === 'nombre_cliente' ||
                campo === 'telefono_cliente') {
                return datos[campo].trim();
            }

            return datos[campo];
        });

        await pool.execute(
            `UPDATE reservas SET ${asignaciones} WHERE codigo = ?`,
            [...valores, codigo]
        );

        const [actualizadas] = await pool.execute(
            'SELECT * FROM reservas WHERE codigo = ?',
            [codigo]
        );

        res.status(200).json({
            mensaje: 'Reserva actualizada correctamente.',
            reserva: actualizadas[0]
        });
    } catch (error) {
        responderError(res, error);
    }
});

// DELETE /reservations/:codigo: eliminar una reserva
router.delete('/:codigo', async (req, res) => {
    const codigo = Number(req.params.codigo);

    if (!Number.isInteger(codigo) || codigo <= 0) {
        return res.status(400).json({
            error: 'El código debe ser un entero positivo.'
        });
    }

    try {
        const [resultado] = await pool.execute(
            'DELETE FROM reservas WHERE codigo = ?',
            [codigo]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                error: 'Reserva no encontrada.'
            });
        }

        res.status(200).json({
            mensaje: 'Reserva eliminada correctamente.'
        });
    } catch (error) {
        responderError(res, error);
    }
});

module.exports = router;