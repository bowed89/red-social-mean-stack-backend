var fs = require('fs');
var path = require('path');
var moment = require('moment');
var mongoosePaginate = require('mongoose-pagination');

var User = require('../models/user');
var Follow = require('../models/follow');
var Publication = require('../models/publication');

function prueba(req, res) {
    res.status(200).send({ message: 'hola desde el controll er d publicaciones' });
}


//********************************//
//      GUARDAR UNA PUBLICACION                  
//********************************//

function savePublication(req, res) {

    var params = req.body;

    if (!params.text) return res.status(200).send({ message: 'Debes enviar un texto' });

    var publication = new Publication();
    publication.text = params.text;
    publication.file = 'null';
    publication.user = req.user.sub;
    publication.create_at = moment().unix();

    publication.save((err, publicationStored) => {
        if (err) return res.status(500).send({ message: 'Error al almacenar la publicación' });

        if (!publicationStored) return res.status(4004).send({ message: 'La publicación no ha sido almacenada' });

        return res.status(200).send({ publication: publicationStored });
    });
}

//********************************//
//    OBTENER LAS PUBLICACIONES
//    DE LOS USUARIOS QUE SIGO                  
//********************************//

function getPublications(req, res) {

    var page = 1;

    if (req.params.page) {
        page = req.params.page;
    }

    var itemsPerPage = 4;

    Follow.find({ user: req.user.sub }).exec((err, follows) => {

        if (err) return res.status(500).send({ message: 'Error al devolver el seguimiento' });

        var follows_clean = [];

        follows.forEach((follow) => {
            follows_clean.push(follow.followed);
            console.log('este-->', follows_clean);
        });

        follows_clean.push(req.user.sub);

        Publication.find({ user: follows_clean }).sort({ 'create_at': -1 }).populate('user').paginate(page, itemsPerPage, (err, publications, total) => {


            if (err) return res.status(500).send({ message: 'Error al devolver publicaciones' });

            if (!publications) return res.status(4004).send({ message: 'No existen publicaciones' });

            return res.status(200).send({
                total_items: total,
                pages: Math.ceil(total / itemsPerPage),
                page,
                items_per_page: itemsPerPage,
                publications,
            });

        });

    });
}

//*****************************************//
//    OBTENER LAS PUBLICACIONES
//    DE UN USUARIO CON SU ID DEL TOKEN                 
//****************************************//

function getPublicationsUser(req, res) {

    var page = 1;

    if (req.params.page) {
        page = req.params.page;
    }

    var user = req.user.sub;

    if (req.params.user) {
        user = req.params.user;
    }

    var itemsPerPage = 4;


    Publication.find({ user: user }).sort({ 'create_at': -1 }).populate('user').paginate(page, itemsPerPage, (err, publications, total) => {


        if (err) return res.status(500).send({ message: 'Error al devolver publicaciones' });

        if (!publications) return res.status(4004).send({ message: 'No existen publicaciones' });

        return res.status(200).send({
            total_items: total,
            pages: Math.ceil(total / itemsPerPage),
            page,
            items_per_page: itemsPerPage,
            publications,
        });

    });

}




//***********************************//
//      OBTENER PUBLICACION POR ID                  
//***********************************//

function getPublication(req, res) {

    var id = req.params.id;

    Publication.findById(id, (err, publication) => {

        if (err) return res.status(500).send({ message: 'Error al devolver publicaciones' });

        if (!publication) return res.status(4004).send({ message: 'No existe la publicación' });

        return res.status(200).send({ publication });


    });
}

//*******************************************//
//      ELIMINAR NUESTRA PUBLICACION POR ID                  
//******************************************//

function deletePublication(req, res) {

    var id = req.params.id;

    Publication.find({ user: req.user.sub, _id: id }).remove(err => {

        if (err) return res.status(500).send({ message: 'Error al borrar publicaciones' });

        return res.status(200).send({ message: 'Publicación eliminada' });

    });
}

//****************************************//
//     SUBIR ARCHIVOS DE IMG DE USUARIO                   
//***************************************//

function uploadImage(req, res) {

    var publicationId = req.params.id;

    if (req.files) {
        var file_path = req.files.image.path;
        var file_split = file_path.split('\\');
        var file_name = file_split[2];
        var ext_split = file_name.split('\.');
        var file_ext = ext_split[1];

        if (file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif') {

            Publication.findOne({ user: req.user.sub, _id: publicationId }).exec((err, publication) => {

                console.log(publication);

                if (publication) {
                    // Actualizar documento de publicación
                    Publication.findByIdAndUpdate(publicationId, { file: file_name }, { new: true }, (err, publicationUpdate) => {
                        console.log(publicationUpdate);

                        if (err) return res.status(500).send({ message: 'Error en la petición' });

                        if (!publicationUpdate) return res.status(404).send({ message: 'No se ha podido actualizar la publicación' });

                        return res.status(200).send({ publication: publicationUpdate });
                    });
                } else {
                    return removeFilesUploads(res, file_path, 'No tienes permiso para actualizar esta publicación');
                }

            });


        } else {
            // si el archivo de img no tiene las extensiones entonces se elimina la img
            return removeFilesUploads(res, file_path, 'Extensión no válida');
        }
    } else {
        return res.status(404).send({ message: 'No se subió la imagen' });
    }

}

function removeFilesUploads(res, file_path, message) {
    fs.unlink(file_path, (err) => {
        return res.status(404).send({ message: message });
    });
}

//****************************************//
//     OBTENER EL ARCHIVO IMAGEN                   
//***************************************//

function getImageFile(req, res) {

    var image_file = req.params.imageFile;
    var path_file = './uploads/publications/' + image_file;

    fs.exists(path_file, (exists) => {
        if (exists) {
            res.sendfile(path.resolve(path_file));
        } else {
            return res.status(200).send({ message: 'No existe la imagen' });
        }
    });
}


module.exports = {
    prueba,
    savePublication,
    getPublications,
    getPublication,
    getPublicationsUser,
    deletePublication,
    uploadImage,
    getImageFile

};