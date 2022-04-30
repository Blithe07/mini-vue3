import { ShapeFlags } from "../shared/ShapeFlags"
export const Fragement = Symbol('Fragment')
export const Text = Symbol('Text')
export {
    createVnode as createElementVnode
}
export function createVnode(type, props?, children?) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapeFlag(type),
        el: null,
        key: props && props.key,
        component: null
    }
    if (typeof children === 'string') {
        vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
    } else if (Array.isArray(children)) {
        vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    }
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        if (typeof children === 'object') {
            vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN
        }
    }
    return vnode
}
export function createTextVnode(text: string) {
    return createVnode(Text, {}, text)
}

function getShapeFlag(type) {
    // 判断虚拟节点类型
    return typeof type === 'string' ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT
}