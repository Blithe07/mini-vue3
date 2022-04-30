/**
 * 通过代理使模板中可以使用this去访问setup中的数据 
 */
import { hasOwn } from "../shared/index"

// 代码重构，抽离$data等属性的判断
const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props
}
export const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance
        // 处理setup
        if (hasOwn(setupState, key)) {
            return setupState[key]
        }
        // 处理props
        if (hasOwn(props, key)) {
            return props[key]
        }
        // 处理$data等数据
        const publicGetter = publicPropertiesMap[key]
        if (publicGetter) {
            return publicGetter(instance)
        }
    }
}