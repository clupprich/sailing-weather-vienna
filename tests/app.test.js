var superagent = require('superagent')
var expect = require('expect.js')

describe('weather data', function(){
  this.timeout(5000);

  it('fetch data', function(done){
    superagent.get('http://localhost:5000/weather.json')
      .end(function(e, res){
        //console.log(res.body)

        expect(e).to.eql(null);
        expect(res.body[0]).to.have.keys('weather', 'wind', 'temperature', 'time');

        done()
      });
  });
});
