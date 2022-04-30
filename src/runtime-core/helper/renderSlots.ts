import { createVnode, Fragement } from "../vnode"
export function renderSlots(slots, name, props) {
    // 获取父组件传入的指定name的slots,第三个参数此时为对象 eg:{header:()=>h('div',{},'header')} 
    const slot = slots[name]
    if (slot) {
        if (typeof slot === 'function') {
            // 作用域插槽，获取子组件传递的props
            return createVnode(Fragement, {}, slot(props))
        }
    }
}