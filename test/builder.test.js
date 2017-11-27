'use strict'

require('./model')()
const mongoose = require('mongoose')
const ValidationBuilder = require('../index')
const customValidation = require('./custom-validator')

let options = {
  uuid: true,
  model: mongoose.model('TestModel'),
  template: require('./message-template'),
  validatorOptions: {
    // unique: ['TestModel', '_id']
  }
}

let validations = new ValidationBuilder(options)

let schema = validations
  // .pickByLoc({query: ['_id'], params: ['email']})
  // .select(['_id', 'enums', 'ref'])
  // .location('body')
  // .exclude('enums')
  .build()

console.log(schema)
console.log('\n---', JSON.stringify(schema))

// validations.fetchCustomKeys(customValidation.customValidators)
// validations.add('obj.path', ['required', 'unique'], false)
// console.log(validations.get('obj.path'))
