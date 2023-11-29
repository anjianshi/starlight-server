import { success, failed } from '@anjianshi/utils'
import { Validator, type CommonOptions } from './common.js'

export interface StringOptions {
  min?: number
  max?: number
  pattern?: RegExp
  trim: boolean
}

export class StringValidator extends Validator<StringOptions> {
  constructor(options?: Partial<StringOptions> & Partial<CommonOptions>) {
    super({
      trim: true,
      ...(options ?? {}),
    })
  }

  validate(fieldName: string, value: unknown) {
    const superResult = super.validate(fieldName, value)
    if (!superResult.success) return superResult

    value = superResult.data
    if (value === null || value === undefined) return superResult
    const opt = this.options

    if (typeof value !== 'string') return failed(`${fieldName} should be a string`)

    const formatted = opt.trim ? value.trim() : value
    if (typeof opt.min === 'number' && formatted.length < opt.min)
      return failed(`${fieldName}'s length must >= ${opt.min}`)
    if (typeof opt.max === 'number' && formatted.length > opt.max)
      return failed(`${fieldName}'s length must <= ${opt.max}`)
    if (opt.pattern && !opt.pattern.exec(formatted))
      return failed(`${fieldName} does not match the pattern.`)
    return success(formatted)
  }
}
