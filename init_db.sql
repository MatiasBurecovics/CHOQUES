-- ========================================================
-- SCRIPT SQL COMPLETO: SISTEMA DE INTERCAMBIO DE DATOS (CHOCASTE)
-- ========================================================

-- Limpieza preventiva de tablas para poder re-ejecutar el script limpiamente
DROP TABLE IF EXISTS historial_intercambios;
DROP TABLE IF EXISTS pines_activos;
DROP TABLE IF EXISTS usuarios;

-- --------------------------------------------------------
-- 1. CREACIÓN DE LA TABLA DE USUARIOS (PERFILES)
-- --------------------------------------------------------
CREATE TABLE usuarios (
    id TEXT PRIMARY KEY,                       -- ID único del usuario (UUID o similar)
    
    -- 1. Datos del Conductor
    conductor_nombre TEXT NOT NULL,
    conductor_dni TEXT NOT NULL UNIQUE,
    conductor_domicilio TEXT NOT NULL,
    conductor_telefono TEXT NOT NULL,
    conductor_licencia TEXT NOT NULL,
    
    -- 2. Datos del Vehículo
    vehiculo_patente TEXT NOT NULL UNIQUE,
    vehiculo_marca TEXT NOT NULL,
    vehiculo_modelo TEXT NOT NULL,
    vehiculo_anio INTEGER NOT NULL,
    vehiculo_motor TEXT,                       -- Opcional
    vehiculo_chasis TEXT,                      -- Opcional
    
    -- 3. Datos del Seguro
    seguro_aseguradora TEXT NOT NULL,
    seguro_poliza TEXT NOT NULL,
    seguro_vencimiento TEXT NOT NULL           -- Formato ISO: YYYY-MM-DD
);

-- --------------------------------------------------------
-- 2. CREACIÓN DE LA TABLA DE PINES TEMPORALES
-- --------------------------------------------------------
CREATE TABLE pines_activos (
    pin TEXT PRIMARY KEY,                      -- El PIN de 4 números (ej: '4732')
    usuario_id TEXT NOT NULL,
    fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP,
    expiracion TEXT NOT NULL,                  -- Límite de tiempo
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- 3. CREACIÓN DEL HISTORIAL DE INTERCAMBIOS DE DATOS
-- --------------------------------------------------------
CREATE TABLE historial_intercambios (
    id TEXT PRIMARY KEY,
    usuario_emisor_id TEXT NOT NULL,           -- El que generó el PIN (Fue chocado)
    usuario_receptor_id TEXT NOT NULL,         -- El que cargó el PIN (Chocó)
    fecha_intercambio TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_emisor_id) REFERENCES usuarios(id),
    FOREIGN KEY (usuario_receptor_id) REFERENCES usuarios(id)
);


-- ========================================================
-- SIMULACIÓN DEL ENTORNO (INSERCIÓN DE DATOS DE PRUEBA)
-- ========================================================

-- Insertamos al Conductor A (Juan Pérez - El que va a ser chocado)
INSERT INTO usuarios (id, conductor_nombre, conductor_dni, conductor_domicilio, conductor_telefono, conductor_licencia, vehiculo_patente, vehiculo_marca, vehiculo_modelo, vehiculo_anio, vehiculo_motor, vehiculo_chasis, seguro_aseguradora, seguro_poliza, seguro_vencimiento)
VALUES (
    'usr_juan_111', 
    'Juan Pérez', '35123456', 'Av. Corrientes 1234, CABA', '+54 11 9999-8888', 'LIC-ABC-123',
    'AA123BB', 'Volkswagen', 'Gol Trend', 2018, 'MOT-9999', 'CHA-8888',
    'La Caja Seguros', 'POL-999-888', '2027-12-31'
);

-- Insertamos a la Conductora B (María Rodríguez - La que choca y cargará el PIN)
INSERT INTO usuarios (id, conductor_nombre, conductor_dni, conductor_domicilio, conductor_telefono, conductor_licencia, vehiculo_patente, vehiculo_marca, vehiculo_modelo, vehiculo_anio, vehiculo_motor, vehiculo_chasis, seguro_aseguradora, seguro_poliza, seguro_vencimiento)
VALUES (
    'usr_maria_222', 
    'María Rodríguez', '38987654', 'Calle Florida 555, CABA', '+54 11 7777-6666', 'LIC-XYZ-987',
    'AF987XX', 'Toyota', 'Etios', 2022, 'MOT-1111', 'CHA-2222',
    'Federación Patronal', 'POL-111-222', '2026-11-30'
);


-- ========================================================
-- FLUJO EN ACCIÓN: EL MOMENTO DEL ACCIDENTE
-- ========================================================

-- PASO A: Juan abre la app en el lugar del hecho, activa "Modo Choque" y el sistema le da el PIN '8451'
-- (Configuramos su expiración sumándole 10 minutos a la hora actual)
INSERT INTO pines_activos (pin, usuario_id, expiracion)
VALUES ('8451', 'usr_juan_111', datetime('now', '+10 minutes'));


-- PASO B: María le pide el número a Juan, lo tipea en su app. 
-- El sistema busca en la base de datos si el PIN existe y sigue vigente:
SELECT u.conductor_nombre, u.vehiculo_patente, u.seguro_aseguradora
FROM usuarios u
JOIN pines_activos p ON u.id = p.usuario_id
WHERE p.pin = '8451' AND p.expiracion > datetime('now');


-- PASO C: Al confirmar que todo es correcto, el backend registra el cruce de datos en el historial
INSERT INTO historial_intercambios (id, usuario_emisor_id, usuario_receptor_id)
VALUES ('int_chq_001', 'usr_juan_111', 'usr_maria_222');


-- PASO D: El PIN se elimina inmediatamente por seguridad para que nadie más pueda usarlo
DELETE FROM pines_activos WHERE pin = '8451';


-- ========================================================
-- REVISIÓN DE RESULTADOS (¿QUÉ VE CADA UNO AL DÍA SIGUIENTE?)
-- ========================================================

-- Consulta para María: Ver los datos completos del tipo que la chocó (Juan) desde su historial
SELECT 
    h.fecha_intercambio,
    u.conductor_nombre AS 'Nombre Chofer',
    u.conductor_telefono AS 'Contacto',
    u.vehiculo_patente AS 'Patente',
    u.seguro_aseguradora AS 'Compañía',
    u.seguro_poliza AS 'Nro Póliza'
FROM historial_intercambios h
JOIN usuarios u ON u.id = h.usuario_emisor_id
WHERE h.usuario_receptor_id = 'usr_maria_222';