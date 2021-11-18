'use strict';

// Load environment variables
require('env2')(
    require('path')
    .join(__dirname, '.env')
);

// Load modules

const Glue = require('glue');
const Manifest = require('./manifest');
const Chalk = require('chalk');
// const {mongoose} = require('./server/db/mongoose');

// Start server
const start = async () => {


    try {
        const server = await Glue.compose(
            Manifest.get('/'),
            { relativeTo: __dirname }
        );


        await server.start();

        server.log('info', Chalk.green(`Server started: ${server.info.uri}`));

        return server;
    }
    catch (err) {
        console.error(Chalk.red(err));
        process.exit(1);
    }
};


module.exports = start();
