import { success, failed } from '@anjianshi/utils'
import isPlainObject from 'lodash/isPlainObject.js'
import { Validator } from './common.js'

/**
 * struct 用于有明确键值对结构的对象；value 用于有任意 key 的对象
 * use `struct` is used for objects with an explicit key-value structure; `value` is used for objects with arbitrary keys.
 */
export type ObjectOptions = { struct: Record<string, Validator> } | { value: Validator }

export class ObjectValidator extends Validator<ObjectOptions> {
  validate(fieldName: string, value: unknown) {
    const superResult = super.validate(fieldName, value)
    if (!superResult.success) return superResult

    value = superResult.data
    if (value === null || value === undefined) return superResult
    const opt = this.options

    if (!isPlainObject(value)) return failed(`${fieldName} should be a plain object`)

    const formatted: Record<string, unknown> = {}
    if ('struct' in opt) {
      for (const [key, itemValidator] of Object.entries(opt.struct)) {
        const itemResult = itemValidator.validate(
          `${fieldName}["${key}"]`,
          (value as Record<string, unknown>)[key],
        )
        if (itemResult.success) formatted[key] = itemResult.data
        else return itemResult
      }
    } else {
      for (const [key, itemValue] of Object.entries(value as Record<string, unknown>)) {
        const itemResult = opt.value.validate(`${fieldName}["${key}"]`, itemValue)
        if (itemResult.success) formatted[key] = itemResult.data
        else return itemResult
      }
    }
    return success(formatted)
  }
}
