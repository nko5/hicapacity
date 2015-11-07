var express = require('express');
var uuid = require('node-uuid');
var restler = require('restler');
var https = require('https');


var token;
token="6a7fcf7b34ab361dcfbc07c89aa6e443ddb33e40";

function todoistURL(type, args, token){

  var url =  "https://todoist.com/API/v6/sync";
  //url += "?token="+token;

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
  restler.get(todoistUrl).on('complete', function(indata) {
    console.log(JSON.stringify(indata));
  });
}


todoistItemAdd("this is a test", token);
