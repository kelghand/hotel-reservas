# API REST para la Gestión de Habitaciones y Reservas de un Hotel

## Descripción del proyecto

Este proyecto consiste en el desarrollo de una API REST para administrar las habitaciones y las reservas de un hotel. Permite registrar, consultar, actualizar y eliminar información mediante solicitudes HTTP, utilizando Node.js y Express para el servidor y MySQL para el almacenamiento de los datos.

La API implementa operaciones CRUD (*Create, Read, Update, Delete*), validación de datos y manejo de errores para facilitar una gestión organizada y confiable de la información.

## Tecnologías utilizadas

* **Node.js:** entorno de ejecución de JavaScript.
* **Express:** framework para construir el servidor y definir las rutas de la API.
* **MySQL:** sistema de gestión de bases de datos relacionales.
* **mysql2:** biblioteca para conectar Node.js con MySQL.
* **dotenv:** herramienta para gestionar variables de entorno.
* **Nodemon:** herramienta de desarrollo para reiniciar el servidor automáticamente.
* **XAMPP y phpMyAdmin:** herramientas utilizadas para administrar y consultar la base de datos.
* **Thunder Client:** extensión de Visual Studio Code utilizada para probar los endpoints.

## Estructura del proyecto

```text
hotel-reservas/
├── routes/
│   ├── rooms.js
│   └── reservations.js
├── .gitignore
├── database.js
├── package.json
├── package-lock.json
├── server.js
└── README.md
```

El archivo `server.js` configura el servidor y registra las rutas. El archivo `database.js` establece la conexión con MySQL mediante un pool de conexiones. La carpeta `routes` contiene las rutas y la lógica de las operaciones de habitaciones y reservas.

## Base de datos

La base de datos se denomina `hotel_reservas` y contiene las siguientes tablas:

### Tabla `habitaciones`

| Campo    | Tipo          | Descripción                    |
| -------- | ------------- | ------------------------------ |
| `codigo` | INT           | Clave primaria autoincremental |
| `numero` | INT           | Número único de la habitación  |
| `tipo`   | VARCHAR(50)   | Tipo de habitación             |
| `valor`  | DECIMAL(10,2) | Valor de la habitación         |

### Tabla `reservas`

| Campo               | Tipo         | Descripción                          |
| ------------------- | ------------ | ------------------------------------ |
| `codigo`            | INT          | Clave primaria autoincremental       |
| `codigo_habitacion` | INT          | Referencia a la habitación reservada |
| `nombre_cliente`    | VARCHAR(100) | Nombre del cliente                   |
| `telefono_cliente`  | VARCHAR(20)  | Teléfono del cliente                 |
| `fecha_reservacion` | DATE         | Fecha en que se registra la reserva  |
| `fecha_entrada`     | DATE         | Fecha de entrada                     |
| `fecha_salida`      | DATE         | Fecha de salida                      |

La tabla `reservas` tiene una clave foránea que relaciona cada reserva con una habitación existente.

## Requisitos previos

Antes de ejecutar el proyecto, se debe contar con:

* Node.js y npm instalados.
* Git instalado.
* MySQL en ejecución, por ejemplo, mediante XAMPP.
* Visual Studio Code u otro editor de código.

## Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/kelghand/hotel-reservas.git
cd hotel-reservas
```

### 2. Instalar las dependencias

```bash
npm install
```

### 3. Crear la base de datos

Iniciar MySQL desde XAMPP y crear una base de datos llamada `hotel_reservas` desde phpMyAdmin.

Crear las tablas `habitaciones` y `reservas` con los campos y la relación descritos anteriormente.

### 4. Configurar las variables de entorno

Crear un archivo `.env` en la raíz del proyecto con la configuración correspondiente a la instalación local de MySQL:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=hotel_reservas
PORT=3000
```

Los valores deben ajustarse si la instalación local utiliza un usuario, una contraseña o un puerto diferentes.

**Importante:** el archivo `.env` contiene configuración local y no debe publicarse en GitHub.

## Ejecución del servidor

Para ejecutar el servidor en modo desarrollo:

```bash
npm run dev
```

Para ejecutarlo de forma normal:

```bash
npm start
```

Si el servidor inicia correctamente, estará disponible en:

`http://localhost:3000`

## Endpoints de la API

### Habitaciones

La ruta base es `/rooms`.

| Método HTTP | Endpoint         | Descripción                            |
| ----------- | ---------------- | -------------------------------------- |
| GET         | `/rooms`         | Consultar todas las habitaciones       |
| GET         | `/rooms/:codigo` | Consultar una habitación por su código |
| POST        | `/rooms`         | Registrar una habitación               |
| PATCH       | `/rooms/:codigo` | Actualizar una habitación              |
| DELETE      | `/rooms/:codigo` | Eliminar una habitación                |

Ejemplo de solicitud para registrar una habitación:

```json
{
  "numero": 101,
  "tipo": "Individual",
  "valor": 150000
}
```

### Reservas

La ruta base es `/reservations`.

| Método HTTP | Endpoint                | Descripción                         |
| ----------- | ----------------------- | ----------------------------------- |
| GET         | `/reservations`         | Consultar todas las reservas        |
| GET         | `/reservations/:codigo` | Consultar una reserva por su código |
| POST        | `/reservations`         | Registrar una reserva               |
| PATCH       | `/reservations/:codigo` | Actualizar una reserva              |
| DELETE      | `/reservations/:codigo` | Eliminar una reserva                |

Ejemplo de solicitud para registrar una reserva:

```json
{
  "codigo_habitacion": 1,
  "nombre_cliente": "Carlos Ramirez",
  "telefono_cliente": "3001234567",
  "fecha_reservacion": "2026-10-09",
  "fecha_entrada": "2026-10-15",
  "fecha_salida": "2026-10-18"
}
```

Los códigos utilizados en las solicitudes deben corresponder a registros existentes en la base de datos.

## Endpoints de diagnóstico

| Método HTTP | Endpoint   | Descripción                                  |
| ----------- | ---------- | -------------------------------------------- |
| GET         | `/`        | Consultar el mensaje de bienvenida de la API |
| GET         | `/test-db` | Verificar la conexión con MySQL              |

## Pruebas de funcionamiento

Los endpoints se pueden probar mediante Thunder Client o Postman, utilizando la dirección base `http://localhost:3000`.

Las pruebas deben incluir:

* Consulta de habitaciones y reservas.
* Registro de habitaciones y reservas.
* Actualización de registros existentes.
* Eliminación de registros.
* Consulta de registros por código.
* Validación de datos y manejo de errores.
* Verificación de los cambios directamente en phpMyAdmin.

## Manejo de errores

La API contempla respuestas HTTP para indicar el resultado de las solicitudes. Entre los códigos que pueden utilizarse según cada operación se encuentran:

* `200 OK`: solicitud procesada correctamente.
* `201 Created`: registro creado correctamente.
* `400 Bad Request`: datos inválidos o solicitud incorrecta.
* `404 Not Found`: recurso o ruta no encontrados.
* `409 Conflict`: conflicto con los datos, cuando corresponda.
* `500 Internal Server Error`: error interno del servidor.

## Autoría

Proyecto académico desarrollado como práctica de diseño e implementación de una API REST con Node.js, Express y MySQL.

## Licencia

Proyecto de carácter académico y educativo.
