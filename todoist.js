var uuid = require('node-uuid');
var https = require('https');
var Q = require('q');
var _ = require('lodash');


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
  var labels = get_labels_from_text(content);
  var text = strip_labels_from_text(content);

  todoistGetAllPromise(token)
    .then(function(data) {
      return get_label_ids_from_labels(labels, data);
    })
    .then(function(label_ids) {
      var args = {
        token: token,
        commands: [{
          type: "item_add",
          temp_id: uuid.v4(),
          uuid: uuid.v4(),
          args: {
            content: text,
            labels: label_ids
          }
        }]};

      httpsGet(todoistURL(args))
        .then(console.log.bind(console))
        .catch(function(err){
          console.error("Error adding item "+err);
        });
    })
    .catch(function(err){
      console.log("ERR in itemAdd:"+err);
    });
}

/*
  var url = todoistCommandURL('item_add', {content: content}, token);

  todoist(url,
          function(d) {
            process.stdout.write(d);
          },
          function(err) {
            console.log("something went wrong w/ httpsGet!");
          });
}
*/


function strip_labels_from_text(text) {
  var pattern = /\B@[a-z0-9_-]+/gi;
  return text.replace(pattern, "");
}

function get_labels_from_text(text, projects) {
  var pattern = /\B@[a-z0-9_-]+/gi;
  var labels = text.match(pattern);
  // strip @
  labels = _.map(labels, function(s) { return s.substr(1); });;
  return labels;
}


function get_label_ids_from_labels(labels, allData){
  var acct_labels  = {};

  allData.Labels.forEach(function(e){
    acct_labels[e.name.toLowerCase()] = e;
  });

  var label_ids = [];
  labels.forEach(function(label){
    label = label.toLowerCase();
    if(label in acct_labels){
      label_ids.push(acct_labels[label].id);
    }
  });

  return label_ids;
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
  getAll: todoistGetAllPromise

};

function todoistGetAllPromise(token) {
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
