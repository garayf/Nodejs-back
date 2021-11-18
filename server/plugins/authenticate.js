'use strict';

const Boom = require('boom');

async function register (server, options) {
  // await server.register(require('hapi-auth-basic'));
  // server.auth.strategy('simple', 'basic', {validate});
  server.auth.scheme('custom', function (server, options) {
  return {
      authenticate: function (req, h) {
          var token = req.headers['x-auth'];
          return User.findByToken(token).then((user) => {
              if(!user){
                  throw Boom.unauthorized(null, 'Custom');
              }
              return h.authenticated({credentials: { token: token,user:user}});
          }).catch((e)=>{
              throw Boom.unauthorized(null, 'Custom');
          })
      }
  };
});

server.auth.strategy('default', 'custom');

}

exports.plugin = {
  register,
  name: 'authentication2',
}
