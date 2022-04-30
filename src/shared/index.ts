export const extend = Object.assign
export const isObject = (obj) => {
    return obj !== null && typeof obj === 'object'
}
export const isString = (val) => typeof val === 'string'
export const hasChanged = (val, newVal) => {
    return !Object.is(val, newVal)
}
export const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)

export const camelize = (str: string) => {
    return str.replace(/-(\w)/g, (_, c: string) => {
        return c ? c.toUpperCase() : ''
    })
}

const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}
export const toHandlerKey = (str: string) => {
    return 'on' + capitalize(str)
}

export const EMPTY_OBJ = {}

export * from './toDisplayString'