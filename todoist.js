var uuid = require('node-uuid');
var https = require('https');
var Q = require('q');

var httpsGet = function (url) {
  var deferred = Q.defer();
  console.log("Todoist GET URL " + url);
  https.get(url, function(res) {
    res.on('data', function(data) {
      deferred.resolve(data);
    });
  });
  return deferred.promise;
};


function todoist(url, success, fail) {
  httpsGet(url)
    .then(success)
    .catch(fail);
}

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


function todoistItemAdd(token, content) {
  todoist(todoistURL('item_add', {content: content}, token),
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


/*

  console.log("todoistUrl="+todoistUrl);
  https.get(todoistUrl, function(res) {
    res.on('data', function(d) {
      process.stdout.write(d);
    });
  });
}
*/

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
  }
};
