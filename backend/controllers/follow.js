var mongoosePaginate = require('mongoose-pagination');
var User = require('../models/user');
var Follow = require('../models/follow');


//********************************//
//      SEGUIR A UN USUARIO                  
//********************************//

function saveFollow(req, res) {

    var params = req.body;
    var follow = new Follow();

    follow.user = req.user.sub;
    follow.followed = params.followed;

    follow.save((err, followStored) => {
        if (err) return res.status(500).send({ message: 'Error al guardar el seguimiento' });

        if (!followStored) return res.status(404).send({ message: 'El seguimiento no se ha guardado' });

        res.status(200).send({ follow: followStored });
    });

}

//*************************************//
//      DEJAR DE SEGUIR A UN USUARIO                  
//*************************************//

function deleteFollow(req, res) {

    var userId = req.user.sub;
    var followId = req.params.id;

    Follow.find({ user: userId, followed: followId }).remove(err => {
        if (err) return res.status(500).send({ message: 'Error al dejar de seguir' });

        res.status(200).send({ message: 'Dejaste de seguir a la persona' });

    });
}






//**********************************//
//      OBTENER PERSONAS QUE SIGO                  
//**********************************//

function getFollowingUsers(req, res) {

    var userId = req.user.sub;

    if (req.params.id && req.params.page) {
        userId = req.params.id;
    }

    var page = 1;
    // si existe paginacion en la url
    if (req.params.page) {
        page = req.params.page;
    } else {
        page = req.params.id;
    }

    var itemsPerPage = 2;

    Follow.find({ user: userId }).populate({ path: 'followed' }).paginate(page, itemsPerPage, (err, follows, total) => {

        if (err) return res.status(500).send({ message: 'Error en el servidor' });

        if (!follows) return res.status(404).send({ message: 'No estás siguiendo a ningún usuario' });

        // llamamos a la funcion async await de obtener los ids de los usuarios que sigo ...
        followUserIds(userId).then((value) => {
            return res.status(200).send({
                total,
                pages: Math.ceil(total / itemsPerPage),
                follows,
                users_following: value.following,
                users_follow_me: value.followed
            });

        });

    });

}


/*     OBTENER IDS DE LOS USUARIOS QUE SIGO      */

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


//**********************************//
//   OBTENER PERSONAS QUE ME SIGUEN                  
//**********************************//

function getFollowedUsers(req, res) {

    var userId = req.user.sub;

    if (req.params.id && req.params.page) {
        userId = req.params.id;
    }

    var page = 1;
    // si existe paginacion en la url
    if (req.params.page) {
        page = req.params.page;
    } else {
        page = req.params.id;
    }

    var itemsPerPage = 2;

    Follow.find({ followed: userId }).populate('user').paginate(page, itemsPerPage, (err, follows, total) => {
        if (err) return res.status(500).send({ message: 'Error en el servidor' });

        if (!follows) return res.status(404).send({ message: 'No te sigue ningún usuario' });

        // llamamos a la funcion async await de obtener los ids de los usuarios que sigo ...
        followUserIds(userId).then((value) => {
            return res.status(200).send({
                total,
                pages: Math.ceil(total / itemsPerPage),
                follows,
                users_following: value.following,
                users_follow_me: value.followed
            });

        });
    });
}

//************************************************//
//   OBTENER LISTADO DE USUARIOS SIN PAGINACION                  
//************************************************//

function getMyFollows(req, res) {

    var userId = req.user.sub;

    var find = Follow.find({ user: userId });

    if (req.params.followed) {
        find = Follow.find({ followed: userId });
    }

    find.populate('user followed').exec((err, follows) => {

        if (err) return res.status(500).send({ message: 'Error en el servidor' });

        if (!follows) return res.status(404).send({ message: 'No estás siguiendo a ningún usuario' });

        return res.status(200).send({ follows });

    });


}

module.exports = {
    saveFollow,
    deleteFollow,
    getFollowingUsers,
    getFollowedUsers,
    getMyFollows
};