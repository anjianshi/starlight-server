import { success, failed } from '@anjianshi/utils'
import { Validator, type CommonOptions } from './common.js'

export interface NumberOptions {
  min?: number
  max?: number
  float: boolean // allow float or not
}

export class NumberValidator extends Validator<NumberOptions> {
  constructor(options?: Partial<NumberOptions> & Partial<CommonOptions>) {
    super({
      float: false,
      ...(options ?? {}),
    })
  }

  validate(fieldName: string, value: unknown) {
    const superResult = super.validate(fieldName, value)
    if (!superResult.success) return superResult

    value = superResult.data
    if (value === null || value === undefined) return superResult
    const opt = this.options

    if (typeof value === 'string') value = parseFloat(value)
    if (typeof value !== 'number' || !isFinite(value))
      return failed(`${fieldName} must be a valid number`)
    if (!opt.float && value % 1 !== 0) return failed(`${fieldName} must be a integer`)
    if (typeof opt.min === 'number' && value < opt.min)
      return failed(`${fieldName} must >= ${opt.min}`)
    if (typeof opt.max === 'number' && value > opt.max)
      return failed(`${fieldName} must <= ${opt.max}`)
    return success(value)
  }
}
