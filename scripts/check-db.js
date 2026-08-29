'use strict';

const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('../src/config/database');

async function checkDatabase() {
  const connection = await mysql.createConnection(getDatabaseConfig());

  try {
    const [rows] = await connection.query(
      'SELECT DATABASE() AS database_name, VERSION() AS server_version, UTC_TIMESTAMP(3) AS checked_at_utc'
    );

    const info = rows[0];
    console.log('Conexão MySQL estabelecida com sucesso.');
    console.log(`Banco: ${info.database_name}`);
    console.log(`Servidor: ${info.server_version}`);
    console.log(`Verificado em UTC: ${info.checked_at_utc}`);
  } finally {
    await connection.end();
  }
}

checkDatabase().catch((error) => {
  console.error('Falha na conexão MySQL:', error.message);
  process.exitCode = 1;
});
