import { camelize, toHandlerKey } from "../shared/index"
/**
 * 
 * @param instance 当前组件实例
 * @param event 子组件emit调用的事件名称
 * @param args 子组件emit调用传递参数
 */
export function emit(instance, event, ...args) {
    // 获取props上的事件，并执行
    const { props } = instance
    const handler = props[toHandlerKey(camelize(event))]
    handler && handler(...args)
}