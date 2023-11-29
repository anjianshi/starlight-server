import { success, failed } from '@anjianshi/utils'
import { Validator } from './common.js'

export interface ArrayOptions {
  item: Validator
  min?: number
  max?: number
}

export class ArrayValidator extends Validator<ArrayOptions> {
  validate(fieldName: string, value: unknown) {
    const superResult = super.validate(fieldName, value)
    if (!superResult.success) return superResult

    value = superResult.data
    if (value === null || value === undefined) return superResult
    const opt = this.options

    if (!Array.isArray(value)) return failed(`${fieldName} should be an array`)
    if (typeof opt.min === 'number' && value.length < opt.min)
      return failed(`array ${fieldName}'s length should >= ${opt.min}`)
    if (typeof opt.max === 'number' && value.length > opt.max)
      return failed(`array ${fieldName}'s length should <= ${opt.max}`)

    const formatted = []
    for (let i = 0; i < value.length; i++) {
      const itemResult = opt.item.validate(`${fieldName}[${i}]`, value[i])
      if (itemResult.success) formatted.push(itemResult.data)
      else return itemResult
    }
    return success(formatted)
  }
}
