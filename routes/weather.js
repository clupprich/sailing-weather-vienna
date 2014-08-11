var express = require('express')
  , request = require('request')
  , cheerio = require('cheerio')
  , redis = require('redis')
  , url = require('url')
  , q = require('q')
  , util = require('util');

var router = express.Router();
var redisURL = url.parse(process.env.REDISCLOUD_URL || 'http://127.0.0.1:6379');
var client = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
if (redisURL.auth) {
  client.auth(redisURL.auth.split(':')[1]);
}

loadData = function() {
  var deferred = q.defer();

  request.get('https://www.wien.gv.at/wetter/segeln/', function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var data = [];
      var now = new Date();
      var dayWrap = false;
      var prevTime;

      $ = cheerio.load(body);
      $('.BDE-table-frame tr').each(function(_, row) {
        var columns = $(this).find('td').get();

        if (columns.length > 0) {
          var time = new Date(util.format('%s-%s-%s %s', now.getFullYear(), now.getMonth() + 1, now.getDate(), $(columns[0]).text().match(/\d{2}:\d{2}/)[0]));
          //var time = $(columns[0]).text().match(/\d{2}:\d{2}/)[0];

          if (!dayWrap && prevTime) {
            if (prevTime.getHours() > time.getHours()) {
              dayWrap = true;
            }
          }

          if (dayWrap) {
            time.setDate(now.getDate() + 1);
          }

          var wind = parseFloat($(columns[1]).text().match(/\d+.\d+/)[0]);
          var direction = $(columns[2]).text().match(/\w+/)[0];
          var temperature = parseFloat($(columns[3]).text().match(/-*\d+.\d+/)[0]);
          var weather = $(columns[4]).html().match(/alt="([\w\s]+)"/)[1].trim().toLowerCase();

          data.push({
            time:        time.toISOString(),
            wind:        wind,
            direction:   direction,
            temperature: temperature,
            weather:     weather
          });

          prevTime = time;
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
        client.setex('weather-data-vienna', 60*10, JSON.stringify(data));
        res.json(data);
      })
    } else {
      res.json(JSON.parse(reply));
    }
  });
});

module.exports = router;
