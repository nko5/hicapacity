"use strict";

var crypto = require("crypto");
var express = require('express');
var passport = require("passport");
var OAuth2Strategy= require('passport-oauth2').Strategy;
var mongoose = require('mongoose');
var User = require("./models/users.js");
var RegistrationToken = require("./models/registration_tokens.js");
var app = express();
var todoist = require("./todoist.js");
var _ = require("lodash");
var Q = require("q");
var URL = require("url");
var https = require("https");
var baseUrl = process.env.BASE_URL;

// Connect to database
mongoose.connect(process.env.MONGO_URI);
mongoose.connection.on('error', function(err) {
  console.error('MongoDB connection error: ' + err);
  process.exit(-1);
});
mongoose.set('debug', true);

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use('todoist', new OAuth2Strategy({
  authorizationURL: 'https://todoist.com/oauth/authorize',
  tokenURL: 'https://todoist.com/oauth/access_token',
  clientID: process.env.CLIENT_ID_TODOIST,
  clientSecret: process.env.CLIENT_SECRET_TODOIST,
  callbackURL: baseUrl + 'auth/todoist/callback',
  scope: 'task:add,data:read_write',
  state: 'slacklemore',
  passReqToCallback: true},
  function(request, accessToken, refreshToken, profile, done) {
    var slack_id = request.session.slack_id;
    User.findOneAndUpdate({slack_id: slack_id}, {todoist_oauth_token: accessToken}, { upsert: true, 'new': true}, function(err, user) {
      if (err) { console.error('Finding / Updating User Todoist error: ' + err); }
      return done(err, user);
    });
  }
));

passport.use('slack', new OAuth2Strategy({
  authorizationURL: 'https://slack.com/oauth/authorize',
  tokenURL: 'https://slack.com/api/oauth.access',
  clientID: process.env.CLIENT_ID_SLACK,
  clientSecret: process.env.CLIENT_SECRET_SLACK,
  callbackURL: 'https://nko2015-hicapacity-54610.onmodulus.net/auth/slack/callback',
  scope: 'commands',
  state: 'slacklemore'},
  function(accessToken, refreshToken, profile, done) {
    console.log("HERE");
    console.log(profile);
    User.findOneAndUpdate({slack_id: profile.id}, {slack_oauth_token: accessToken}, { upsert: true, 'new': true}, function(err, user) {
      if (err) { console.error('Finding / Updating User Slack error: ' + err); }
      return done(err, user);
    });
  }
));


app.configure(function() {
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});


function respond(res, text) {
  var isJSON = (typeof text !== 'string');
  var content_type = isJSON ? 'application/json' : 'text/html';
  text = isJSON ? JSON.stringify(text) : text;
  console.log("Responding 200 OK with: " + text);
  res.writeHead(200, "OK", {'Content-Type': content_type});
  res.end(text);
}


function postJSON(url, json){
  var body = JSON.stringify(json);

  var options = URL.parse(url);
  options.method = "POST";
  options.headers = {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  };

  console.log(`postJSON(url=${url}, json=${body}, options=${JSON.stringify(options)})`);
  var req = https.request(options, function(res, err){
    console.log("postJSON: status="+res.statusCode+", url="+url);
    res.on('data', function(d) {
      process.stdout.write(d);
    });
  });

  req.write(body);
  req.end(function(err, res) {
    console.log("postJSON end url="+url);
  });
}


function handle_register(req, res, user) {
  console.log(">>>> In register handler");

  var slack_id = req.body.user_id;
  var registration_hash = crypto.randomBytes(20).toString('hex');
  var now = new Date();
  var days_valid = 1;
  var valid_until = now.setTime(now.getTime() + days_valid * 86400000);
  RegistrationToken.findOneAndUpdate({slack_id: slack_id}, {registration_hash: registration_hash, valid_until: valid_until}, { upsert: true, 'new': true}, function(err, token) {
    if (err) { console.error('Finding / Updating Registration Token error: ' + err); }
    var link = baseUrl + 'todoist/' + token.registration_hash;
    var text = ["Welcome to Slash Todoist! It looks like we've not seen you before.",
                `<${link}|Please click here to link to your todoist.com account>`].join("\n");
    respond(res, text);
  });
}


function handle_unregister(req, res, user) {
  console.log(">>>> In unregister handler");
  if (user) {
    User.remove({ _id: user.id }, function(err) {
      if (err) { console.error('Removing User error: ' + err); }
      else {
        respond(res, "Boomtime. You've been unregistered!");
      }
    });
  } else {
    respond(res, 'To unregister, you need to register first!');
  }
}


function handle_add(req,res,user) {
  var response_url = req.body.response_url;
  var item = req.body.text;

  if(item.substr(0,4).toLowerCase() == "add "){
    item = item.substr(4);
  }

  var link = "https://todoist.com/app";
  var text = `Adding "${req.body.text}" in your <${link}|todoist Inbox>`;

  //text += "\n" + JSON.stringify(req.body,2,2);
  //text += "\n response_url="+response_url;
  respond(res,  text);

  var token = user.todoist_oauth_token;
  var item_text = req.body.text;

  Q.spawn(function* () {
    var result = yield todoist.itemAdd(token, item_text);
    //postJSON(req.body.response_url, { text: "The result was\n"+JSON.stringify(result) });
  });
}


function filterItemsDueInLessThanNDays(items, ndays) {
  var now_timestamp = Date.now();
  var items_due = [];
  for(var i = 0, n = items.length; i < n; ++i){
    var item = items[i];
    var due_date_str = item.due_date_utc;
    if(due_date_str){
      var due_timestamp = new Date(due_date_str);
      var due_in = due_timestamp - now_timestamp;
      var threshold = ndays * 24 * 60 * 60 * 1000;
      if(due_in < threshold){
        items_due.push(item);
      }
    }
  }
  return items_due;
}


function buildItemsDueResponseJSON(items){
  var json = {
    text:"",
    attachments: []
  };
  var text = [];
  for(var i = 0, n = items.length; i < n; ++i){
    var item = items[i];
    var content = `${item.date_string}: ${item.content}`;
    var link = `https://todoist.com/showTask?id=${item.id}`;
    var txt = (item.date_string ? `${item.date_string} - ` : "") + `<${link}|${item.content}>`;
    text.push(txt);

    json.attachments.push(
      {
        title: content,
        title_link: link,
        text: txt,
        fallback: content
      }
    );
  }

  json.text = text.join("\n");

  // disable rich attachments for now
  // comment next-line to re-enable
  delete json.attachments;

  if(!json.text) {
    json.text = `No items found. Good job!`;
  }

  console.log("Items JSON="+JSON.stringify(json,2,2));

  return json;

};


function respondDueItems(token, response_url, ndays){
  Q.spawn(function* () {
    var json = yield todoist.getAll(token);
    var items = filterItemsDueInLessThanNDays(json.Items, ndays);
    var response_json = buildItemsDueResponseJSON(items);
    postJSON(response_url, response_json);
  });
}

function respondListProjectItems(token, response_url, project){
  Q.spawn(function* () {
    var json = yield todoist.getAll(token);

    var i;
    var project_id;

    for(i = 0; i < json.Projects.length && !project_id; ++i){
      if(json.Projects[i].name.toLowerCase() === project.toLowerCase()){
        project_id = json.Projects[i].id;
      }
    }

    var items = [];
    for(i = 0; i < json.Items.length; ++i){
      var item = json.Items[i];
      if(item.project_id === project_id){
        items.push(item);
      }
    }

    var response_json = buildItemsDueResponseJSON(items);

    postJSON(response_url, response_json);

  });
}


function handle_today(req, res, user) {
  respond(res, "Your Todoist items due today:");
  respondDueItems(user.todoist_oauth_token, req.body.response_url, 1);
}


function handle_week(req, res, user) {
  respond(res, "Your Todoist items due in the next week:");
  respondDueItems(user.todoist_oauth_token, req.body.response_url, 7);
}


function handle_list(req, res, user) {
  var project = req.body.text.substr("list ".length) || "Inbox";
  respond(res, `Your Todoist items in project ${project}:`);
  respondListProjectItems(user.todoist_oauth_token, req.body.response_url, project);
}


function handle_labels(req, res, user) {
  todoist.getAll(user.todoist_oauth_token)
    .then(function(data){
      var text = JSON.stringify(data);//.Labels.join(", ");
      respond(res, text);
    })
    .done();
}

function buildProjectsResponseText(projects){
  var text = ['Your Todoist projects:'];
  for(var i = 0; i < projects.length; ++i) {
    var project = projects[i];
    var link = `https://todoist.com/app?#project%2F${project.id}`;
    text.push(`<${link}|${project.name}>`);
  }
  return text.join("\n");
}



function handle_projects(req, res, user) {
  todoist.getAll(user.todoist_oauth_token)
    .then(function(data) {
      var responseText = buildProjectsResponseText(data.Projects);
      respond(res, responseText);
    })
    .done();
}


app.post('/slash', function(req, res) {
  User.findOne({ 'slack_id': req.body.user_id }, function (err, user) {
    if (err) { console.error('Finding User error: ' + err); }

    var command = req.body.text.split(" ")[0];

    // If user doesn't exist, hijack command to register
    if(!user || (user && user.todoist_oauth_token == null)) {
      command = "register";
    }

    command = command.toLowerCase();

    // How's this for ugly?
    var handlers = {
      register: handle_register,
      unregister: handle_unregister,
      add: handle_add,
      today: handle_today,
      week: handle_week,
      [7]: handle_week,
      list: handle_list,
      projects: handle_projects,
      labels: handle_labels,
    };

    console.log(command);

    var handler = handlers[command] || handlers.add;

    handler(req, res, user);

  });
});

app.get('/todoist/:hash', function(req, res) {
  var registration_hash = req.params.hash;
  RegistrationToken.findOne({registration_hash: registration_hash}, function(err, token) {
    if (err) { console.error('Finding Registration Token error: ' + err); }
    if (token && token.valid_until > new Date()) {
      req.session.slack_id = token.slack_id;
      res.redirect('/auth/todoist');
    } else {
      respond(res, 'Unable to find your registration token, please try again');
    }
  });
});

// OAuth stuffs
app.get('/auth/todoist', passport.authenticate('todoist'));
app.get('/auth/todoist/callback',
  passport.authenticate(
    'todoist', { failureRedirect: '/sadface' }),
    function(req, res) {
      res.redirect('/happyface/todoist');
});

app.get('/auth/slack', passport.authenticate('slack'));
app.get('/auth/slack/callback',
  passport.authenticate(
    'slack', { failureRedirect: '/sadface' }),
    function(req, res) {
      res.redirect('/happyface/slack');
});

// Sadface :(
app.get('/sadface', function(req, res) {
  respond(res, 'Something bad happened. Robot overlords have been notified. :(');
});

// Happyfaces :)
app.get('/happyface/todoist', function(req, res) {
  res.sendfile(__dirname + '/public/happyface_todoist.html');
});

app.get('/happyface/slack', function(req, res) {
  res.sendfile(__dirname + '/public/happyface_slack.html');
});

// Help, Yo
app.get('/help', function(req, res) {
  res.sendfile(__dirname + '/public/help.html');
});

function* logall() {
  var token = process.env.DEBUG_TODOIST_TOKEN;
  var json = yield todoist.getAll(token);
  console.log(JSON.stringify(json, 2,2));
}


var debug_token = process.env.DEBUG_TODOIST_TOKEN;
if(debug_token) {
  todoist.itemAdd(debug_token, "@DEBUG app started "+(new Date().toISOString()));
  //Q.spawn(logall);


  if(process.env.DEBUG_SLACK_RESPONSE_URL) {
    //respondDueItems(debug_token, process.env.DEBUG_SLACK_RESPONSE_URL, 7);
    respondListProjectItems(debug_token, process.env.DEBUG_SLACK_RESPONSE_URL, "Inbox");
  }
}

var port = process.env.PORT || 8080;
app.listen(port);
console.log('Express server started on port %s', port);
