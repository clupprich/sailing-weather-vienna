var express = require('express');
var logfmt  = require('logfmt');
var request = require('request');
var cheerio = require('cheerio');
var redis   = require('redis');
var url     = require('url');
var q       = require('q');

var redisURL = url.parse(process.env.REDISCLOUD_URL || 'http://127.0.0.1:6379');
var client = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
if (redisURL.auth) {
  client.auth(redisURL.auth.split(':')[1]);
}

var app    = express();
var router = express.Router();
var port   = Number(process.env.PORT || 5000);

loadData = function() {
  var deferred = q.defer();

  request.get('https://www.wien.gv.at/wetter/segeln/', function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var data = [];

      $ = cheerio.load(body);
      $('.BDE-table-frame tr').each(function(_, row) {
        var columns = $(this).find('td').get();

        if (columns.length > 0) {
          data.push({
            time:        $(columns[0]).text().match(/\d{2}:\d{2}/)[0],
            wind:        $(columns[1]).text().match(/\d+.\d+/)[0],
            direction:   $(columns[2]).text().match(/\w+/)[0],
            temperature: $(columns[3]).text().match(/-*\d+.\d+/)[0],
            weather:     $(columns[4]).html().match(/alt="([\w\s]+)"/)[1].trim()
          });
        }
      });

      deferred.resolve(data);
    } else {
      deferred.reject(new Error('Failed to fetch feed'));
    }
  });

  return deferred.promise;
}

router.get('/weather.json', function(req, res) {
  client.get('weather-data-vienna', function(err, reply) {
    if (reply == null) {
      loadData()
      .then(function(data) {
        client.setex('weather-data-vienna', 60, JSON.stringify(data));
        res.json(data);
      })
    } else {
      res.json(JSON.parse(reply));
    }
  });
});

app.use(logfmt.requestLogger());
app.use(express.static('public'));
app.use('/', router);
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

app.listen(port, function() {
  console.log('Listening on ' + port);
});
