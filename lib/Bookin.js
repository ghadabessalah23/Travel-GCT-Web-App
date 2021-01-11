var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment');
var connection = mongoose.createConnection("mongodb://localhost:27017/travel",{ useNewUrlParser: true });

mongoose.set('useCreateIndex', true);
autoIncrement.initialize(connection);

var BookinSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    userFullname: {
        type: String,
        required: true
    },
    hotelId: {
        type: String,
        required: true
    },
    hotel: {
        type: String,
        required: true
    },
    fullTime: {
        type: String,
        required: true
    }
},{ collection: 'bookin_collection' });
BookinSchema.plugin(autoIncrement.plugin, { model: 'bookin_collection', field: '_id', startAt: 1, incrementBy: 1 });
const Bookin = mongoose.model('bookin_collection', BookinSchema);

module.exports = Bookin;