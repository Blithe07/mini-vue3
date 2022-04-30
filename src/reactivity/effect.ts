import { extend } from "../shared";
// 记录当前effect
let activeEffect;
// 记录是否应该收集依赖(默认收集)
let shouldTrack = true
export class ReactiveEffect {
    private _fn: Function
    active = true;
    deps: Set<any>[] = []
    onStop?: Function
    // 添加public属性相当于在构造函数中书写this.属性 = 属性（此处在computed实现中需要用到scheduler）
    constructor(fn: Function, public scheduler?: Function) {
        this._fn = fn
    }
    run() {
        // 如果调用过了stop，此时active为false
        if (!this.active) {
            // 返回effect中的函数的执行结果
            return this._fn()
        }
        // 打开收集依赖权限
        shouldTrack = true
        // 保存当前effect实例，用于触发依赖
        activeEffect = this
        // 执行effect中的函数，内部如果使用了响应式数据就会触发依赖收集
        const result = this._fn()
        // 关闭收集依赖权限
        shouldTrack = false
        return result
    }
    stop() {
        if (this.active) {
            // 如果存在onStop函数则执行
            if (this.onStop) {
                this.onStop()
            }
            // 清空收集的依赖
            cleanUpEffect(this)
            // 防止多次调用stop函数
            this.active = false
        }
    }
}
function cleanUpEffect(effect: ReactiveEffect) {
    for (const dep of effect.deps) {
        dep.delete(effect)
    }
}
export const stop = (runner: { effect: ReactiveEffect }) => {
    // 通过传入的runner函数停止对应的依赖触发（思路：从dep中删除掉对应的effect，需要双向收集依赖）
    runner.effect.stop()
}
export const effect = (fn: Function, options?: { scheduler?: Function, onStop?: Function }) => {
    // 创建effect实例
    const _effect = new ReactiveEffect(fn, options?.scheduler)
    // 合并选项
    extend(_effect, options)
    // 调用fn
    _effect.run()
    // 通过bind函数保证runner直接执行的时候this指向正确
    const runner: any = _effect.run.bind(_effect)
    // 往runner函数上挂在effect实例，使stop函数中可以执行effect实例中的stop方法
    runner.effect = _effect
    // 返回runner函数，函数中返回fn中的返回结果
    return runner
};
// 记录依赖关系
const targetMap = new Map()
export const track = (target, key) => {
    // 判断是否需要进行依赖收集
    if (!isTracking()) return
    // target -> key -> dep(存放effect)
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        depsMap = new Map()
        targetMap.set(target, depsMap)
    }
    let dep = depsMap.get(key)
    if (!dep) {
        dep = new Set()
        depsMap.set(key, dep)
    }
    // 已存在相同的effect不再添加
    if (dep.has(activeEffect)) return
    trackEffects(dep)
};
export const isTracking = () => {
    return shouldTrack && activeEffect !== undefined
}
export const trackEffects = (dep) => {
    // 往dep中添加当前effect实例，用于后续set时候调用
    dep.add(activeEffect)
    // 往effect中添加dep，用于后续stop函数调用
    activeEffect.deps.push(dep)
}
export const trigger = (target, key) => {
    const depsMap = targetMap.get(target)
    const dep = depsMap.get(key)
    triggerEffects(dep)
};
export const triggerEffects = (dep) => {
    // 执行dep中收集的effect内部的函数
    for (const effect of dep) {
        // 如果存在scheduler执行scheduler，反之执行effect中的函数
        if (effect.scheduler) {
            effect.scheduler()
        } else {
            effect.run()
        }
    }
}
