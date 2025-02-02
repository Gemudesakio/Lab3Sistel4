// Paquete necesario para conectar a bases de datos MySQL.
var mysql = require('mysql');
// Parámetros de conexión a la base de datos
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'universidad',
    port: 3306
});
// Función que permite comprobar la conexión a la base de datos
connection.connect(function (error) {

    if (error) {
        throw error;
    } else {
        console.log('Conexion correcta.');
    }
});

// Función que devolverá resultados de la base de datos
const consultasDB = ( query ) => {
    return new Promise((resolve, reject) => {
        connection.query(query, (error, results, fields) => {
          if (error) return reject(error);  // <-- Se rechaza la promesa y se pasa el motivo
          return resolve(results) // <-- Se resuelve la promesa y se para el resultado
        })
    })
}

module.exports = {
    consultasDB
};