var moment = require('moment');
var mongoosePaginate = require('mongoose-pagination');

var User = require('../models/user');
var Follow = require('../models/follow');
var Message = require('../models/message');

function probando(req, res) {
    res.status(200).send({ message: 'hola desde message' });
}

//********************************//
//      GUARDAR UN MENSAJE                 
//********************************//

function saveMessage(req, res) {

    var params = req.body;

    if (!(params.receiver && params.text)) {
        return res.status(200).send({ message: 'Envia los datos necesarios' });
    }

    var message = new Message();
    message.emmiter = req.user.sub;
    message.receiver = params.receiver;
    message.text = params.text;
    message.create_at = moment().unix();
    message.viewed = 'false';

    message.save((err, messageStored) => {

        if (err) res.status(500).send({ message: 'Error en la petición' });

        if (!messageStored) res.status(404).send({ message: 'Error al enviar el mensaje' });

        return res.status(200).send({ message: messageStored });

    });
}

//************************************//
//      OBTENER MENSAJES RECIBIDOS                 
//************************************//

function getReceivedMessages(req, res) {

    var userId = req.user.sub;

    var page = 1;

    if (req.params.page) {
        page = req.params.page;
    }

    var itemsPerPage = 4;

    Message.find({ receiver: userId }).populate('emmiter', 'name surname _id nick image').paginate(page, itemsPerPage, (err, messages, total) => {

        if (err) res.status(500).send({ message: 'Error en la petición' });

        if (!messages) res.status(404).send({ message: 'No hay mensajes' });

        return res.status(200).send({
            total,
            pages: Math.ceil(total / itemsPerPage),
            messages
        });
    });
}


//************************************//
//      OBTENER MENSAJES ENVIADOS                 
//************************************//

function getEmmiterMessages(req, res) {

    var userId = req.user.sub;

    var page = 1;

    if (req.params.page) {
        page = req.params.page;
    }

    var itemsPerPage = 4;

    Message.find({ emmiter: userId }).populate('emmiter receiver', 'name surname _id nick image').paginate(page, itemsPerPage, (err, messages, total) => {

        if (err) res.status(500).send({ message: 'Error en la petición' });

        if (!messages) res.status(404).send({ message: 'No hay mensajes' });

        return res.status(200).send({
            total,
            pages: Math.ceil(total / itemsPerPage),
            messages
        });
    });
}

//************************************//
//      OBTENER MENSAJES NO LEIDOS                 
//************************************//

function getUnviewedMessages(req, res) {

    Message.count({ receiver: req.user.sub, viewed: 'false' }).exec((err, count) => {

        if (err) res.status(500).send({ message: 'Error en la petición' });

        return res.status(200).send({
            unviewed: count
        });

    });

}

//************************************//
//      OBTENER MENSAJES NO LEIDOS                 
//************************************//

function setViewedMessages(req, res) {

    Message.update({ receiver: req.user.sub, viewed: 'false' }, { viewed: 'true' }, { multi: true }, (err, messageUpdate) => {

        if (err) res.status(500).send({ message: 'Error en la petición' });

        return res.status(200).send({
            messages: messageUpdate
        });

    });
}

module.exports = {
    probando,
    saveMessage,
    getReceivedMessages,
    getEmmiterMessages,
    getUnviewedMessages,
    setViewedMessages
};