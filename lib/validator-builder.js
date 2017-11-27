'use strict'

const _ = require('lodash')
const sprintf = require('sprintf-js').vsprintf
const templates = require('./validator-template')
const ALLOCATIONS = ['params', 'query', 'body', 'headers', 'cookies']

class ValidatorBuilder {
  constructor (options) {
    this._mix = null
    this._omit = null
    this._alloc = null
    this._fields = null

    this.masterSchema = {}
    this.unwiredSchema = {}
    this.options = options || {}

    this.keys = []

    _.defaults(this.options, {
      uuid: false,
      uuidVersion: 5,
      schema: {}
    })

    // -- pre build
    
    let schema = !_.isNil(this.options.model) ? this.options.model.schema.obj : this.options.schema
    let map = this.crawl(schema)
    let validations = {}

    Object.keys(map).forEach(key => {
      Object.assign(validations, this.checkMap(key, map[key]))
    })
    
    this.masterSchema = validations
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
    let options = []
    let vName = ''
    let tName = ''

    if (/:(.+)/g.test(rule)) { // with tuple
      let arr = rule.split(/:(.+)/g)
      let value = arr[1]

      tName = arr[0]

      switch (tName) {
        case 'minlength':
          if (Number.isFinite(+value)) {
            options.push({min: +value})
            vName = 'isLength'
          }; break

        case 'maxlength':
          if (Number.isFinite(+value)) {
            options.push({max: +value})
            vName = 'isLength'
          }; break

        case 'isLength':
          let [min, max] = value.split(/:(.+)/g)
          if (Number.isFinite(+min) && Number.isFinite(+max)) {
            options.push({min: +min, max: +max})
            vName = tName
          }; break

        case 'enum':
          let enums = JSON.parse(value)
          if (Array.isArray(enums) && enums.length) {
            options.push(`^(${enums.join('|')})$`)
            // validation.matches = {
            //   options: `^(${enums.join('|')})$`,
            //   errorMessage: `Can't find match value on enum field '${fieldPath}'. Expecting '${enums.join(', ')}'`
            // }
            vName = 'matches'
          }; break
      }
    } else {
      tName = rule
      vName = rule

      switch (tName) {
        case 'optional':
          tName = ''
          validation.optional = true
          break

        case 'unique':
          options.push(this.options.model.modelName)
          options.push(fieldPath)
          break

        case 'isUUID':  
          options.push(this.options.uuidVersion)
          break
      }
    }

    if (vName && tName) {
      validation[vName] = this.mapTemplate(tName, fieldPath, options)
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
      if (key === '_id' && this.options.uuid) tags.push('isUUID')
      if (!_.isNil(field.ref) && this.options.uuid) tags.push('isUUID')

      if (key === 'email') tags.push('isEmail')
      if (!_.isNil(field.unique) && field.unique) tags.push('unique')
      if (!_.isNil(field.required) && field.required) tags.unshift('notEmpty')

      if ((!_.isNil(field.minlength) && field.minlength > 0) && (!_.isNil(field.maxlength) && field.maxlength > 0)) {
        tags.push(`isLength:${field.minlength}:${field.maxlength}`)
      } else {
        if (!_.isNil(field.minlength) && field.minlength > 0) tags.push(`minlength:${field.minlength}`)
        if (!_.isNil(field.maxlength) && field.maxlength > 0) tags.push(`maxlength:${field.maxlength}`)
      }

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

  mapTemplate (rule, field, options) {
    let result = {}
    let args = [field]
    let tmp = templates[rule] || {}
    
    if (_.isEmpty(tmp)) return tmp

    if (!_.isEmpty(tmp.options)) {
      options.forEach(option => {
        if (_.isPlainObject(option)) {
          Object.keys(option).forEach(optKey => {
            args.push(option[optKey])
          })
        } else {
          args.push(option)
        }
      })

      Object.assign(result, {options: options})
    }

    return Object.assign(result, {
      errorMessage: sprintf(tmp.errorMessage, args)
    })
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

  pickByLoc (options) {
    this._mix = options
    return this
  }

  exclude (path) {
    this._omit = path
    return this
  }

  build () {
    let schema = _.clone(this.masterSchema)
    let pickByLoc = {}

    if (!_.isNil(this._omit)) {
      schema = _.omit(schema, this._omit)
    }

    if (!_.isEmpty(this._mix) && _.isPlainObject(this._mix)) {
      Object.keys(this._mix).forEach(alloc => {
        if (ALLOCATIONS.includes(alloc) && Array.isArray(this._mix[alloc])) {
          this._mix[alloc].forEach(field => {
            if (!_.isEmpty(schema[field])) {
              pickByLoc[field] = Object.assign(_.clone(schema[field]), {in: alloc})
            }
          })
        }
      })

      this._mix = null

      if (_.isNil(this._fields) && _.isNil(this._alloc)) {
        return pickByLoc
      }
    }

    if (!_.isEmpty(this._fields) && Array.isArray(this._fields)) {
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

    return Object.assign(schema, pickByLoc)
  }

  // -- 

  add (path, rules, wire = true) {
    if (_.isString(rules)) rules = [rules]

    if (Array.isArray(rules)) {
      let validation = {}

      rules.forEach(rule => {
        let result = this.mapRules(path, rule)

        if (_.isNil(validation[path])) {
          validation[path] = result.validation
        } else {
          Object.assign(validation[path], result.validation)
        }
      })

      // Object.assign() param 2 takes precedence, it means if 
      // both obj has the same property the value of 2nd param
      // will take effect

      if (wire) {
        this.masterSchema = Object.assign(validation, this.masterSchema)
      } else {
        this.unwiredSchema = Object.assign(validation, this.unwiredSchema)
      }
    }
    
    return this
  }

  get (path) {
    let result = {}    
    let validation = this.masterSchema[path] || this.unwiredSchema[path] || {}

    if (!_.isEmpty(validation)) result[path] = validation

    return result
  }

  fetchCustomKeys (customValidators) {
    Object.keys(customValidators).forEach(key => {
      this.keys.push(key)
    })
  }
}

module.exports = ValidatorBuilder