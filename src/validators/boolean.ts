import { success, failed } from '@anjianshi/utils'
import { Validator } from './common.js'

export class BooleanValidator extends Validator {
  validate(fieldName: string, value: unknown) {
    const superResult = super.validate(fieldName, value)
    if (!superResult.success) return superResult

    value = superResult.data
    if (value === null || value === undefined) return superResult

    if (typeof value === 'string') {
      const str = value.trim().toLocaleLowerCase()
      if (['1', 'true', 'on', 'yes'].includes(str)) value = true
      else if (['0', 'false', 'off', 'no'].includes(str)) value = false
    } else if (typeof value === 'number') {
      if (value === 1) value = true
      else if (value === 0) value = false
    }
    if (typeof value !== 'boolean') return failed(`${fieldName} must be true or false`)
    return success(value)
  }
}
