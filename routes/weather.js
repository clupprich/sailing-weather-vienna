var express = require('express')
  , redis = require('redis')
  , url = require('url');

var router = express.Router();
var redisURL = url.parse(process.env.REDISCLOUD_URL || 'http://127.0.0.1:6379');
var client = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
if (redisURL.auth) {
  client.auth(redisURL.auth.split(':')[1]);
}

router.get('/weather.json', function(req, res) {
  client.get('weather-data-vienna', function(err, reply) {
    res.json(JSON.parse(reply));
  });
});

module.exports = router;
