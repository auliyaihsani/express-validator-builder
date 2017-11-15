const mongoose = require('mongoose')
const expressValidator = require('express-validator')
const validatorBuilder = require('../../index')

require('./model')()

let options = {
  uuid: false
}

let Model = mongoose.model('User')
let validationScema = validatorBuilder.build(Model.schema.obj, options)

console.log('xx', JSON.stringify(validationScema))
