'use strict';
// Load modules

const Confidence = require('confidence');


const criteria = {
    env: process.env.NODE_ENV
};


const config = {
    $meta: 'This file configures the plot device.',
    mongodb_uri: 'mongodb://'+process.env.MONGO_USER+':'+process.env.MONGO_PASSWORD+'@'+process.env.MONGO_URL+':27017/'+process.env.MONGODB_NAME+'?authSource='+process.env.MONGODB_NAME_AUTH,
    routes: {
        prefix: '/api/v1',
        security: true,
        cors: {
            origin: {
                $filter: 'env',
                qa: ['*'],
                production: ['*'],
                $default: ['*']
            }
        }
    },
    port: {
        api: {
            $filter: 'env',
            test: 9000,
            $default: process.env.PORT
        }
    },
    cron: {
        timezone: 'Etc/GMT'
    }
};


const store = new Confidence.Store(config);


exports.get = function (key) {

    return store.get(key, criteria);
};


exports.meta = function (key) {

    return store.meta(key, criteria);
};
