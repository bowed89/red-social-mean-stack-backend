var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PublicationSchema = ({
    text: String,
    file: String,
    create_at: String,
    user: { type: Schema.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Publication', PublicationSchema);