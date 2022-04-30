import { createRenderer } from "../runtime-core/renderer"

/**
 * 创建DOM元素
 * @param type 元素类型
 * @returns 
 */
function createElement(type) {
    return document.createElement(type)
}
/**
 * 处理属性高
 * @param el DOM元素
 * @param key 属性名
 * @param oldValue 旧属性值
 * @param newvalue 新属性值
 */
function patchProp(el, key, oldValue, newValue) {
    const isOn = (key: string) => /^on[A-Z]/.test(key)
    if (isOn(key)) {
        // 绑定事件
        // onClick => click
        const event = key.slice(2).toLowerCase()
        el.addEventListener(event, newValue)
    } else {
        if (newValue === null || newValue === undefined) {
            // 移除多余属性
            el.removeAttribute(key)
        } else {
            // 绑定属性
            el.setAttribute(key, newValue)
        }
    }
}
/**
 * 将DOM插入到容器中
 * @param el DOM元素
 * @param container 容器
 * @param anchor 锚点
 */
function insert(el, container,anchor) {
    // container.appendChild(el)
    container.insertBefore(el,anchor)
}
/**
 * 移除DOM
 */
function removeElement(child) {
    const parent = child.parentNode
    if (parent) {
        parent.removeChild(child)
    }
}
/**
 * 设置文本
 */
function setElementText(el, text) {
    el.textContent = text
}
// 得到对象，返回createApp函数
const render = createRenderer({ createElement, patchProp, insert, removeElement, setElementText })

export function createApp(...args) {
    // ...args等同于rootComponent
    return render.createApp(...args)
}

export * from '../runtime-core'