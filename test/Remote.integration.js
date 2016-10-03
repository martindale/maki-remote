describe('Remote', function() {
  describe('init', function() {
    it('should get OPTIONS', function(done) {
      var Remote = require('../');
      var remote = new Remote('http://localhost:9200');
      remote.init(function() {
        done();
      });
    });
    it('should open a websocket', function(done) {
      var Remote = require('../');
      var remote = new Remote('http://localhost:9200');

      remote.on('open', done);
      remote.init();
    });
  });
  describe('create', function() {
    it('should receive updates', function(done) {
      var Remote = require('../');
      var remote = new Remote('http://localhost:9200');

      remote.on('message', function(msg) {
        if (msg.method === 'patch' && msg.params.channel === '/invitations') {
          done();
        }
      });

      remote.on('open', function() {
        remote._post('/invitations', {
          email: 'eric@ericmartindale.com'
        }, function(data) {
          console.log('_post:', data);
        });
      });

      remote.init();

    });
  });
});
