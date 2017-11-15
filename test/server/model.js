'use strict'

const mongoose = require('mongoose')

module.exports = (version) => {
  return new Promise(resolve => {
    let Schema = mongoose.Schema

    let schema = new Schema({
      // _id: {
      //   type: String,
      //   required: true,
      //   trim: true
      // },
      // name: {
      //   type: String,
      //   maxlength: 50,
      //   required: true,
      //   index: true,
      //   trim: true
      // },
      // email: {
      //   type: String,
      //   required: true,
      //   unique: true,
      //   trim: true
      // },
      // reputation: {
      //   upvote: {
      //     type: Number,
      //     default: 0
      //   },
      //   downvote: {
      //     type: Number,
      //     default: 0
      //   },
      //   hearts: [{
      //     type: String,
      //     trim: true
      //   }]
      // },
      // avatar: {
      //   type: String,
      //   ref: `File`,
      //   required: true,
      //   trim: true
      // },
      // location: {
      //   type: String,
      //   ref: `Location`,
      //   required: true,
      //   trim: true
      // },
      // albums: [{
      //   type: String,
      //   ref: `Album`,
      //   trim: true
      // }],
      // reviews: [{
      //   type: String,
      //   ref: `Review`,
      //   trim: true
      // }],
      // blockedUser: [{
      //   type: String,
      //   ref: `User`,
      //   trim: true
      // }],
      // bucketlist: [{
      //   destination: {
      //     type: String,
      //     ref: `Destination`,
      //     trim: true
      //   },
      //   status: {
      //     type: String,
      //     enum: ['pending', 'scheduled', 'accomplished'],
      //     default: 'pending'
      //   }
      // }],
      // events: [{
      //   event: {
      //     type: String,
      //     ref: `Event`,
      //     trim: true
      //   },
      //   status: {
      //     type: String,
      //     enum: ['scheduled', 'cancelled', 'executed', 'backed-out'],
      //     default: 'scheduled'
      //   }
      // }],
      // emailVerified: {
      //   type: Boolean,
      //   default: false
      // },
      // lastIp: {
      //   type: String,
      //   trim: true
      // },
      // lastLogin: {
      //   type: Date
      // },
      // lastPasswordReset: {
      //   type: Date
      // },

      infos: new Schema({
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
      }, {_id: false})
    }, {
      minimize: false,
      retainKeyOrder: true,
      emitIndexErrors: true
    })

    // --
    schema.add({
      createdDate: {
        type: Date,
        default: Date.now
      },
      updatedDate: {
        type: Date,
        default: Date.now
      }
    })

    schema.index({createdDate: -1})
    schema.index({updatedDate: -1})

    mongoose.model(`User`, schema, 'users')
    resolve()
  })
}
