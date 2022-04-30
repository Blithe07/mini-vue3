import { ReactiveHandler, ReadonlyHandler, shallowReadonlyHandler } from "./baseHandlers";
export const reactive = (obj) => {
    return createActiveObject(obj, ReactiveHandler)
};
export const readonly = (obj) => {
    return createActiveObject(obj, ReadonlyHandler)
}
export const shallowReadonly = (obj) => {
    return createActiveObject(obj, shallowReadonlyHandler)
}

const createActiveObject = (obj, baseHandler) => {
    return new Proxy(obj, baseHandler)
}
export const enum ReactivityFlag {
    IS_REACTIVE = '__v_isReactive',
    IS_READONLY = '__v_isReadonly'
}
export const isReactive = (obj) => {
    // 通过判断该对象上是否存在某种特定标记来决定true/false
    return !!obj[ReactivityFlag.IS_REACTIVE]
}
export const isReadonly = (obj) => {
    // 通过判断该对象上是否存在某种特定标记来决定true/false
    return !!obj[ReactivityFlag.IS_READONLY]
}
export const isProxy = (obj) => {
    // 判断是否isReactive或者isReadonly
    return isReadonly(obj) || isReactive(obj)
}