/* global describe, it */
'use strict'

require('./model')()

const should = require('should')
const mongoose = require('mongoose')
const validationBuilder = require('../index')

describe('Builder Test', function () {
  describe('# Start', function () {
    let Model = mongoose.model('TestModel')
    

    it('should start the app', function (done) {
      let options = {
        uuid: true
      }

      let mongooseSchema = Model.schema.obj
      let validationScema = validationBuilder.build(mongooseSchema, options)

      console.log('zz', JSON.stringify(validationScema))
      done()
    })
  })
})
