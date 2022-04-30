import { getCurrentInstance } from "./component";

export function provide(key, value) {
    // 获取实例对象
    const instance: any = getCurrentInstance()
    if (instance) {
        let { provides } = instance
        const parentProvides = instance.parent.provides
        // 如果当前组件的provides和父组件的一致说明是初始化
        if (provides === parentProvides) {
            // 改变原型链来解决provides不同层级provide同一个key，导致父级以上传递数据改变
            // 通过解构声明的变量和原对象中对应的属性初始化的时候才相同，因此需要将instance.provides的值重新赋给解构后的值
            provides = instance.provides = Object.create(parentProvides)
        }
        // 注入数据
        provides[key] = value
    }

}
export function inject(key, defaultVal) {
    // 获取实例对象
    const instance: any = getCurrentInstance()
    if (instance) {
        // 从父级中的provides中取值/*  */
        const { provides } = instance.parent
        if (key in provides) {
            return provides[key]
        } else {
            // 可传默认值
            if (typeof defaultVal === 'function') {
                return defaultVal()
            } else {
                return defaultVal
            }
        }
    }
}