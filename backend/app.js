var express = require('express');
var bodyParser = require('body-parser');

var app = express();

/* CARGAR RUTAS */

var user_routes = require('./routes/user');
var follow_routes = require('./routes/follow');
var publication_routes = require('./routes/publication');
var message_routes = require('./routes/message');

/* MIDDLEWARES  */

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // Cada petición que se obtenga se convierte en JSON


/* CORS */

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');

    next();
});

/* RUTAS */

app.use('/api', user_routes);
app.use('/api', follow_routes);
app.use('/api', publication_routes);
app.use('/api', message_routes);

/* EXPORTAR */
module.exports = app;