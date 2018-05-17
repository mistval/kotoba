const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const formDataParser = require('body-parser').urlencoded({extended: false});
const quiz = require('./quiz.js');

function start(monochrome, handleContact) {
  const port = 3000;

  quiz.init(monochrome, http);

  app.use(express.static(path.join(__dirname, 'static')));

  app.post('/contact', formDataParser, function(req, res) {
    handleContact(req.body.email, req.body.message).then(() => {
      res.send({type: 'success', message: 'I have received your message and will respond soon.'});
    }).catch(err => {
      console.log(err);
      console.log(req.body.email.substring(0, 500));
      console.log(req.body.message.substring(0, 500));
      res.send({type: 'danger', message: 'There was an error sending your message. You can contact me by email at celephais22@gmail.com.'});
    });
  });

  http.listen(port, function(){
    console.log('Webserver listening on *:' + port);
  });
}

module.exports.start = start;
