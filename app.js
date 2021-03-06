var express = require('express')
  , bodyParser = require('body-parser')
  , sass = require('node-sass')
  , path = require('path')
  , favicon = require('static-favicon')
  , logger = require('morgan')
  , routes = require('./routes/weather');

var app = express();

app.set('view engine', 'ejs');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(sass.middleware({
  src: path.join(__dirname, 'sass'),
  dest: path.join(__dirname, 'public'),
  debug: true,
  outputStyle: 'compressed'
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

/// error handlers

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    console.log(err);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
