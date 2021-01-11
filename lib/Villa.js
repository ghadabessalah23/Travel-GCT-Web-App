var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment');
var connection = mongoose.createConnection("mongodb://localhost:27017/travel",{ useNewUrlParser: true });

mongoose.set('useCreateIndex', true);
autoIncrement.initialize(connection);

var VillaSchema = new Schema({
    adresse: {
        type: String,
        required: true
    },
    ville: {
        type: String,
        required: true
    },
    terrain: {
        type: String,
        required: true
    },
    surface: {
        type: String,
        required: true
    },
    chambre: {
        type: String,
        required: true
    },
    salleDeBain: {
        type: String,
        required: true
    },
    toilette: {
        type: String,
        required: true
    },
    prix: {
        type: String,
        required: true
    },
    dateD: {
        type: String,
        required: true
    },
    dateF: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    bookin: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    userFullname: {
        type: String,
        required: true
    },
    fullTime: {
        type: String,
        required: true
    }
},{ collection: 'villa_collection' });
VillaSchema.plugin(autoIncrement.plugin, { model: 'villa_collection', field: '_id', startAt: 1, incrementBy: 1  });
const Villa = mongoose.model('villa_collection', VillaSchema);

module.exports = Villa;