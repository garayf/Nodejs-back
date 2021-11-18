'use strict';
// Load modules

const Chalk = require('chalk');


// Declare internals

const internals = {
    TIMEOUT: 30 * 1000
};


exports.plugin = {
    name: 'gracefully',
    register: async function (server, options) {

        // Handle Break
        process.on('SIGINT', async function () {

            try {
                await server.stop({
                    timeout: internals.TIMEOUT
                });            

                console.log(Chalk.green('Server stopped'));
                process.exit(0);
            }
            catch (e) {
                console.error(Chalk.red('Server failed to shut down gracefully'), e);
                process.exit(1);
            }
        });
    }
};
