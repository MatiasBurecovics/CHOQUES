const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Conclusión a la base de datos PostgreSQL usando la variable de entorno de producción
const connectionString = process.env.DATABASE_URL || "postgresql://postgres.rsaoknncxwqcmnbnjrrf:ChoquesA0226@aws-1-us-east-1.pooler.supabase.com:5432/postgres";

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// Inicializar las tablas estructurales en PostgreSQL
const initDB = async () => {
    try {
        // 1. Tabla de usuarios principal
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id VARCHAR(255) PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                conductor_nombre VARCHAR(255) NOT NULL,
                conductor_dni VARCHAR(255) NOT NULL UNIQUE,
                conductor_domicilio VARCHAR(255) NOT NULL,
                conductor_telefono VARCHAR(255) NOT NULL,
                conductor_licencia VARCHAR(255) NOT NULL,
                vehiculo_patente VARCHAR(255) NOT NULL UNIQUE,
                vehiculo_marca VARCHAR(255) NOT NULL,
                vehiculo_modelo VARCHAR(255) NOT NULL,
                vehiculo_anio INT NOT NULL,
                vehiculo_motor VARCHAR(255),
                vehiculo_chasis VARCHAR(255),
                seguro_aseguradora VARCHAR(255) NOT NULL,
                seguro_poliza VARCHAR(255) NOT NULL,
                seguro_vencimiento VARCHAR(255) NOT NULL
            );
        `);

        // 2. Tabla de pines activos temporales
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pines_activos (
                pin VARCHAR(10) PRIMARY KEY,
                usuario_id VARCHAR(255) NOT NULL,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expiracion TIMESTAMP NOT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );
        `);

        // 3. Tabla de historial (Almacena los snapshots congelados de ambos lados)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS historial_intercambios (
                id VARCHAR(255) PRIMARY KEY,
                usuario_emisor_id VARCHAR(255) NOT NULL,
                usuario_receptor_id VARCHAR(255) NOT NULL,
                fecha_intercambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                -- Datos congelados del EMISOR (El que generó el PIN)
                emisor_nombre VARCHAR(255),
                emisor_telefono VARCHAR(255),
                emisor_patente VARCHAR(255),
                emisor_aseguradora VARCHAR(255),
                emisor_poliza VARCHAR(255),
                
                -- Datos congelados del RECEPTOR (El que ingresó el PIN)
                receptor_nombre VARCHAR(255),
                receptor_telefono VARCHAR(255),
                receptor_patente VARCHAR(255),
                receptor_aseguradora VARCHAR(255),
                receptor_poliza VARCHAR(255),

                FOREIGN KEY (usuario_emisor_id) REFERENCES usuarios(id),
                FOREIGN KEY (usuario_receptor_id) REFERENCES usuarios(id)
            );
        `);

        // MIGRACIÓN AUTOMÁTICA
        await pool.query(`ALTER TABLE historial_intercambios ADD COLUMN IF NOT EXISTS emisor_nombre VARCHAR(255);`);
        await pool.query(`ALTER TABLE historial_intercambios ADD COLUMN IF NOT EXISTS emisor_telefono VARCHAR(255);`);
        await pool.query(`ALTER TABLE historial_intercambios ADD COLUMN IF NOT EXISTS emisor_patente VARCHAR(255);`);
        await pool.query(`ALTER TABLE historial_intercambios ADD COLUMN IF NOT EXISTS emisor_aseguradora VARCHAR(255);`);
        await pool.query(`ALTER TABLE historial_intercambios ADD COLUMN IF NOT EXISTS emisor_poliza VARCHAR(255);`);
        await pool.query(`ALTER TABLE historial_intercambios ADD COLUMN IF NOT EXISTS receptor_nombre VARCHAR(255);`);
        await pool.query(`ALTER TABLE historial_intercambios ADD COLUMN IF NOT EXISTS receptor_telefono VARCHAR(255);`);
        await pool.query(`ALTER TABLE historial_intercambios ADD COLUMN IF NOT EXISTS receptor_patente VARCHAR(255);`);
        await pool.query(`ALTER TABLE historial_intercambios ADD COLUMN IF NOT EXISTS receptor_aseguradora VARCHAR(255);`);
        await pool.query(`ALTER TABLE historial_intercambios ADD COLUMN IF NOT EXISTS receptor_poliza VARCHAR(255);`);

        console.log("Tablas verificadas/creadas con éxito en la nube de PostgreSQL.");
    } catch (err) {
        console.error("Error al inicializar la base de datos:", err.message);
    }
};
initDB();

app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// ==========================================
// 1. REGISTRO DE CUENTA NUEVA
// ==========================================
app.post('/api/auth/register', async (req, res) => {
    const {
        email, password, nombre, dni, domicilio, telefono, licencia,
        patente, marca, modelo, anio, motor, chasis,
        aseguradora, poliza, vencimiento
    } = req.body;

    if (!email || !password || !nombre || !dni || !domicilio || !telefono || !licencia || !patente || !marca || !modelo || !anio || !aseguradora || !poliza || !vencimiento) {
        return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    const usuarioId = 'usr_' + crypto.randomBytes(4).toString('hex');
    const sql = `INSERT INTO usuarios (id, email, password, conductor_nombre, conductor_dni, conductor_domicilio, conductor_telefono, conductor_licencia, vehiculo_patente, vehiculo_marca, vehiculo_modelo, vehiculo_anio, vehiculo_motor, vehiculo_chasis, seguro_aseguradora, seguro_poliza, seguro_vencimiento) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`;
    
    const params = [usuarioId, email, password, nombre, dni, domicilio, telefono, licencia, patente, marca, modelo, parseInt(anio), motor || null, chasis || null, aseguradora, poliza, vencimiento];

    try {
        await pool.query(sql, params);
        res.status(201).json({ mensaje: "Usuario registrado con éxito", usuarioId });
    } catch (err) {
        if (err.code === '23505') {
            if (err.detail.includes('email')) return res.status(400).json({ error: "El correo electrónico ya está registrado." });
            if (err.detail.includes('dni')) return res.status(400).json({ error: "El DNI ingresado ya está registrado." });
            if (err.detail.includes('patente')) return res.status(400).json({ error: "La patente ingresada ya está registrada." });
        }
        res.status(500).json({ error: "Error al crear la cuenta: " + err.message });
    }
});

// ==========================================
// 2. INICIO DE SESIÓN (LOGIN)
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(`SELECT * FROM usuarios WHERE email = $1 AND password = $2`, [email, password]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Credenciales incorrectas." });
        }
        const user = result.rows[0];
        delete user.password;
        res.status(200).json({ mensaje: "Login exitoso", usuario: user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. EDITAR / ACTUALIZAR PERFIL
// ==========================================
app.put('/api/perfil/:usuarioId', async (req, res) => {
    const { usuarioId } = req.params;
    const {
        nombre, dni, domicilio, telefono, licencia,
        patente, marca, modelo, anio, motor, chasis,
        aseguradora, poliza, vencimiento
    } = req.body;

    const sql = `UPDATE usuarios SET 
                    conductor_nombre = $1, conductor_dni = $2, conductor_domicilio = $3, conductor_telefono = $4, conductor_licencia = $5,
                    vehiculo_patente = $6, vehiculo_marca = $7, vehiculo_modelo = $8, vehiculo_anio = $9, vehiculo_motor = $10, vehiculo_chasis = $11,
                    seguro_aseguradora = $12, seguro_poliza = $13, seguro_vencimiento = $14
                 WHERE id = $15`;

    const params = [nombre, dni, domicilio, telefono, licencia, patente, marca, modelo, parseInt(anio), motor || null, chasis || null, aseguradora, poliza, vencimiento, usuarioId];

    try {
        await pool.query(sql, params);
        const result = await pool.query(`SELECT * FROM usuarios WHERE id = $1`, [usuarioId]);
        const user = result.rows[0];
        delete user.password;
        res.status(200).json({ mensaje: "Perfil actualizado", usuario: user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 4. GENERAR PIN (MODO CHOQUE)
// ==========================================
app.post('/api/choque/activar', async (req, res) => {
    const { usuarioId } = req.body;
    if (!usuarioId) return res.status(400).json({ error: "Falta usuarioId." });

    try {
        await pool.query(`DELETE FROM pines_activos WHERE usuario_id = $1`, [usuarioId]);
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        
        const sql = `INSERT INTO pines_activos (pin, usuario_id, expiracion) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`;
        await pool.query(sql, [pin, usuarioId]);

        res.status(200).json({ mensaje: "PIN generado con éxito.", pin: pin });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 5. INTERCAMBIAR DATOS POR PIN (CON SNAPSHOT)
// ==========================================
app.post('/api/choque/intercambiar', async (req, res) => {
    const { usuarioId, pinIngresado } = req.body;

    try {
        const pinResult = await pool.query(`SELECT usuario_id FROM pines_activos WHERE pin = $1 AND expiracion > NOW()`, [pinIngresado]);
        if (pinResult.rows.length === 0) {
            return res.status(404).json({ error: "El PIN es inválido o ya expiró." });
        }

        const usuarioEmisorId = pinResult.rows[0].usuario_id;
        if (usuarioEmisorId === usuarioId) {
            return res.status(400).json({ error: "No puedes ingresar tu propio PIN." });
        }

        const emisorResult = await pool.query(`SELECT * FROM usuarios WHERE id = $1`, [usuarioEmisorId]);
        const datosEmisor = emisorResult.rows[0];

        const receptorResult = await pool.query(`SELECT * FROM usuarios WHERE id = $1`, [usuarioId]);
        const datosReceptor = receptorResult.rows[0];

        const intercambioId = 'int_' + crypto.randomBytes(4).toString('hex');
        
        const sqlInsertHistorial = `
            INSERT INTO historial_intercambios (
                id, usuario_emisor_id, usuario_receptor_id,
                emisor_nombre, emisor_telefono, emisor_patente, emisor_aseguradora, emisor_poliza,
                receptor_nombre, receptor_telefono, receptor_patente, receptor_aseguradora, receptor_poliza
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `;
        
        const paramsHistorial = [
            intercambioId, usuarioEmisorId, usuarioId,
            datosEmisor.conductor_nombre, datosEmisor.conductor_telefono, datosEmisor.vehiculo_patente, datosEmisor.seguro_aseguradora, datosEmisor.seguro_poliza,
            datosReceptor.conductor_nombre, datosReceptor.conductor_telefono, datosReceptor.vehiculo_patente, datosReceptor.seguro_aseguradora, datosReceptor.seguro_poliza
        ];

        await pool.query(sqlInsertHistorial, paramsHistorial);
        await pool.query(`DELETE FROM pines_activos WHERE pin = $1`, [pinIngresado]);

        res.status(200).json({
            mensaje: "Intercambio realizado con éxito.",
            datosRecibidos: {
                conductor: { nombre: datosEmisor.conductor_nombre, dni: datosEmisor.conductor_dni, domicilio: datosEmisor.conductor_domicilio, telefono: datosEmisor.conductor_telefono, licencia: datosEmisor.conductor_licencia },
                vehiculo: { patente: datosEmisor.vehiculo_patente, marca: datosEmisor.vehiculo_marca, modelo: datosEmisor.vehiculo_modelo, anio: datosEmisor.vehiculo_anio, motor: datosEmisor.vehiculo_motor, chasis: datosEmisor.vehiculo_chasis },
                seguro: { aseguradora: datosEmisor.seguro_aseguradora, poliza: datosEmisor.seguro_poliza, vencimiento: datosEmisor.seguro_vencimiento }
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 6. VER HISTORIAL LEyendo DESDE EL SNAPSHOT
// ==========================================
app.get('/api/choque/historial/:usuarioId', async (req, res) => {
    const { usuarioId } = req.params;
    
    const sql = `
        SELECT 
            id,
            fecha_intercambio,
            CASE WHEN usuario_emisor_id = $1 THEN receptor_nombre ELSE emisor_nombre END AS conductor_nombre,
            CASE WHEN usuario_emisor_id = $1 THEN receptor_telefono ELSE emisor_telefono END AS conductor_telefono,
            CASE WHEN usuario_emisor_id = $1 THEN receptor_patente ELSE emisor_patente END AS vehiculo_patente,
            CASE WHEN usuario_emisor_id = $1 THEN receptor_aseguradora ELSE emisor_aseguradora END AS seguro_aseguradora,
            CASE WHEN usuario_emisor_id = $1 THEN receptor_poliza ELSE emisor_poliza END AS seguro_poliza
        FROM historial_intercambios 
        WHERE usuario_emisor_id = $1 OR usuario_receptor_id = $1
        ORDER BY fecha_intercambio DESC
    `;
    
    try {
        const result = await pool.query(sql, [usuarioId]);
        res.status(200).json({ historial: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor de producción listo");
});