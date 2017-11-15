'use strict'

const mongoose = require('mongoose')

module.exports = () => {
  return new Promise(resolve => {
    let Schema = mongoose.Schema

    let schema = new Schema({
      _id: {
        type: String,
        required: true,
        trim: true
      },
      email: {
        type: String,
        maxlength: 50,
        required: true,
        unique: true,
        index: true,
        trim: true
      },
      enums: {
        type: String,
        enum: ['pending', 'scheduled', 'accomplished'],
        default: 'pending'
      },
      ref: {
        type: String,
        ref: `Demo1`,
        required: true,
        trim: true
      },
      arrRef: [{
        type: String,
        ref: `Demo2`,
        trim: true
      }],

      arrObj: [{
        destination: {
          type: String,
          ref: `Destination`,
          trim: true
        },
        status: {
          type: String,
          enum: ['pending', 'scheduled', 'accomplished'],
          default: 'pending'
        }
      }],

      schemaObj: new Schema({
        title: {
          type: String,
          required: true,
          trim: true
        },
        content: {
          type: String,
          required: true,
          maxlength: 10,
          trim: true
        }
      }, {_id: false}),

      noValidatoin1: {
        type: Boolean,
        default: false
      },
      noValidatoin2: {
        type: String,
        trim: true
      },
      noValidatoin3: {
        type: Number,
        default: 0
      },
      noValidatoin4: {
        type: Date
      },
    })

    mongoose.model(`TestModel`, schema, 'testmodel')
    resolve()
  })
}
