import { extend, isObject } from "../shared"
import { track, trigger } from "./effect"
import { reactive, ReactivityFlag, readonly } from "./reactivity"
// 性能优化，减少每次创建Handler都需要函数调用
const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        // 根据key判断isReactive和isReadonly
        if (key === ReactivityFlag.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactivityFlag.IS_READONLY) {
            return isReadonly
        }
        // 代理对象
        const res = Reflect.get(target, key)
        // 判断是否为shallowReadonly
        if (shallow) {
            return res
        }
        // 判断是否为嵌套对象
        if (isObject(res)) {
            // 递归
            return isReadonly ? readonly(res) : reactive(res)
        }
        if (!isReadonly) {
            // 依赖收集
            track(target, key)
        }
        // 返回代理对象
        return res
    }
}

function createSetter() {
    return function set(target, key, value) {
        // 代理对象
        const res = Reflect.set(target, key, value)
        // 触发依赖
        trigger(target, key)
        // 返回代理对象
        return res

    }
}

export const ReactiveHandler = {
    get,
    set
}

export const ReadonlyHandler = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`key:${key} can not be set , because target is readonly`)
        return true
    }
}

export const shallowReadonlyHandler = extend({}, ReadonlyHandler, { get: shallowReadonlyGet })