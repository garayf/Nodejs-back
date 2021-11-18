'use strict';

//Declare modules
const mongoose = require('mongoose');
const _ = require('lodash');
// Declare internals

const internals = {

};

var AuthTokenSchema = new mongoose.Schema({
    token:{
        type:String,
        required:true,
        unique:true,
        minlength:1,
    },
    create_date:{
        type:Date,
        required:true,
        default: Date.now()
    },
    last_update:{
        type:Date,
        required:true,
        default: Date.now()
    }
});

AuthTokenSchema.methods.toJSON = function () {
    var token = this;
    var tokenObject = token.toObject();
    return _.pick(tokenObject,['token']);
}

var AuthToken = mongoose.model('AuthToken',AuthTokenSchema)

module.exports = {AuthToken};
