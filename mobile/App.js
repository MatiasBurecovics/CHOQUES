import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';

// ⚠️ REEMPLAZA CON LA IP DE TU COMPUTADORA
const API_URL = 'https://choques.onrender.com'; 

const App = () => {
  const [pantalla, setPantalla] = useState('login'); // login, registro, home, editar, historial
  const [cargando, setCargando] = useState(false);
  const [usuarioId, setUsuarioId] = useState('');
  const [pinGenerado, setPinGenerado] = useState('');
  const [pinIngresado, setPinIngresado] = useState('');
  const [historial, setHistorial] = useState([]);

  // Datos de Cuenta de Acceso
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Formulario de Perfil (Conductor, Vehículo, Seguro)
  const [nombre, setNombre] = useState('Juan Pérez');
  const [dni, setDni] = useState('35123456');
  const [domicilio, setDomicilio] = useState('Av. Corrientes 1234, CABA');
  const [telefono, setTelefono] = useState('+54 11 9999-8888');
  const [licencia, setLicencia] = useState('LIC-ABC-123');
  const [patente, setPatente] = useState('AA123BB');
  const [marca, setMarca] = useState('Volkswagen');
  const [modelo, setModelo] = useState('Gol Trend');
  const [anio, setAnio] = useState('2018');
  const [aseguradora, setAseguradora] = useState('La Caja Seguros');
  const [poliza, setPoliza] = useState('POL-999-888');
  const [vencimiento, setVencimiento] = useState('2027-12-31');

  // Función para rellenar los estados del formulario con la data del servidor
  const mapearDatosUsuario = (usuario) => {
    setUsuarioId(usuario.id);
    setNombre(usuario.conductor_nombre);
    setDni(usuario.conductor_dni);
    setDomicilio(usuario.conductor_domicilio);
    setTelefono(usuario.conductor_telefono);
    setLicencia(usuario.conductor_licencia);
    setPatente(usuario.vehiculo_patente);
    setMarca(usuario.vehiculo_marca);
    setModelo(usuario.vehiculo_modelo);
    setAnio(usuario.vehiculo_anio.toString());
    setAseguradora(usuario.seguro_aseguradora);
    setPoliza(usuario.seguro_poliza);
    setVencimiento(usuario.seguro_vencimiento);
  };

  // INICIAR SESIÓN (LOGIN)
  const manejarLogin = async () => {
    if (!email || !password) return Alert.alert("Error", "Completa el email y la contraseña.");
    Keyboard.dismiss();
    setCargando(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok) {
        mapearDatosUsuario(data.usuario);
        setPantalla('home');
      } else {
        Alert.alert("Error de Acceso", data.error);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo conectar al servidor.");
    } finally {
      setCargando(false);
    }
  };

  // CREAR CUENTA NUEVA (REGISTRO)
  const manejarRegistro = async () => {
    if (!email || !password) return Alert.alert("Error", "Carga el email y la contraseña para tu cuenta.");
    Keyboard.dismiss();
    setCargando(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, password, nombre, dni, domicilio, telefono, licencia,
          patente, marca, modelo, anio: parseInt(anio),
          aseguradora, poliza, vencimiento
        })
      });
      const data = await response.json();
      if (response.ok) {
        setUsuarioId(data.usuarioId);
        Alert.alert("Éxito", "Tu cuenta y perfil fueron creados de forma profesional.");
        setPantalla('home');
      } else {
        Alert.alert("Error de registro", data.error);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo procesar el registro.");
    } finally {
      setCargando(false);
    }
  };

  // ACTUALIZAR PERFIL (EDICIÓN)
  const actualizarPerfil = async () => {
    Keyboard.dismiss();
    setCargando(true);
    try {
      const response = await fetch(`${API_URL}/api/perfil/${usuarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre, dni, domicilio, telefono, licencia,
          patente, marca, modelo, anio: parseInt(anio),
          aseguradora, poliza, vencimiento
        })
      });
      const data = await response.json();
      if (response.ok) {
        mapearDatosUsuario(data.usuario);
        Alert.alert("Éxito", "Tus datos públicos fueron actualizados.");
        setPantalla('home');
      } else {
        Alert.alert("Error", data.error);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el perfil.");
    } finally {
      setCargando(false);
    }
  };

  // MODO CHOQUE (GENERAR PIN)
  const activarModoChoque = async () => {
    setCargando(true);
    try {
      const response = await fetch(`${API_URL}/api/choque/activar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId })
      });
      const data = await response.json();
      if (response.ok) setPinGenerado(data.pin);
    } catch (error) {
      Alert.alert("Error", "Problema al generar el código.");
    } finally {
      setCargando(false);
    }
  };

  // INTERCAMBIAR DATOS
  const intercambiarDatos = async () => {
    if (!pinIngresado) return Alert.alert("Error", "Ingresa el PIN.");
    Keyboard.dismiss();
    setCargando(true);
    try {
      const response = await fetch(`${API_URL}/api/choque/intercambiar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId, pinIngresado })
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert("Intercambio Exitoso", `Datos guardados de: ${data.datosRecibidos.conductor.nombre}`);
        setPinIngresado('');
        cargarHistorial();
      } else {
        Alert.alert("Error", data.error);
      }
    } catch (error) {
      Alert.alert("Error", "No se procesó el PIN.");
    } finally {
      setCargando(false);
    }
  };

  // CARGAR HISTORIAL
  const cargarHistorial = async () => {
    try {
      const response = await fetch(`${API_URL}/api/choque/historial/${usuarioId}`);
      const data = await response.json();
      if (response.ok) {
        setHistorial(data.historial);
        setPantalla('historial');
      }
    } catch (error) {
      Alert.alert("Error", "No se obtuvo el historial.");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚡ Intercambio Choque</Text>
          {usuarioId && pantalla === 'home' ? (
            <TouchableOpacity onPress={() => setPantalla('login')}>
              <Text style={{color: '#FCA5A5', fontWeight: 'bold'}}>Salir</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {cargando && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}

        {/* PANTALLA DE LOGIN */}
        {pantalla === 'login' && (
          <View style={styles.panelAuth}>
            <Text style={styles.subTitle}>Ingreso Seguro</Text>
            <TextInput style={styles.input} placeholder="Correo electrónico" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            <TextInput style={styles.input} placeholder="Contraseña" secureTextEntry={true} value={password} onChangeText={setPassword} />
            
            <TouchableOpacity style={styles.btnPrincipal} onPress={manejarLogin}>
              <Text style={styles.btnText}>Iniciar Sesión</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.btnLink} onPress={() => setPantalla('registro')}>
              <Text style={styles.btnLinkText}>¿No tenés cuenta? Create una acá</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PANTALLA DE REGISTRO */}
        {pantalla === 'registro' && (
          <ScrollView style={styles.scroll}>
            <Text style={styles.sectionTitle}>0. Credenciales de la App</Text>
            <TextInput style={styles.input} placeholder="Email de la cuenta" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            <TextInput style={styles.input} placeholder="Contraseña de acceso" secureTextEntry={true} value={password} onChangeText={setPassword} />

            <Text style={styles.sectionTitle}>1. Datos del Conductor</Text>
            <TextInput style={styles.input} placeholder="Nombre y Apellido" value={nombre} onChangeText={setNombre} />
            <TextInput style={styles.input} placeholder="DNI" keyboardType="numeric" value={dni} onChangeText={setDni} />
            <TextInput style={styles.input} placeholder="Domicilio" value={domicilio} onChangeText={setDomicilio} />
            <TextInput style={styles.input} placeholder="Teléfono" keyboardType="phone-pad" value={telefono} onChangeText={setTelefono} />
            <TextInput style={styles.input} placeholder="Nro Licencia" value={licencia} onChangeText={setLicencia} />

            <Text style={styles.sectionTitle}>2. Datos del Vehículo</Text>
            <TextInput style={styles.input} placeholder="Patente / Dominio" value={patente} onChangeText={setPatente} />
            <TextInput style={styles.input} placeholder="Marca" value={marca} onChangeText={setMarca} />
            <TextInput style={styles.input} placeholder="Modelo" value={modelo} onChangeText={setModelo} />
            <TextInput style={styles.input} placeholder="Año" keyboardType="numeric" value={anio} onChangeText={setAnio} />

            <Text style={styles.sectionTitle}>3. Datos del Seguro</Text>
            <TextInput style={styles.input} placeholder="Compañía Aseguradora" value={aseguradora} onChangeText={setAseguradora} />
            <TextInput style={styles.input} placeholder="Número de Póliza" value={poliza} onChangeText={setPoliza} />
            <TextInput style={styles.input} placeholder="Vencimiento (AAAA-MM-DD)" value={vencimiento} onChangeText={setVencimiento} />

            <TouchableOpacity style={styles.btnPrincipal} onPress={manejarRegistro}>
              <Text style={styles.btnText}>Crear Cuenta y Registrar</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* PANTALLA HOME */}
        {pantalla === 'home' && (
          <View style={styles.panelHome}>
            <Text style={styles.subTitle}>¡Hola, {nombre}!</Text>
            
            <View style={styles.cardAccion}>
              <TouchableOpacity style={styles.btnPeligro} onPress={activarModoChoque}>
                <Text style={styles.btnText}>🚨 GENERAR MI PIN</Text>
              </TouchableOpacity>
              {pinGenerado ? (
                <View style={styles.boxPin}>
                  <Text style={styles.textPin}>{pinGenerado}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.cardAccion}>
              <TextInput style={[styles.input, {textAlign: 'center', fontSize: 22, letterSpacing: 5}]} placeholder="0000" maxLength={4} keyboardType="numeric" value={pinIngresado} onChangeText={setPinIngresado} />
              <TouchableOpacity style={styles.btnSuccess} onPress={intercambiarDatos}>
                <Text style={styles.btnText}>📥 INTERCAMBIAR DATOS</Text>
              </TouchableOpacity>
            </View>

            <View style={{flexDirection: 'row', justifyContent: 'space-around', marginTop: 15}}>
              <TouchableOpacity style={styles.btnLink} onPress={cargarHistorial}>
                <Text style={styles.btnLinkText}>📁 Historial</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnLink} onPress={() => setPantalla('editar')}>
                <Text style={styles.btnLinkText}>⚙️ Editar Perfil</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PANTALLA EDITAR PERFIL */}
        {pantalla === 'editar' && (
          <ScrollView style={styles.scroll}>
            <Text style={styles.sectionTitle}>Modificar mis datos públicos</Text>
            
            <Text style={styles.labelField}>Conductor</Text>
            <TextInput style={styles.input} value={nombre} onChangeText={setNombre} />
            <TextInput style={styles.input} keyboardType="numeric" value={dni} onChangeText={setDni} />
            <TextInput style={styles.input} value={domicilio} onChangeText={setDomicilio} />
            <TextInput style={styles.input} keyboardType="phone-pad" value={telefono} onChangeText={setTelefono} />
            <TextInput style={styles.input} value={licencia} onChangeText={setLicencia} />

            <Text style={styles.sectionTitle}>Vehículo</Text>
            <TextInput style={styles.input} value={patente} onChangeText={setPatente} />
            <TextInput style={styles.input} value={marca} onChangeText={setMarca} />
            <TextInput style={styles.input} value={modelo} onChangeText={setModelo} />
            <TextInput style={styles.input} keyboardType="numeric" value={anio} onChangeText={setAnio} />

            <Text style={styles.sectionTitle}>Seguro</Text>
            <TextInput style={styles.input} value={aseguradora} onChangeText={setAseguradora} />
            <TextInput style={styles.input} value={poliza} onChangeText={setPoliza} />
            <TextInput style={styles.input} value={vencimiento} onChangeText={setVencimiento} />

            <TouchableOpacity style={styles.btnSuccess} onPress={actualizarPerfil}>
              <Text style={styles.btnText}>Guardar Cambios</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnPrincipal, {backgroundColor: '#64748B'}]} onPress={() => setPantalla('home')}>
              <Text style={styles.btnText}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* PANTALLA DE HISTORIAL */}
        {pantalla === 'historial' && (
          <ScrollView style={styles.scroll}>
            <Text style={styles.sectionTitle}>Historial de Intercambios</Text>
            {historial.length === 0 ? <Text style={styles.noData}>No tenés registros guardados aún.</Text> : null}
            {historial.map((item, index) => (
              <View key={index} style={styles.cardHistorial}>
                <Text style={styles.histFecha}>{new Date(item.fecha_intercambio).toLocaleString()}</Text>
                <Text style={styles.histNombre}>👤 {item.conductor_nombre}</Text>
                <Text style={styles.histDetalle}>📞 Tel: {item.conductor_telefono}</Text>
                <Text style={styles.histDetalle}>🚗 Patente: {item.vehiculo_patente}</Text>
                <Text style={styles.histDetalle}>🛡️ Seguro: {item.seguro_aseguradora}</Text>
                <Text style={styles.histDetalle}>📄 Póliza: {item.seguro_poliza}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.btnPrincipal} onPress={() => setPantalla('home')}>
              <Text style={styles.btnText}>Volver</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9', paddingTop: 50 },
  header: { backgroundColor: '#1E293B', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  scroll: { padding: 20 },
  panelAuth: { padding: 30, flex: 1, justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginTop: 15, marginBottom: 10 },
  subTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', textAlign: 'center', marginBottom: 25 },
  labelField: { fontSize: 12, color: '#64748B', marginBottom: 2, marginLeft: 2 },
  input: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 10, fontSize: 16 },
  btnPrincipal: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15, marginBottom: 10 },
  pPeligro: { backgroundColor: '#EF4444' },
  btnPeligro: { backgroundColor: '#EF4444', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnSuccess: { backgroundColor: '#10B981', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  panelHome: { padding: 20, flex: 1, justifyContent: 'center' },
  cardAccion: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 20, elevation: 3 },
  boxPin: { marginTop: 15, alignItems: 'center', backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8 },
  textPin: { fontSize: 42, fontWeight: 'bold', color: '#991B1B', letterSpacing: 5 },
  btnLink: { alignItems: 'center', marginVertical: 10 },
  btnLinkText: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
  loader: { position: 'absolute', top: '50%', left: '50%', zIndex: 10 },
  cardHistorial: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  histFecha: { fontSize: 11, color: '#94A3B8', textAlign: 'right' },
  histNombre: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 5 },
  histDetalle: { fontSize: 14, color: '#475569', marginBottom: 2 },
  noData: { textAlign: 'center', color: '#64748B', marginVertical: 30 }
});

export default App;