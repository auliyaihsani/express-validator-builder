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
      schema: {},
      printParams: {},
      validatorOptions: {}
    })

    this.printParams = Object.assign(this.options.printParams, {
      isUUID: [this.options.uuidVersion]
    })

    this.validatorOptions = Object.assign(this.options.validatorOptions, {
      isUUID: [this.options.uuidVersion]
    })

    // -- pre build
    
    let schema = !_.isNil(this.options.model) ? this.options.model.schema.obj : this.options.schema
    let map = this.crawl(schema)
    let validations = {}

    console.log(map)

    // Object.keys(map).forEach(key => {
    //   Object.assign(validations, this.checkMap(key, map[key]))
    // })
    
    // this.masterSchema = validations
  }

  crawl (schema) {
    let map = {}

    Object.keys(schema).forEach(path => {
      map[path] = this.inspect(path, schema[path])
      if (_.isNil(map[path])) delete map[path]
    })

    return Object.keys(map).length ? map : {}
  }

  inspect (path, field) {
    let hasType = !_.isNil(field.type) && _.isFunction(field.type)
    let tags = hasType ? [] : {}

    if (hasType) {
      // if (path === '_id' && this.options.uuid) tags.push('isUUID')
      // if (!_.isNil(field.ref) && this.options.uuid) tags.push('isUUID')

      // if (path === 'email') tags.push('isEmail')
      // if (!_.isNil(field.unique) && field.unique) tags.push('unique')
      // if (!_.isNil(field.required) && field.required) {
      //   tags.unshift('notEmpty')
      // } else {
      //   tags.unshift('optional')
      // }

      // if ((!_.isNil(field.minlength) && field.minlength > 0) && (!_.isNil(field.maxlength) && field.maxlength > 0)) {
      //   tags.push(`isLength:${field.minlength}:${field.maxlength}`)
      // } else {
      //   if (!_.isNil(field.minlength) && field.minlength > 0) tags.push(`minlength:${field.minlength}`)
      //   if (!_.isNil(field.maxlength) && field.maxlength > 0) tags.push(`maxlength:${field.maxlength}`)
      // }

      // if (!_.isNil(field.enum) && Array.isArray(field.enum) && field.enum.length) {
      //   tags.push(`enum:${JSON.stringify(field.enum)}`)
      // }
      this.fillValidation(path, field)
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

  fillValidation (path, field) {
    let validation = {}
    let args = [path]
    let tag = ''

    validation[path] = {}

    if (!_.isNil(field.required) && field.required) {
      validation[path]
      tag = 'notEmpty'

    // } else {
    //   tag = 'optional'
    }

    let tmp = templates[tag] || {}
    
    if (!_.isEmpty(tmp)) {
      validation[path][tag]
      validation[path][tag].errorMessage = sprintf(tmp.errorMessage, args)
      Object.assign()
    }

    console.log(path, validation)
    Object.assign(validation, this.masterSchema)
  }

  checkMap (key, tags) {
    let validation = {}

    if (Array.isArray(tags)) {
      tags.forEach(tag => {
        // let result = this.mapRules(key, tag)
        let result = this.mapTag(key, tag)

        if (_.isNil(validation[result.path])) {
          validation[result.path] = result.validation
        } else {
          Object.assign(validation[result.path], result.validation)
        }
      })
    } else if (_.isPlainObject(tags)) {
      Object.keys(tags).forEach(subkey => {
        Object.assign(validation, this.checkMap(`${key}.${subkey}`, tags[subkey]))
      })
    }

    return Object.keys(validation).length ? validation : undefined
  }

  mapTag (fieldPath, tag) {
    let tuple = tag.split(/:(.+)/g)
    let validation = {}
    let alias = ''

    let result = {
      path: fieldPath,
      validation: {}
    }

    if (tag === 'optional') {
      result.validation.optional = true
      return result
    }

    if (!_.isEmpty(tuple)) {
      let value = tuple[1]
      alias = tuple[0]
      
      // switch (alias) {
      //   case 'minlength':
      //     if (Number.isFinite(+value)) {
      //       options.push({min: +value})
      //       vName = 'isLength'
      //     }; break

      //   case 'maxlength':
      //     if (Number.isFinite(+value)) {
      //       options.push({max: +value})
      //       vName = 'isLength'
      //     }; break

      //   case 'isLength':
      //     let [min, max] = value.split(/:(.+)/g)
      //     if (Number.isFinite(+min) && Number.isFinite(+max)) {
      //       options.push({min: +min, max: +max})
      //       vName = tName
      //     }; break

      //   case 'enum':
      //     let enums = JSON.parse(value)
      //     if (Array.isArray(enums) && enums.length) {
      //       options.push(`^(${enums.join('|')})$`)
      //       // validation.matches = {
      //       //   options: `^(${enums.join('|')})$`,
      //       //   errorMessage: `Can't find match value on enum field '${fieldPath}'. Expecting '${enums.join(', ')}'`
      //       // }
      //       vName = 'matches'
      //     }; break
      // }
    } else {
      switch (tag) {
        case 'unique':
          this.validatorOptions[tag] = [this.options.model.modelName, fieldPath.match(/\.*([^\.]+)$/)[0]]
          break
      }
    }

    validation[tag] = this.mapValidation(alias || tag, fieldPath)

    return {
      path: fieldPath,
      validation: validation
    }
  }

  mapValidation (tag, field) {
    let options = this.validatorOptions[tag]
    let args = [field].concat(this.printParams[tag])

    let tmp = templates[tag] || {}
    let result = {}

    if (!_.isNil(options)) {
      Object.assign(result, {options: options})
    }
      
    return _.isEmpty(tmp) ? tmp : Object.assign(result, {
      errorMessage: sprintf(tmp.errorMessage, args)
    })
  }

  mapRules__ (fieldPath, rule) {
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