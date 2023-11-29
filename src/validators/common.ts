import { success, failed, type MaySuccess } from '@anjianshi/utils'

export interface CommonOptions {
  /**
   * allow `null`
   * @default false
   */
  null: boolean

  /**
   * allow `undefined`
   * @default false
   */
  void: boolean

  /**
   * 默认值，原值为 undefined 时生效（原值为 null 不会生效），指定后 void 选项将失去作用。
   * default value，used when original value is `undefined`(not for null), and make `void` option no effect.
   */
  defaults: unknown
}

export class Validator<Opt = unknown> {
  readonly options: Opt & CommonOptions

  constructor(options: Opt & Partial<CommonOptions>) {
    this.options = {
      null: false,
      void: false,
      defaults: undefined,
      ...options,
    }
  }

  validate(fieldName: string, value: unknown): MaySuccess<unknown> {
    if (typeof value === 'undefined') {
      if (typeof this.options.defaults !== 'undefined') {
        value = this.options.defaults
      } else if (!this.options.void) {
        return failed(`${fieldName} must have a value`)
      }
    }
    if (value === null && !this.options.null) return failed(`${fieldName} cannot be null`)
    return success(value)
  }
}
