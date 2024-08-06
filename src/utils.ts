/**
 * 把 @anjianshi/utils 包中 App 用得到的内导出来，这样用到时就不用分别引用 starlight-server 和 @anjianshi/utils 了
 */
export { getValidator, type Definition as ValidatorDefinition } from '@anjianshi/utils/validators/index.js'
export * from '@anjianshi/utils/lang/may-success.js'
