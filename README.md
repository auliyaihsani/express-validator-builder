# express-validator-builder
`ctavan/express-validator` validation schema builder for mongo.

This is not a fully grown project, lots of things are needed to implement like support for: 
- custom validation
- unique validation
- build generic rule file to support other DBs
- etc.

## Installation
`npm i -S express-validator-builder`

## Usage
```
let options = {
  uuid: true // attach 'isUUID' validation to all ref's & _id's (default: true)
}

let Model = mongoose.model('User')
let mongooseSchema = Model.schema.obj

let validationSchema = validationBuilder.build(mongooseSchema, options)
console.log(validationSchema) // see result below
```

## Simple Rule Build

#### Mongoose Schema - Simple
```
let schema = new mongoose.Schema({
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
    enum: ['pending', 'scheduled', 'accomplished']
  }
})
```

#### Result - Simple
```
{
  "_id": {
    "notEmpty": {
      "errorMessage": "Kindly specify a valid _id"
    },
    "isUUID": {
      "options": [5],
      "errorMessage": "Expecting UUIDv5 for field '_id'"
    }
  },
  "email": {
    "notEmpty": {
      "errorMessage": "Kindly specify a valid email"
    },
    "isEmail": {
      "errorMessage": "Kindly specify a valid email address"
    },
    "isLength": {
      "options": [{"max": 50}],
      "errorMessage": "Field 'email' must not exceed more than 50 characters."
    }
  },
  "enums": {
    "optional": true,
    "matches": {
      "options": "^pending$|^scheduled$|^accomplished$",
      "errorMessage": "Can't find match value on 'enums' enum field. Expecting 'pending, scheduled, accomplished'"
    }
  }
}
```

## Complex Rule Build

#### Mongoose Schema - Complex
```
let Schema = mongoose.Schema
let schema = new Schema({
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
```

#### Result - Complex
```
{
  "ref": {
    "notEmpty": {
      "errorMessage": "Kindly specify a valid ref"
    },
    "isUUID": {
      "options": [5],
      "errorMessage": "Expecting UUIDv5 for field 'ref'"
    }
  },
  "arrRef.*": {
    "optional": true,
    "isUUID": {
      "options": [5],
      "errorMessage": "Expecting UUIDv5 for field 'arrRef.*'"
    }
  },
  "arrObj.*.destination": {
    "optional": true,
    "isUUID": {
      "options": [5],
      "errorMessage": "Expecting UUIDv5 for field 'arrObj.*.destination'"
    }
  },
  "arrObj.*.status": {
    "optional": true,
    "matches": {
      "options": "^pending$|^scheduled$|^accomplished$",
      "errorMessage": "Can't find match value on 'arrObj.*.status' enum field. Expecting 'pending, scheduled, accomplished'"
    }
  },
  "schemaObj.title": {
    "notEmpty": {
      "errorMessage": "Kindly specify a valid schemaObj.title"
    }
  },
  "schemaObj.content": {
    "notEmpty": {
      "errorMessage": "Kindly specify a valid schemaObj.content"
    },
    "isLength": {
      "options": [{"max": 10}],
      "errorMessage": "Field 'schemaObj.content' must not exceed more than 50 characters."
    }
  }
}
```
