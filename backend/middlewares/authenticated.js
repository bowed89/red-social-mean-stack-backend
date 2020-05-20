var jwt = require('jwt-simple');
var moment = require('moment');
var secret = 'bowed89';

exports.ensureAuth = function(req, res, next) {

    if (!req.headers.authorization) {
        return res.status(403).send({ message: 'La petición no tiene la cabecera de autenticación' });
    }
    // Si existe en la cabecera de aut. comillas simples y/o dobles, esas comillas se eliminan con replace
    // En 'token' obtenemos el token que se envia por la cabecera

    var token = req.headers.authorization.replace(/['"]+/g, '');

    try {
        var payload = jwt.decode(token, secret);
        // Si el token tiene una fecha menor o igual a la fecha actual se expiró
        if (payload.exp <= moment().unix()) {
            return res.status(401).send({ message: 'El token ha expirado' });
        }

    } catch (ex) {
        return res.status(401).send({ message: 'El token no es válido' });
    }

    // en req-user se guardan los datos del token decodificado del usuario que este enviando dicho token
    req.user = payload;

    // saltamos a la siguiente accion del controlador ...
    next();


};