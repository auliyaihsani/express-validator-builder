var _ = require('lodash')

var Builder = function (mongooseSchema, options) {
  options = options || {}

  var defaults = {
    uuid: true
  }

  _.defaults(options, defaults)

  function __build (schema) {
    var validations = {}
    var map = {}

    map = __crawl(schema)

    Object.keys(map).forEach(key => {
      Object.assign(validations, __checkMap(key, map[key]))
    })

    return validations
  }

  function __checkMap (key, mapField) {
    var validation = {}

    if (Array.isArray(mapField)) {
      mapField.forEach(rule => {
        var result = __mapRules(key, rule)

        if (_.isNil(validation[result.path])) {
          validation[result.path] = result.validation
        } else {
          Object.assign(validation[result.path], result.validation)
        }
      })
    } else if (_.isPlainObject(mapField)) {
      Object.keys(mapField).forEach(subkey => {
        Object.assign(validation, __checkMap(`${key}.${subkey}`, mapField[subkey]))
      })
    }

    return Object.keys(validation).length ? validation : undefined
  }

  function __mapRules (fieldPath, rule) {
    var validation = {}

    switch (rule) {
      case 'unique':
        break

      case 'optional':
        validation.optional = true
        break

      case 'uuid':
        validation.isUUID = {
          options: [5],
          errorMessage: `Expecting UUIDv5 for field '${fieldPath}'`
        }; break

      case 'required':
        validation.notEmpty = {
          errorMessage: `Kindly specify a valid ${fieldPath}`
        }; break

      case 'email':
        validation.isEmail = {
          errorMessage: `Kindly specify a valid email address`
        }; break

      default: {
        var tuple = rule.split(/:(.+)/g)

        if (tuple.length > 1) {
          if (tuple[0] === 'maxlength' && Number.isFinite(+tuple[1])) {
            validation.isLength = {
              options: [{max: +tuple[1]}],
              errorMessage: `Field '${fieldPath}' must not exceed more than 50 characters.`
            }
          } else if (tuple[0] === 'enum') {
            let enums = JSON.parse(tuple[1])
            if (Array.isArray(enums) && enums.length) {
              let regex = ''; enums.forEach(e => { regex += (!regex.length ? '' : '|') + '^' + e + '$' })
              validation.matches = {
                options: regex,
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

  function __crawl (obj) {
    var map = {}

    Object.keys(obj).forEach(key => {
      map[key] = __inspect(key, obj[key])
      if (_.isNil(map[key])) delete map[key]
    })

    return Object.keys(map).length ? map : {}
  }

  function __inspect (key, field) {
    var hasType = !_.isNil(field.type) && _.isFunction(field.type)
    var tags = hasType ? [] : {}

    if (hasType) {
      if (key === '_id' && options.uuid) tags.push('uuid')
      if (!_.isNil(field.ref) && options.uuid) tags.push('uuid')

      if (key === 'email') tags.push('email')
      if (!_.isNil(field.required) && field.required) tags.unshift('required')
      if (!_.isNil(field.maxlength) && field.maxlength > 0) tags.push(`maxlength:${field.maxlength}`)

      if (!_.isNil(field.enum) && Array.isArray(field.enum) && field.enum.length) {
        tags.push(`enum:${JSON.stringify(field.enum)}`)
      }

      if (tags.length && !tags.includes('required')) tags.unshift('optional')
    } else {
      if (Array.isArray(field)) {
        tags['*'] = __inspect('*', field[0])
        if (_.isNil(tags['*'])) delete tags['*']
      } else if (_.isPlainObject(field)) {
        tags = __crawl(field)
      } else if (_.isObject(field)) {
        tags = __crawl(field.obj)
      }
    }

    return (hasType && tags.length ? tags : (Object.keys(tags).length ? tags : undefined))
  }

  return __build(mongooseSchema)
}

module.exports.build = Builder
