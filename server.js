const express = require('express');
const sql = require('mssql');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// Configuración de la conexión a SQL Server
const config = {
  user: 'sa',
  password: '89709061',
  server: 'localhost\\FISHTALK',
  database: 'AkvaLicenseDB',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

// Conectar a la base de datos SQL Server
sql.connect(config).then(() => {
  console.log('Conectado a la base de datos SQL Server.');
}).catch(err => {
  console.error('Error al conectar a SQL Server:', err);
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Ruta para obtener todos los clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const result = await sql.query`SELECT * FROM Clientes`;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({"error": err.message});
  }
});

// Ruta para obtener los centros de un cliente
app.get('/api/centros/:clienteId', async (req, res) => {
  try {
    const result = await sql.query`
      SELECT c.*, sa.NombreSistema
      FROM Centros c
      JOIN SistemasAlimentacion sa ON c.SistemaID = sa.SistemaID
      WHERE ClienteID = ${req.params.clienteId}
    `;
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error al obtener centros:', err);
    res.status(500).json({"error": err.message});
  }
});

// Ruta para añadir un nuevo cliente
app.post('/api/clientes', async (req, res) => {
  const { NombreCliente } = req.body;
  try {
    // Verificar si el cliente ya existe
    const clienteExistente = await sql.query`SELECT * FROM Clientes WHERE NombreCliente = ${NombreCliente}`;
    if (clienteExistente.recordset.length > 0) {
      return res.status(400).json({"error": "Ya existe un cliente con ese nombre"});
    }

    const result = await sql.query`
      INSERT INTO Clientes (NombreCliente)
      VALUES (${NombreCliente});
      SELECT SCOPE_IDENTITY() AS ClienteID;
    `;
    res.json({
      "message": "Cliente añadido con éxito",
      "clienteId": result.recordset[0].ClienteID
    });
  } catch (err) {
    res.status(500).json({"error": err.message});
  }
});

// Ruta para añadir un nuevo centro
app.post('/api/centros', async (req, res) => {
  const { ClienteID, NombreCentro, NombrePonton, SistemaID, VersionSistema, FechaInstalacionACA, FechaTermino } = req.body;
  try {
    // Verificar si el centro ya existe para ese cliente
    const centroExistente = await sql.query`
      SELECT * FROM Centros 
      WHERE ClienteID = ${ClienteID} AND NombreCentro = ${NombreCentro}
    `;
    if (centroExistente.recordset.length > 0) {
      return res.status(400).json({"error": "Ya existe un centro con ese nombre para este cliente"});
    }

    const result = await sql.query`
      INSERT INTO Centros (ClienteID, NombreCentro, NombrePonton, SistemaID, VersionSistema, FechaInstalacionACA, FechaTermino)
      OUTPUT INSERTED.CentroID
      VALUES (${ClienteID}, ${NombreCentro}, ${NombrePonton}, ${SistemaID}, ${VersionSistema}, ${FechaInstalacionACA}, ${FechaTermino})
    `;
    res.json({ CentroID: result.recordset[0].CentroID, ...req.body });
  } catch (err) {
    console.error('Error al añadir centro:', err);
    res.status(500).json({"error": err.message});
  }
});

// Ruta para actualizar un centro
app.put('/api/centros/:centroId', async (req, res) => {
  const { NombreCentro, NombrePonton, SistemaID, VersionSistema, FechaInstalacionACA, FechaTermino } = req.body;
  try {
    await sql.query`
      UPDATE Centros
      SET NombreCentro = ${NombreCentro},
          NombrePonton = ${NombrePonton},
          SistemaID = ${SistemaID},
          VersionSistema = ${VersionSistema},
          FechaInstalacionACA = ${FechaInstalacionACA},
          FechaTermino = ${FechaTermino}
      WHERE CentroID = ${req.params.centroId}
    `;
    res.json({ message: "Centro actualizado con éxito" });
  } catch (err) {
    console.error('Error al actualizar centro:', err);
    res.status(500).json({"error": err.message});
  }
});

// Ruta para obtener el estado mensual de los centros
app.get('/api/estado-mensual', async (req, res) => {
  const { clienteId, año, mes } = req.query;
  try {
    const result = await sql.query`
      SELECT c.*, sa.NombreSistema, emc.EstadoID, emc.CentroConAnalytics, emc.Comentarios
      FROM Centros c
      LEFT JOIN EstadoMensualCentros emc ON c.CentroID = emc.CentroID AND emc.Año = ${año} AND emc.Mes = ${mes}
      LEFT JOIN SistemasAlimentacion sa ON c.SistemaID = sa.SistemaID
      WHERE c.ClienteID = ${clienteId}
        AND c.FechaInstalacionACA <= EOMONTH(DATEFROMPARTS(${año}, ${mes}, 1))
        AND (c.FechaTermino IS NULL OR c.FechaTermino >= DATEFROMPARTS(${año}, ${mes}, 1))
    `;
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error al obtener estado mensual:', err);
    res.status(500).json({"error": err.message});
  }
});

// Ruta para actualizar o insertar el estado mensual de un centro
app.post('/api/estado-mensual', async (req, res) => {
  const estados = req.body;
  try {
    for (const estado of estados) {
      await sql.query`
        MERGE INTO EstadoMensualCentros AS target
        USING (VALUES (${estado.CentroID}, ${estado.Año}, ${estado.Mes}, ${estado.EstadoID}, ${estado.CentroConAnalytics}, ${estado.Comentarios}))
          AS source (CentroID, Año, Mes, EstadoID, CentroConAnalytics, Comentarios)
        ON target.CentroID = source.CentroID AND target.Año = source.Año AND target.Mes = source.Mes
        WHEN MATCHED THEN
          UPDATE SET
            EstadoID = source.EstadoID,
            CentroConAnalytics = source.CentroConAnalytics,
            Comentarios = source.Comentarios
        WHEN NOT MATCHED THEN
          INSERT (CentroID, Año, Mes, EstadoID, CentroConAnalytics, Comentarios)
          VALUES (source.CentroID, source.Año, source.Mes, source.EstadoID, source.CentroConAnalytics, source.Comentarios);
      `;
    }
    res.json({ message: "Estados mensuales actualizados con éxito" });
  } catch (err) {
    console.error('Error al actualizar estados mensuales:', err);
    res.status(500).json({"error": err.message});
  }
});

// Ruta para obtener los años disponibles
app.get('/api/años', async (req, res) => {
  try {
    const result = await sql.query`SELECT * FROM Años ORDER BY Año DESC`;
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error al obtener años:', err);
    res.status(500).json({"error": err.message});
  }
});

// Ruta para obtener los sistemas de alimentación
app.get('/api/sistemas-alimentacion', async (req, res) => {
  try {
    const result = await sql.query`SELECT * FROM SistemasAlimentacion`;
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error al obtener sistemas de alimentación:', err);
    res.status(500).json({"error": err.message});
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});