'use strict';

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

async function register (server, options) {
    mongoose.connect(options.mongodb_uri, {useNewUrlParser: true,useUnifiedTopology:true});
}

exports.plugin = {
  register,
  name: 'dbmongoose',
}
