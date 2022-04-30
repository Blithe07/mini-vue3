import { shallowReadonly } from "../reactivity/reactivity"
import { proxyRefs } from "../reactivity/ref"
import { emit } from "./componentEmit"
import { initProps } from "./componentProps"
import { PublicInstanceProxyHandlers } from "./componentPublicInstance"
import { initSlots } from "./componentSlots"

export function createComponentInstance(vnode, parent) {
    const component = {
        // 虚拟节点信息(type,props,children)
        vnode,
        // 虚拟节点类型，属于性能优化，取其引用值，减少 . 的深度访问
        type: vnode.type,
        // setup函数返回数据，当前只考虑对象。
        setupState: {},
        // setup函数第一个参数，componentProps中利于取引用值
        props: {},
        // setup函数第二个参数中的属性
        emit: (instance, event) => { },
        // slots,存放插槽内容
        slots: {},
        // provides,取父级的provides原因在于需要用于比较是否为初始化
        provides: parent ? parent.provides : {},
        // 父组件
        parent,
        // 判断是初始化还是更新
        isMounted: false,
        // 虚拟节点树
        subTree: {},
        // 组件更新函数
        update: null,
        // 新虚拟节点
        next: null
    }
    component.emit = emit.bind(null, component)
    return component
}

export function setupComponent(instance) {
    // 初始化props，使子组件可以在Setup函数中使用props
    initProps(instance, instance.vnode.props)
    // 初始化slots
    initSlots(instance, instance.vnode.children)
    // 处理setup函数，并添加一层代理，使h函数中可以使用this访问setup返回的对象属性
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: any) {
    // 虚拟节点信息
    const Component = instance.vnode.type
    const { setup = {} } = Component
    // 添加代理，通过context将instance传递到componentPublicInstance中
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers)
    if (setup) {
        // 规则：只能在setup中调用getCurrentInstance，所以要在setup函数执行前，填充currentInstance
        setCurrentInstance(instance)
        // 当前只处理返回值为object，返回结果会注入到当前组件上下文中
        const setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit })
        // 规则：只能在setup中调用getCurrentInstance，所以要在setup函数执行后，清空currentInstance
        setCurrentInstance(null)
        handleSetupResult(instance, setupResult)
        // 如果返回值为function，返回结果则作为render函数
    }
}

function handleSetupResult(instance: any, setupResult: any) {
    if (typeof setupResult === 'object') {
        // 模板使用ref数据，不需通过访问其value属性
        instance.setupState = proxyRefs(setupResult)
    }
    finishComponentSetup(instance)
}

function finishComponentSetup(instance: any) {
    const Component = instance.type
    if (compiler && !Component.render) {
        if (Component.template) {
            Component.render = compiler(Component.template)
        }
    }
    instance.render = Component.render
}
// 全局变量记录当前实例
let currentInstance = null
export function setCurrentInstance(instance) {
    currentInstance = instance
}
export function getCurrentInstance() {
    return currentInstance
}

let compiler;

export function registerRuntimeCompiler(_compiler) {
    compiler = _compiler
}