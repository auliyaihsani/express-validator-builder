'use strict'

const _ = require('lodash')
const ALLOCATIONS = ['params', 'query', 'body', 'headers', 'cookies']

class ValidatorBuilder {
  constructor (options) {
    this.masterSchema = {}
    this.options = options || {}

    this._fields = null
    this._alloc = null
    this._mix = null

    _.defaults(this.options, {
      uuid: false,
      uuidVersion: 5
    })
  }

  build (schema = {}) {
    let validations = {}
    let map = {}
    
    if (!_.isNil(this.options.model)) {
      schema = this.options.model.schema.obj
    }

    map = this.crawl(schema)

    Object.keys(map).forEach(key => {
      Object.assign(validations, this.checkMap(key, map[key]))
    })

    this.masterSchema = validations
    return _.clone(validations)
  }

  checkMap (key, mapField) {
    let validation = {}

    if (Array.isArray(mapField)) {
      mapField.forEach(rule => {
        let result = this.mapRules(key, rule)

        if (_.isNil(validation[result.path])) {
          validation[result.path] = result.validation
        } else {
          Object.assign(validation[result.path], result.validation)
        }
      })
    } else if (_.isPlainObject(mapField)) {
      Object.keys(mapField).forEach(subkey => {
        Object.assign(validation, this.checkMap(`${key}.${subkey}`, mapField[subkey]))
      })
    }

    return Object.keys(validation).length ? validation : undefined
  }

  mapRules (fieldPath, rule) {
    let validation = {}

    switch (rule) {
      case 'unique':
        validation.unique = {
          options: [this.options.model, fieldPath],
          errorMessage: `Expecting unique value for field '${fieldPath}'`
        }; break

      case 'optional':
        validation.optional = true
        break

      case 'uuid':
        validation.isUUID = {
          options: [this.options.uuidVersion],
          errorMessage: `Expecting UUIDv5 for field '${fieldPath}'`
        }; break

      case 'required':
        validation.notEmpty = {
          errorMessage: `Kindly specify a value in ${fieldPath}`
        }; break

      case 'email':
        validation.isEmail = {
          errorMessage: `Kindly specify a valid email address`
        }; break

      default: {
        let tuple = rule.split(/:(.+)/g)

        if (tuple.length > 1) {
          if (tuple[0] === 'minlength' && Number.isFinite(+tuple[1])) {
            validation.isLength = {
              options: [{min: +tuple[1]}],
              errorMessage: `Field '${fieldPath}' must be atleast ${tuple[1]} character(s).`
            }
          } else if (tuple[0] === 'maxlength' && Number.isFinite(+tuple[1])) {
            validation.isLength = {
              options: [{max: +tuple[1]}],
              errorMessage: `Field '${fieldPath}' must not exceed in ${tuple[1]} character(s).`
            }
          } else if (tuple[0] === 'enum') {
            let enums = JSON.parse(tuple[1])
            if (Array.isArray(enums) && enums.length) {
              validation.matches = {
                options: `^(${enums.join('|')})$`,
                errorMessage: `Can't find match value on '${fieldPath}' enum field. Expecting '${enums.join(', ')}'`
              }
            }
          }
        }
      }
    }

    return {
      path: fieldPath,
      validation: validation
    }
  }

  crawl (obj) {
    let map = {}

    Object.keys(obj).forEach(key => {
      map[key] = this.inspect(key, obj[key])
      if (_.isNil(map[key])) delete map[key]
    })

    return Object.keys(map).length ? map : {}
  }

  inspect (key, field) {
    let hasType = !_.isNil(field.type) && _.isFunction(field.type)
    let tags = hasType ? [] : {}

    if (hasType) {
      if (key === '_id' && this.options.uuid) tags.push('uuid')
      if (!_.isNil(field.ref) && this.options.uuid) tags.push('uuid')

      if (key === 'email') tags.push('email')
      if (!_.isNil(field.unique) && field.unique) tags.push('unique')
      if (!_.isNil(field.required) && field.required) tags.unshift('required')
      if (!_.isNil(field.maxlength) && field.maxlength > 0) tags.push(`maxlength:${field.maxlength}`)

      if (!_.isNil(field.enum) && Array.isArray(field.enum) && field.enum.length) {
        tags.push(`enum:${JSON.stringify(field.enum)}`)
      }

      if (tags.length && !tags.includes('required')) tags.unshift('optional')
    } else {
      if (Array.isArray(field)) {
        tags['*'] = this.inspect('*', field[0])
        if (_.isNil(tags['*'])) delete tags['*']
      } else if (_.isPlainObject(field)) {
        tags = this.crawl(field)
      } else if (_.isObject(field)) {
        tags = this.crawl(field.obj)
      }
    }

    return (hasType && tags.length ? tags : (Object.keys(tags).length ? tags : undefined))
  }

  // -- user usable functions

  location (alloc) {
    this._alloc = alloc
    return this
  }

  select (fields) {
    this._fields = fields
    return this
  }

  mixPick (options) {
    this._mix = options
    return this
  }

  get () {
    let schema = _.clone(this.masterSchema)
    let mixPick = {}

    if (!_.isEmpty(this._mix) && _.isPlainObject(this._mix)) {
      Object.keys(this._mix).forEach(alloc => {
        if (ALLOCATIONS.includes(alloc) && Array.isArray(this._mix[alloc])) {
          this._mix[alloc].forEach(field => {
            if (!_.isEmpty(schema[field])) {
              mixPick[field] = Object.assign(_.clone(schema[field]), {in: alloc})
            }
          })
        }
      })

      this._mix = null

      if (_.isNil(this._fields) && _.isNil(this._alloc)) {
        return mixPick
      }
    }

    if (!_.isEmpty(this._fields)) {
      schema = _.pick(schema, this._fields)
      this._fields = null
    }

    if (ALLOCATIONS.includes(this._alloc)) {
      Object.keys(schema).forEach(field => {
        if (!_.isEmpty(schema[field])) {
          schema[field].in = this._alloc
        }
      })

      this._alloc = null
    }

    return Object.assign(schema, mixPick)
  }
}

module.exports = ValidatorBuilder