var uuid = require('node-uuid');
var https = require('https');
var Q = require('q');

var httpsGet = function (url) {
  var deferred = Q.defer();
  console.log("Todoist GET URL " + url);
  https.get(url, function(res) {
    var buf = '';
    res.on('data', function(data) {
      buf += data;

    });

    res.on('end', function(data) {
      deferred.resolve(buf);
    });
  });

  return deferred.promise;
};


function todoist(url, success, fail) {
  httpsGet(url)
    .then(success)
    .catch(fail);
}


function todoistURL(data){
  var url =  "https://todoist.com/API/v6/sync";
  var query = [];
  for(var k in data) {
    query.push(k+'='+(typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k])));
  }

  return url + '?' + query.join('&');
};


function todoistCommandURL(type, args, token){
  return todoistURL({
    token: token,
    commands: [{
      type: type,
      temp_id: uuid.v4(),
      uuid: uuid.v4(),
      args: args
    }]});
};


function todoistItemAdd(token, content) {
  var url = todoistCommandURL('item_add', {content: content}, token);

  todoist(url,
          function(d) {
            process.stdout.write(d);
          },
          function(err) {
            console.log("something went wrong w/ httpsGet!");
          });
}


function strip_labels_from_text(text) {
  var pattern = /\B@[a-z0-9_-]+/gi;
  return text.replace(pattern, "");
}


function get_project_ids_from_labels(text, projects) {
  var pattern = /\B@[a-z0-9_-]+/gi;
  var labels = text.match(pattern);
  var project_ids = [];
  if (labels)
  {
    labels.forEach(function(label) {
      // find label in projects and append to project_ids
    });
  }
  return project_ids;
}


module.exports = {
  itemAdd : todoistItemAdd,
  getToday: function(token) {
    return {};
  },
  getWeek: function(token) {
    return {};
  },
  getList: function(token, project) {
    return {};
  },
  getProjects: function(token,project) {
    return {};
  },

  getAll: function(token) {
    var args = {
      token: token,
      seq_no: 0,
      resource_types: ['all']
    };

    return httpsGet(todoistURL(args))
      .then(JSON.parse)
      .catch(function(err){
        console.error("ERR "+err);
      });
  }

};
