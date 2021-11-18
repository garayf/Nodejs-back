'use strict';
// Load modules

const Confidence = require('confidence');
const Config = require('./config');
const Chalk = require('chalk');
const Moment= require('moment');
const builderTimezone = "Pacific/Auckland";
const criteria = {
    env: process.env.NODE_ENV
};


const manifest = {
    server: {
        debug: {
            $filter: 'env',
            production: false,
            $default: {
                request: ['error']
            }
        },
        port: Config.get('/port/api'),
        routes: {
            cors: Config.get('/routes/cors'),
            security: Config.get('/routes/security')
        }
    },
    register: {
        plugins: [
            // {
            //     plugin: './server/plugins/dbmongoose',
            //     options:{
            //         mongodb_uri: Config.get('/mongodb_uri')
            //     }
            // },
            // {
            //     plugin: './server/plugins/knackAuth'
            // },
            // {
            //     plugin: './server/plugins/authenticate'
            // },            
            // './server/plugins/knack',
            {

                plugin: 'good',
                options: {
                    ops: {
                        interval: 1000
                    },
                    reporters: {
                        console: [
                            {
                                module: 'good-squeeze',
                                name: 'Squeeze',
                                args: [{ log: '*', response: '*' }]
                            },
                            {
                                module: 'good-console',
                                args: [{
                                    format: 'DD/MM/YY hh:MM a',
                                    utc: false
                                }]
                            },
                            'stdout'
                        ]
                    }
                }
            },
            './server/plugins/knack',
            {
                plugin: './server/api/api',
                routes: {
                    prefix: Config.get('/routes/prefix')
                }
            },
            {
                plugin: './server/api/formitizeApi',
                routes: {
                    prefix: `${Config.get('/routes/prefix')}/formitizeApi`
                }
            },
            {
                plugin: './server/api/appenateApi',
                routes: {
                    prefix: `${Config.get('/routes/prefix')}/appenateApi`
                }
            },          
            {
                plugin: './server/api/default'
            },
            // './server/plugins/axiosFormatize',
        ]
    }
};


const store = new Confidence.Store(manifest);


exports.get = function (key) {

    return store.get(key, criteria);
};


exports.meta = function (key) {

    return store.meta(key, criteria);
};
