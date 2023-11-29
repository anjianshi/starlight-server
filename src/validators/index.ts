/**
 * 实现数据验证、格式化
 * Implement data validation and formatting
 */
import { ArrayValidator } from './array.js'
import { BooleanValidator } from './boolean.js'
import { Validator, type CommonOptions } from './common.js'
import { NumberValidator } from './number.js'
import { ObjectValidator } from './object.js'
import { StringValidator } from './string.js'

/**
 * 仅检查空值，不检查具体格式
 * Check only for empty values, not for specific formatting
 */
export function any(options?: Partial<CommonOptions>) {
  return new Validator(options ?? {})
}

export function string(...args: ConstructorParameters<typeof StringValidator>) {
  return new StringValidator(...args)
}

export function number(...args: ConstructorParameters<typeof NumberValidator>) {
  return new NumberValidator(...args)
}

export function boolean(options?: Partial<CommonOptions>) {
  return new BooleanValidator(options ?? {})
}

export function array(
  itemValidator: Validator,
  options?: Omit<ConstructorParameters<typeof ArrayValidator>[0], 'item'>,
) {
  return new ArrayValidator({
    item: itemValidator,
    ...(options ?? {}),
  })
}

export function object(
  structOrValue: Record<string, Validator> | Validator,
  options?: Partial<CommonOptions>,
) {
  return new ObjectValidator({
    ...(structOrValue instanceof Validator ? { value: structOrValue } : { struct: structOrValue }),
    ...options,
  })
}
