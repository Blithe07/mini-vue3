import { ShapeFlags } from "../shared/ShapeFlags"

export function initSlots(instance, children) {
    // 当前虚拟节点存在插槽（虚拟节点是组件类型，children是对象则满足条件），才初始化插槽
    if (instance.vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) {
        normalizeObjectSlots(children, instance.slots)
    }
}

/**
 *  往实例上的slots填充内容
 * @param children 插槽类型节点第三个参数，obj
 * @param slots 实例上的slots对象
 */
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        // value为具体的渲染函数
        const value = children[key]
        // 挂载到slots上，使子组件可以调用this.$slots
        // 由于子组件可传参给父组件使用，并且在renderSlots中是函数调用传入props，所以初始化的slots要是一个函数来接受props
        slots[key] = (props) => normalizeSlotValue(value(props))
    }
}

/**
 * 处理slot函数执行后的结果，统一转为数组处理
 * @param value 
 * @returns 
 */
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value]
}