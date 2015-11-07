var crypto = require("crypto");
var express = require('express');
var passport = require('passport');
var OAuth2Strategy= require('passport-oauth2').Strategy;
var mongoose = require('mongoose');
var User = require("./models/users.js");
var RegistrationToken = require("./models/registration_tokens.js");
var app = express();
var todoist = require("./todoist.js");

var baseUrl = process.env.BASE_URL || "http://slacklemore-55043.onmodulus.net/";

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

passport.use(new OAuth2Strategy({
  authorizationURL: 'https://todoist.com/oauth/authorize',
  tokenURL: 'https://todoist.com/oauth/access_token',
  clientID: process.env.CLIENT_ID_TODOIST,
  clientSecret: process.env.CLIENT_SECRET_TODOIST,
  callbackURL: baseUrl + 'auth/callback',
  scope: 'task:add,data:read',
  state: 'slacklemore',
  passReqToCallback: true},
  function(request, accessToken, refreshToken, profile, done) {
    var slack_id = request.session.slack_id;
    User.findOneAndUpdate({slack_id: slack_id}, {todoist_oauth_token: accessToken}, { upsert: true, 'new': true}, function(err, user) {
      if (err) { console.error('Finding / Updating User error: ' + err); }
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

app.post('/slash', function(req, res) {
  var slack_id = req.body.user_id;
  User.findOne({ 'slack_id': slack_id }, function (err, user) {

    if (err) { console.error('Finding User error: ' + err); }
    var text;

    var command = req.body.text.split(" ")[0];

    // If user doesn't exist, hijack command to register
    if(!user) {
      command = "register";
    }

    // This is pretty ugly. :)
    switch(command.toLowerCase()) {
      case 'register':
        var registration_hash = crypto.randomBytes(20).toString('hex');
        var now = new Date();
        var days_valid = 1;
        var valid_until = now.setTime(now.getTime() + days_valid * 86400000);
        RegistrationToken.findOneAndUpdate({slack_id: slack_id}, {registration_hash: registration_hash, valid_until: valid_until}, { upsert: true, 'new': true}, function(err, token) {
          if (err) { console.error('Finding / Updating Registration Token error: ' + err); }
          text = "Don't think we've seen you before. Please register @ " + baseUrl + 'todoist/' + token.registration_hash;
          res.writeHead(200, "OK", {'Content-Type': 'text/html'});
          res.end(text);
        });
        break;
      case 'add':
      default:
        text = 'Adding "' + req.body.text + '" to todoist.com';
        todoist.itemAdd(req.body.text, user.todoist_oauth_token);

        text += "\n\nDEBUG command="+command+"\nuser="+JSON.stringify(user);
        console.log(text);

        res.writeHead(200, "OK", {'Content-Type': 'text/html'});
        res.end(text);
        break;
    }
  });
});

app.get('/todoist/:hash', function(req, res) {
  var registration_hash = req.params.hash;
  RegistrationToken.findOne({registration_hash: registration_hash}, function(err, token) {
    if (err) { console.error('Finding Registration Token error: ' + err); }
    if (token && token.valid_until > new Date()) {
      req.session.slack_id = token.slack_id;
      res.redirect('/auth');
    } else {
      res.writeHead(200, "OK", {'Content-Type': 'text/html'});
      res.end('Unable to find your registration token, please try again');
    }
  });
});

// OAuth stuffs
app.get('/auth', passport.authenticate('oauth2'));

app.get('/auth/callback',
  passport.authenticate('oauth2', { failureRedirect: '/sadface' }),
  function(req, res) {
    // 2. Show magic page
    // 3. If time, use slack-notify to message you that you're good to go
    res.redirect('/');
  });

app.get('/sadface', function(req, res) {
  res.writeHead(200, "OK", {'Content-Type': 'text/html'});
  res.end(':(');
});

var port = 8080;
app.listen(port);
console.log('Express server started on port %s', port);
