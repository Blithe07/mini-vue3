import { ReactiveEffect } from "./effect"

class ComputedRefImpl {
    private _effect: ReactiveEffect
    private _dirty = true
    private _value: any
    constructor(getter) {
        // 通过创建effect实例，传入scheduler，达到缓存的效果。
        this._effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true
            }
        })
    }
    get value() {
        // 第一次访问计算属性执行依赖触发
        if (this._dirty) {
            // 将状态设为false,仅当依赖数据改变后才会调用传入的scheduler函数
            this._dirty = false
            // 获取最新值
            this._value = this._effect.run()
        }
        // 返回最新值
        return this._value
    }
}
export const computed = (getter) => {
    return new ComputedRefImpl(getter)
}