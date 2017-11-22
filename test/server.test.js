
'use strict'

require('./model')()
const _ = require('lodash')
const restify = require('restify')
const mongoose = require('mongoose')
const errors = require('restify-errors')
const ValidationBuilder = require('../index')
const expressValidator = require('express-validator')

const server = restify.createServer({
  name: 'myapp',
  version: '1.0.0'
});

mongoose.Promise = Promise
mongoose.connect('mongodb://localhost/local')

server.use(restify.plugins.acceptParser(server.acceptable))
server.use(restify.plugins.queryParser())
server.use(restify.plugins.bodyParser())

server.use(expressValidator({
  customSanitizers: {},
  customValidators: {
    unique: (value, modelName, field) => {
      return new Promise((resolve, reject) => {
        let model = mongoose.model(modelName)
        let filter = {}

        filter[field] = value

        model.findOne(filter).then(doc => {
          if (doc) {
            resolve()
          } else {
            reject()
          }
        }).catch(err => {
          reject(err)
        })
      })
    }
  }
}))

// -- 
let options = {
  uuid: true,
  model: 'TestModel'
}

let builder = new ValidationBuilder(options)
let validationScema = builder.build()

console.log(JSON.stringify(validationScema))

server.get('/echo/:name', function (req, res, next) {
  // validationScema = {
  //   name: {
  //     // in: 'params',
  //     notEmpty: {errorMessage: 'Kindly specify a valid name.'},
  //     unique: {errorMessage: 'unique xxxxxxxxxxxxx'},
  //   }
  // }
  
  req.check(validationScema)

  req.getValidationResult().then(result => {
    if (result.isEmpty()) {
      res.send(req.params)
      return next()
    }

    next(new errors.BadRequestError(JSON.stringify({
      text: 'Validation Error',
      details: result.array()
    })))
  })
});

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});