import { createVnode } from "./vnode"

export function createAppAPI(render) {
    return function createApp(rootComponent) {
        // createApp(App).mount(container)
        // 返回包含Mount方法的对象达到链式调用的效果
        return {
            mount: function (rootContainer) {
                // 根据传入配置生成vnode
                const vnode = createVnode(rootComponent)
                // 根据vnode调用render生成真实元素并挂载到容器中
                render(vnode, rootContainer, null)
            }
        }
    }

}
