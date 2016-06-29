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

  this.resourceMap = {};
}

util.inherits(Remote, require('events').EventEmitter);

Remote.prototype.init = function(cb) {
  var self = this;
  if (!cb) var cb = new Function();

  self._options('/', function(err, options) {
    self.resources = options.resources;

    options.resources.forEach(function(r) {
      self.resourceMap[r.name] = r;
    });

    var endpoint = 'ws://' + self.host + self.path;

    self.ws = new WebSocket(endpoint);
    self.ws.on('open', self.emit.bind(self, 'open'));
    self.ws.on('message', function(msg) {
      self.emit('message', JSON.parse(msg));
    });

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
    return cb(null, data);
  });
};

Remote.prototype._get = function(url, cb) {
  var self = this;
  rest.get( this.url + url , {
    headers: {
      'Accept': 'application/json'
    }
  }).on('complete', function(data) {
    if (!data[ self.id ]) return cb(data);
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
    if (!data[ self.id ]) return cb(data);
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
    if (!data[ self.id ]) return cb(data);
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
    if (!data[ self.id ]) return cb(data);
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
