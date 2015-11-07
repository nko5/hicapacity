var express = require('express');
var app = express();

app.configure(function() {
  app.use(express.static(__dirname + '/public'));
});

app.post('/slash', function(req, res) {
});

var port = 8080;
app.listen(port);
console.log('Express server started on port %s', port);
