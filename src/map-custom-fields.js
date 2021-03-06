import _ from 'underscore'

import CONSTANTS from './constants'

export default (function MapCustomFields () {
  // Public methods
  return {
    parse,
    mapBoolean,
    mapMoney,
    mapSet,
    mapNumber,
  }

  function isValidValue (value) {
    return _.isString(value) && value.length > 0
  }

  function processError (errors, rowIndex, customTypeKey) {
    return _.reduce(errors, (prev, curr) => {
      prev.push(`[row ${rowIndex}: ${customTypeKey}] - ${curr}`)
      return prev
    }, [])
  }

  function parse (data, customType, rowIndex) {
    const _data = _.clone(data)
    const custom = {
      type: {
        id: customType.id,
      },
      fields: {},
    }
    const result = {
      error: [],
      data: custom,
    }
    _.each(_data, (value, key) => {
      _.each(customType.fieldDefinitions, (fieldDef) => {
        if (fieldDef.name === key)
          switch (fieldDef.type.name) {
            case 'Number': {
              const _result = this.mapNumber(value)
              if (_result.error)
                result.error.push(
                    `[row ${rowIndex}: ${customType.key}] - ${_result.error}`
                  )
              if (!_.isUndefined(_result.data))
                custom.fields[key] = _result.data
              break
            }
            case 'Boolean': {
              const _result = this.mapBoolean(value)
              if (_result.error)
                result.error.push(
                    `[row ${rowIndex}: ${customType.key}] - ${_result.error}`
                  )
              if (!_.isUndefined(_result.data))
                custom.fields[key] = _result.data
              break
            }
            case 'Money': {
              const _result = this.mapMoney(value)
              if (_result.error)
                result.error.push(
                    `[row ${rowIndex}: ${customType.key}] - ${_result.error}`
                  )
              if (!_.isUndefined(_result.data))
                custom.fields[key] = _result.data
              break
            }
            case 'Set': {
              const _result = this.mapSet(value, fieldDef.type.elementType)
              if (_result.error.length)
                result.error.push(
                    ...processError(_result.error, rowIndex, customType.key)
                  )
              if (_result.data.length)
                custom.fields[key] = _result.data
              break
            }
            case 'String':
            case 'Enum':
            case 'LocalizedEnum':
            case 'LocalizedString':
            case 'Date':
            case 'Time':
            case 'DateTime':
            case 'Reference': {
              if (!_.isUndefined(value))
                custom.fields[key] = value
              break
            }
            default: {
              const unsupportedMsg = `'${
                  fieldDef.type.name
                }' type is not supported! Kindly raise an issue for this`
              result.error.push(
                  `[row ${rowIndex}: ${customType.key}] - ${unsupportedMsg}`
                )
            }
          }
      })
    })
    return result
  }

  function mapBoolean (value) {
    const result = {}
    if (_.isUndefined(value) || (_.isString(value) && _.isEmpty(value)))
      return result
    const _value = value.trim()
    const errorMsg = `The value '${_value}' is not a valid boolean value`
    try {
      const b = JSON.parse(_value.toLowerCase())
      if (!_.isBoolean(b)) {
        result.error = errorMsg
        return result
      }
      result.data = b
      return result
    } catch (error) {
      result.error = errorMsg
      return result
    }
  }

  function mapMoney (value) {
    const result = {}
    if (!isValidValue(value))
      return result

    const matchedMoney = CONSTANTS.field.money.exec(value)
    if (!matchedMoney) {
      result.error = `Invalid money - Cannot parse money ${value}`
      return result
    }

    result.data = {
      currencyCode: matchedMoney[1].toUpperCase(),
      centAmount: parseInt(matchedMoney[2], 10),
    }
    return result
  }

  function mapSet (value, elementType) {
    const result = {
      error: [],
      data: [],
    }
    const values = value.split(',')
    const _result = _.map(values, (item) => {
      const _item = item.trim()
      switch (elementType.name) {
        case 'Number': {
          return this.mapNumber(_item)
        }
        case 'Boolean': {
          return this.mapBoolean(_item)
        }
        case 'Money': {
          return this.mapMoney(_item)
        }
        case 'String':
        case 'Enum':
        case 'LocalizedEnum':
        case 'Date':
        case 'Time':
        case 'DateTime':
        case 'Reference': {
          return {
            data: _item,
          }
        }
        default: {
          const unsupportedMsg = `'${
              elementType.name
            }' type is not supported! Kindly raise an issue for this`
          return {
            error: unsupportedMsg,
          }
        }
      }
    })

    return _.reduce(_result, (prev, curr) => {
      if (curr.error)
        prev.error.push(curr.error)
      if (!_.isUndefined(curr.data))
        prev.data.push(curr.data)
      return prev
    }, result)
  }

  function mapNumber (rawNo, regEx = CONSTANTS.field.integer) {
    const result = {}
    if (!isValidValue(rawNo))
      return result
    const matchedNumber = regEx.exec(rawNo)
    if (!matchedNumber) {
      result.error = `The number ${rawNo} isn't valid`
      return result
    }
    result.data = parseInt(matchedNumber[0], 10)
    return result
  }
}())
