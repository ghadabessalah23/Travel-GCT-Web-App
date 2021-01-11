var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment');
var connection = mongoose.createConnection("mongodb://localhost:27017/travel",{ useNewUrlParser: true });

mongoose.set('useCreateIndex', true);
autoIncrement.initialize(connection);

var UserSchema = new Schema({
    nom: {
        type: String,
        required: true
    },
    prenom: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    }
},{ collection: 'users' });
UserSchema.plugin(autoIncrement.plugin, { model: 'users', field: '_id', startAt: 1, incrementBy: 1 });
const User = mongoose.model('users', UserSchema);

module.exports = User;
