import { createVnode } from "./vnode";

export function h(type, props?, children?) {
    const vnode = createVnode(type, props, children)
    return vnode
}