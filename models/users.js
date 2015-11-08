var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UsersSchema	= new Schema({
  slack_id: {type: String, unique: true },
  todoist_oauth_token: {type: String },
  slack_oauth_token: {type: String },
});

module.exports = mongoose.model('Users', UsersSchema);
