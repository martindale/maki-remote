var url = require('url');
var util = require('util');
var rest = require('restler');
var WebSocket = require('ws');

var RPCService = require('./lib/service-rpc');

function Remote(base, id) {
  this.url = base;
  this.id = id || 'id';

  var parsed = url.parse(base);

  this.host = parsed.host;
  this.path = parsed.path;
  this.retries = 0;

  this.resourceMap = {};
}

util.inherits(Remote, require('events').EventEmitter);

Remote.prototype.connect = function() {
  var self = this;
  var endpoint = 'ws://' + self.host + self.path;
  
  self.ws = new WebSocket(endpoint);

  self.ws.on('open', self.emit.bind(self, 'open'));
  self.ws.on('close', self.emit.bind(self, 'close'));
  self.ws.on('error', self.emit.bind(self, 'error'));
  self.ws.on('message', function(msg) {
    self.emit('message', JSON.parse(msg));
  });
  
  self.ws.on('open', function() {
    self.retries = 0;
  });

  self.ws.on('close', reconnect);
  self.ws.on('error', reconnect);

  function reconnect () {
    clearTimeout(self.timer);

    self.retries++;
    
    var start = 50;
    var max = 10;
    var scale = (self.retries && self.retries < max) ? self.retries : max;    
    var mult = start * scale;

    self.next = (self.retries) ? mult : start;
    self.timer = setTimeout(function connect () {
      self.connect();
    }, self.next);
  }
};

Remote.prototype.init = function(opts, cb) {
  var self = this;
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  if (!cb) {
    cb = new Function();
  }
  
  if (!opts) {
    opts = {};
  }

  self._options('/', function(err, options) {
    if (err) return cb(err);

    self.resources = options.resources;

    options.resources.forEach(function(r) {
      self.resourceMap[r.name] = r;
    });
    
    self.connect();

    cb();
  });
};

Remote.prototype._options = function(url, cb) {
  var self = this;
  rest.request( this.url + url , {
    method: 'OPTIONS',
    parser: rest.parsers.json,
    headers: {
      'Accept': 'application/json'
    }
  }).on('complete', function(data) {
    if (!data) return cb('Connection failure');
    if (!data.resources) return cb('No resources found on remote');

    return cb(null, data);
  });
};

Remote.prototype._get = function(url, params, cb) {
  var self = this;
  
  if (typeof params === 'function') {
    cb = params;
    params = {};
  }
  
  rest.get( this.url + url , {
    headers: {
      'Accept': 'application/json'
    }
  }).on('complete', function(data) {
    return cb(null, data);
  });
};

Remote.prototype._post = function(url, data, cb) {
  var self = this;
  if (typeof data === 'function') {
    cb = data;
    data = {};
  }
  rest.postJson( this.url + url , data, {
    headers: {
      'Accept': 'application/json'
    }
  }).on('complete', function(data) {
    return cb(null, data);
  });
};

Remote.prototype._put = function(url, data, cb) {
  var self = this;
  if (typeof data === 'function') {
    cb = data;
    data = {};
  }

  var endpoint = this.url + url;
  console.log('_put endpoint:', endpoint);

  rest.putJson(endpoint, data, {
    headers: {
      'Accept': 'application/json'
    }
  }).on('complete', function(data) {
    return cb(null, data);
  });
};

Remote.prototype._patch = function(url, data, cb) {
  var self = this;
  if (typeof data === 'function') {
    cb = data;
    data = {};
  }
  rest.patch( this.url + url , {
    headers: {
      'Accept': 'application/json'
    },
    data: data
  }).on('complete', function(data) {
    return cb(null, data);
  });
};

Remote.prototype.create = function(obj, cb) {
  this._post('', obj, cb);
};

Remote.prototype.update = function(query, params, cb) {
  // TODO: make both queries and paths work with this
  // probably pass everything to '' as query params
  this._patch('/' + query, params, cb);
};

Remote.prototype.query = function(obj, cb) {
  this._get('', cb);
};

Remote.prototype.get = function(id, cb) {
  this._get('/' + id, cb);
};

module.exports = Remote;
