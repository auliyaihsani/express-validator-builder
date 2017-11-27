'use strict'

const _ = require('lodash')
const mongoose = require('mongoose')

module.exports = {
  customSanitizers: {
    customTrim: (fieldValue) => {
      if (_.isString(fieldValue)) {
        return fieldValue.trim()
      } else if (Array.isArray(fieldValue)) {
        fieldValue = fieldValue.map((item) => {
          return _.isString(item) ? item.trim() : item
        })
      }

      return fieldValue
    }
  },
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
    },
    validator2: (a, b, c, d, e) => {
      return false
    }
    
  }
}