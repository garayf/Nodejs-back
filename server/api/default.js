const Boom = require('boom')


exports.plugin = {
    name: 'default',
    register: function (server) {
        server.route({
          method: [ 'GET', 'POST' ],
          path: '/{any*}',
          handler: (request, reply) => {
            const accept = request.raw.req.headers.accept

            return reply.response({result:'This resource isn’t available.'}).code(404)
          }
        })

    }
}
