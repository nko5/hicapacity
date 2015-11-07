var uuid = require('node-uuid');
var https = require('https');

function todoistURL(type, args, token){
  var url =  "https://todoist.com/API/v6/sync";

  var data = {
    token: token,
    commands: [{
      type: type,
      temp_id: uuid.v4(),
      uuid: uuid.v4(),
      args: args
    }]};


  var query = [];
  for(var k in data) {
    query.push(k+'='+(typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k])));
  }

  return url + '?' + query.join('&');
};


function todoistItemAdd(content, token) {
  var todoistUrl = todoistURL('item_add', {content: content}, token);
  console.log("todoistUrl="+todoistUrl);
  https.get(todoistUrl, function(res) {
    res.on('data', function(d) {
      process.stdout.write(d);
    });
  });
}

module.exports = {
  itemAdd : todoistItemAdd
};

