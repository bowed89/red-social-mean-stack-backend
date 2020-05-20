var mongoose = require('mongoose');
var app = require('./app');
var port = 3800;

// Conexión a la BD
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/mean_social', { useNewUrlParser: true, useUnifiedTopology: true, })
    .then(() => {
        console.log('La conexión a la BD MEAN SOCIAL se realizó con éxito');

        // Crear Servidor
        app.listen(port, () => {
            console.log('Servidor corriendo en http://localhost:3800');
        })
    })
    .catch(err => console.log(err));