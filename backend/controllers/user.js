var User = require('../models/user');
var Publication = require('../models/publication');
var Follow = require('../models/follow');
var bcrypt = require('bcrypt-nodejs');
var jwt = require('../services/jwt');
var fs = require('fs');
var path = require('path');

var mongoosePaginate = require('mongoose-pagination');

//********************************//
//      GUARDAR UN USUARIO                  
//********************************//

function saveUser(req, res) {
    var params = req.body;
    var user = new User();

    if (params.name && params.surname && params.nick &&
        params.email && params.password) {

        user.name = params.name;
        user.surname = params.surname;
        user.nick = params.nick;
        user.email = params.email;
        user.role = 'ROLE_USER';
        user.image = null;

        // Si existe un email o '$or' existe un nick almacenado en la BD
        User.find({
            $or: [
                { email: user.email.toLowerCase() },
                { nick: user.nick.toLowerCase() }
            ]
        }).exec((err, users) => {
            if (err) return res.status(500).send({ message: 'Error en la petición de usuarios' });

            if (users && users.length >= 1) {
                res.status(200).send({ message: 'El email o nick ingresado ya existe' });
            } else {
                // Sino existe nick y email repetido entonces registra un nuevo usuario ...
                bcrypt.hash(params.password, null, null, (err, hash) => {
                    user.password = hash;

                    user.save((err, userStored) => {
                        if (err) return res.status(500).send({ message: 'Error al guardar el usuario' });

                        if (userStored) {
                            res.status(200).send({ user: userStored });
                        } else {
                            res.status(400).send({ message: 'No se ha registrado el usuario' });
                        }
                    });
                });
            }
        });


    } else {
        res.status(200).send({ message: 'Ingresa todos los campos' });
    }
}


//********************************//
//      LOGIN  USUARIO                  
//********************************//

function loginUser(req, res) {

    var params = req.body;

    var email = params.email;
    var password = params.password;

    User.findOne({ email: email }, (err, user) => {
        if (err) return res.status(500).send({ message: 'Error en la petición' });

        if (user) {
            bcrypt.compare(password, user.password, (err, check) => {
                if (check) {
                    user.password = undefined;
                    res.status(200).send({ user: user, token: jwt.createToken(user) });
                } else {
                    return res.status(404).send({ message: 'Error en la contraseña' });
                }
            });
        } else {
            return res.status(404).send({ message: 'El usuario no pudo ser encontrado' });
        }
    });
}

//****************************************************************************//
//     OBTENER  USUARIO POR ID
//     Y MOSTRAR SI EL USUARIO IDENTIFICADO POR TOKEN LE SIGUE AL ID DE LA URL
//     Y SI EL USUARIO ID LE SIGUE AL IUSUARIO IDENTIFICADO POR TOKEN                     
//*****************************************************************************//

function getUser(req, res) {

    var userId = req.params.id;

    User.findById(userId, (err, user) => {

        if (err) return res.status(500).send({ message: 'Error en la petición' });

        if (!user) return res.status(404).send({ message: 'El usuario no existe' });

        user.password = undefined;

        followThisUser(req.user.sub, userId).then((value) => {

            return res.status(200).send({
                user,
                following: value.following,
                followed: value.followed
            });
        });
    });
}


/*     ***** ASYNC AWAIT *****      */

async function followThisUser(identity_user_id, user_id) {

    var following = await Follow.findOne({ user: identity_user_id, followed: user_id }).exec()
        .then((following) => {
            return following;
        })
        .catch((err) => {
            return handleError(err);
        });

    var followed = await Follow.findOne({ user: user_id, followed: identity_user_id }).exec()
        .then((followed) => {
            return followed;
        })
        .catch((err) => {
            return handleError(err);
        });

    return {
        following: following,
        followed: followed
    };

}


//***********************************************************************//
//    OBTENER TODO EL LISTADO DE USUARIOS PAGINADO 
//    LISTA DE USUARIOS QUE EL USUARIO IDENTIFICADO POR EL TOKEN SIGUE
//    LISTA DE USUARIOS QUE SIGUEN AL USUARIO IDENTIFICADO POR EL TOKEN
//***********************************************************************//

function getUsers(req, res) {

    // recoge el id del usuario logueado del token decodificado 
    // sub es el nombre de la variable que pusimos para el id. el los servicios de jwt.js
    var identity_user_id = req.user.sub;

    var page = 1;
    // si existe 'page' en la url ...
    if (req.params.page) {
        page = req.params.page;
    }
    // 5 usuarios por página
    var itemsPerPage = 5;

    // 'paginate' viene de la libreria de mongoose pagination
    User.find().paginate(page, itemsPerPage, (err, users, total) => {

        if (err) return res.status(500).send({ message: 'Error en la petición' });

        if (!users) return res.status(404).send({ message: 'No hay usuarios disponibles' });

        followUserIds(identity_user_id).then((value) => {

            return res.status(200).send({
                users,
                users_following: value.following,
                users_follow_me: value.followed,
                total,
                pages: Math.ceil(total / itemsPerPage) // obtenemos el número de páginas
            });

        });

    });

}

/*     ***** ASYNC AWAIT *****      */
async function followUserIds(user_id) {

    // solo quiero que muestre el followed, los usuarios que sigue el usuario logueado
    var following = await Follow.find({ user: user_id }).select({ _id: 0, __v: 0, user: 0 }).exec()
        .then((follows) => {

            var follows_clean = [];

            follows.forEach((follow) => {
                follows_clean.push(follow.followed);
            });
            return follows_clean;
        })
        .catch((err) => {
            return handleError(err);
        });

    // solo quiero que muestre el user, los usuarios que le siguen al usuario logueado
    var followed = await Follow.find({ followed: user_id }).select({ _id: 0, __v: 0, followed: 0 }).exec()
        .then((follows) => {

            var follows_clean = [];

            follows.forEach((follow) => {
                follows_clean.push(follow.user);
            });

            return follows_clean;
        })
        .catch((err) => {
            return handleError(err);
        });

    return {
        following,
        followed
    };
}

//********************************************//
//     CONTADOR DE FOLLOWING Y FOLLOWERS                
//*******************************************//

function getCounters(req, res) {

    var userId = req.user.sub;

    if (req.params.id) {
        userId = req.params.id;
    }

    getCounteFollow(userId).then((value) => {
        return res.status(200).send(value);
    });
}

/*     ***** ASYNC AWAIT *****      */

async function getCounteFollow(user_id) {

    var following = await Follow.count({ user: user_id }).exec()
        .then((count) => {
            return count;
        })
        .catch((err) => {
            return handleError(err);
        });

    var followed = await Follow.count({ followed: user_id }).exec()
        .then((count) => {
            return count;
        })
        .catch((err) => {
            return handleError(err);
        });

    var publications = await Publication.count({ user: user_id }).exec()
        .then((count) => {
            return count;
        })
        .catch((err) => {
            return handleError(err);
        });

    return {
        following,
        followed,
        publications
    };
}


//********************************//
//     ACTUALIZAR  USUARIO                   
//********************************//

function updateUser(req, res) {

    var userId = req.params.id;
    var params = req.body;

    // Borramos el password
    delete params.password;
    // Comprobamos si el id que ingresa por url es igual al id 'req.user.sub' que es identificado por el token
    if (userId != req.user.sub) {
        return res.status(500).send({ message: 'No tienes permiso para actualizar los datos del usuario' });
    }
    // Si existe un email o un nick repetido
    User.find({
        $or: [
            { email: params.email },
            { nick: params.nick }
        ]
    }).exec((err, users) => {

        var similar_datas = false;

        users.forEach((user) => {
            if (user && user._id != userId) similar_datas = true;
        });

        if (similar_datas) return res.status(404).send({ message: 'Los datos ya están en uso' });

        // new: true devuelve el objeto actualizado
        User.findByIdAndUpdate(userId, params, { new: true, useFindAndModify: false }, (err, userUpdate) => {
            if (err) return res.status(500).send({ message: 'Error en la petición' });

            if (!userUpdate) return res.status(404).send({ message: 'No se ha podido actualizar el usuario' });

            return res.status(200).send({ user: userUpdate });
        });
    });
}

//****************************************//
//     SUBIR ARCHIVOS DE IMG DE USUARIO                   
//***************************************//

function uploadImage(req, res) {

    var userId = req.params.id;

    if (req.files) {
        var file_path = req.files.image.path;
        var file_split = file_path.split('\\');
        var file_name = file_split[2];
        var ext_split = file_name.split('\.');
        var file_ext = ext_split[1];

        // Comprobamos si el id que ingresa por url es igual al id 'req.user.sub' que es identificado por el token
        if (userId != req.user.sub) {
            // no se subira el archivo a la carpeta
            return removeFilesUploads(res, file_path, 'El usuario no tiene permiso para subir la imagen');
        }


        if (file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif') {
            // Actualizar documento de usuario logueado
            User.findByIdAndUpdate(userId, { image: file_name }, { new: true }, (err, userUpdate) => {
                if (err) return res.status(500).send({ message: 'Error en la petición' });

                if (!userUpdate) return res.status(404).send({ message: 'No se ha podido actualizar el usuario' });

                return res.status(200).send({ user: userUpdate });
            });

        } else {
            // si el archivo de img no tiene las extensiones entonces se elimina la img
            return removeFilesUploads(res, file_path, 'Extensión no válida');
        }
    } else {
        return res.status(404).send({ message: 'No se subió la imagen' });
    }

}

//****************************************//
//     OBTENER EL ARCHIVO IMAGEN                   
//***************************************//

function getImageFile(req, res) {

    var image_file = req.params.imageFile;
    var path_file = './uploads/users/' + image_file;

    fs.exists(path_file, (exists) => {
        if (exists) {
            res.sendFile(path.resolve(path_file));
        } else {
            return res.status(200).send({ message: 'No existe la imagen' });
        }
    });
}


function removeFilesUploads(res, file_path, message) {
    fs.unlink(file_path, (err) => {
        return res.status(404).send({ message: message });
    });
}

module.exports = {
    saveUser,
    loginUser,
    getUser,
    getUsers,
    updateUser,
    uploadImage,
    getImageFile,
    getCounters
};