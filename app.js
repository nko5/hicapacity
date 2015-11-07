var express = require('express');
var passport = require('passport');
var OAuth2Strategy= require('passport-oauth2').Strategy;
var User = require("./models/users.js");
var mongoose = require('mongoose');
var app = express();

passport.use(new OAuth2Strategy({
  authorizationURL: 'https://todoist.com/oauth/authorize',
  tokenURL: 'https://todoist.com/oauth/access_token',
  clientID: process.env.CLIENT_ID_TODOIST,
  clientSecret: process.env.CLIENT_SECRET_TODOIST,
  callbackURL: 'http://slacklemore-55043.onmodulus.net/auth/callback',
  scope: 'task:add,data:read',
  state: 'slacklemore'},
  function(accessToken, refreshToken, profile, done) {
    console.log("accessToken:" + accessToken);
    console.log("refreshToken:" + refreshToken);
    console.log("profile:" + profile);
  }
));

app.configure(function() {
  app.use(express.static(__dirname + '/public'));
});

app.post('/slash', function(req, res) {
  // 1. Get slack id from req.
  // 2. Use slack id to look up access token in the database.
  // 3. If found, send command over to todoist.
  // 4. If not found, send user the following url.
});

// OAuth stuffs
app.get('/auth', passport.authenticate('oauth2'));

app.get('/auth/callback',
  passport.authenticate('oauth2', { failureRedirect: '/sadface' }),
  function(req, res) {
    // Successful authentication.
    // 1. Save slack id -> token.
    // 2. Show magic page
    // 3. If time, use slack-notify to message you that you're good to go
    res.redirect('/');
  });

app.get('/sadface', function(req, res) {

});

var port = 8080;
app.listen(port);
console.log('Express server started on port %s', port);
