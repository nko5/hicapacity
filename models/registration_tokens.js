var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RegistrationTokensSchema	= new Schema({
  slack_id: {type: String, unique: true },
  registration_hash: {type: String, unique: true },
  valid_until: {type: Date }
});

module.exports = mongoose.model('RegistrationTokens', RegistrationTokensSchema);
