import { hasChanged, isObject } from "../shared"
import { isTracking, trackEffects, triggerEffects } from "./effect"
import { reactive } from "./reactivity"

class RefImpl {
    private _value: any
    dep = new Set()
    private _rawValue: any
    private __v_isRef = true
    constructor(value) {
        // 保留原始数据
        this._rawValue = value
        // 转换数据
        this._value = convert(value)
    }
    get value() {
        // 根据条件判断是否进行依赖收集
        trackRefValue(this)
        // 结果返回
        return this._value
    }
    set value(newVal) {
        if (hasChanged(this._rawValue, newVal)) {
            // 改变值
            this._rawValue = newVal
            this._value = convert(newVal)
            // 改变以后才能触发依赖
            triggerEffects(this.dep)
        }
    }
}
function convert(value) {
    // 如果传入的是对象，使用reactive包裹
    return isObject(value) ? reactive(value) : value
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep)
    }
}
export const ref = (value) => {
    return new RefImpl(value)
}
export const isRef = (value) => {
    return !!value['__v_isRef']
}
export const unRef = (ref) => {
    return isRef(ref) ? ref.value : ref
}
export const proxyRefs = (objWithRefs) => {
    return new Proxy(objWithRefs, {
        get(target, key) {
            // 如果是ref就获取ref.value，否则直接取value值
            return unRef(Reflect.get(target, key))
        },
        set(target, key, value) {
            // 如果set的值应是ref类型，传进来的是普通类型的话，就将其value值赋值为传进来的值
            if (isRef(target[key]) && !isRef(value)) {
                return target[key].value = value
            } else {
                return Reflect.set(target, key, value)
            }
        }
    })
}