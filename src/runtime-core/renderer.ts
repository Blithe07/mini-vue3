import { effect } from "../reactivity/effect"
import { EMPTY_OBJ } from "../shared"
import { ShapeFlags } from "../shared/ShapeFlags"
import { createComponentInstance, setupComponent } from "./component"
import { shouldUpdateComponent } from "./componentRenderUtils"
import { createAppAPI } from "./createApp"
import { queueJobs } from "./scheduler"
import { Fragement, Text } from "./vnode"


export function createRenderer(options): { createApp: (...args) => any } {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, removeElement: hostRemoveElement, setElementText: hostSetElementText } = options

    function render(n2, container, parentComponent) {
        // 通过patch区分vnode类型，进行对应的处理
        // processComponent/processElement等
        patch(null, n2, container, parentComponent, null)
    }
    /**
     * 
     * @param n1 老节点树
     * @param n2 新节点数
     * @param container 容器
     * @param parentComponent 父组件
     */
    function patch(n1, n2, container, parentComponent, anchor) {
        // 根据vnode.type区分类型,重构后根据shapeFlag区分，采用位运算记录当前vnode类型
        // 通过type特殊处理Fragement和Text类型
        const { shapeFlag, type } = n2
        switch (type) {
            case Fragement:
                // 处理空节点（插槽）
                processFragement(n2, container, parentComponent, anchor)
                break;
            case Text:
                // 处理文本节点(插槽)
                processText(n2, container)
                break;
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    // 处理元素
                    processElement(n1, n2, container, parentComponent, anchor)
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    // 处理组件
                    processComponent(n1, n2, container, parentComponent, anchor)
                }
                break
        }
    }

    function processText(n2, container) {
        // 只渲染children,并将真实元素挂载到el上
        const textNode = n2.el = document.createTextNode(n2.children)
        // 添加到容器
        container.append(textNode)
    }

    function processFragement(n2, container, parentComponent, anchor) {
        // 只渲染children
        mountChildren(n2.children, container, parentComponent, anchor)
    }

    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach(v => {
            patch(null, v, container, parentComponent, anchor)
        })
    }

    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // 初始化
            mountElement(n2, container, parentComponent, anchor)
        } else {
            // 更新
            patchElement(n1, n2, container, parentComponent, anchor)
        }
    }

    function patchElement(n1, n2, container, parentComponent, anchor) {
        const oldProps = n1.props || EMPTY_OBJ
        const newProps = n2.props || EMPTY_OBJ
        const el = n2.el = n1.el
        if (oldProps !== newProps) {
            patchProps(el, oldProps, newProps)
        }
        patchChildren(n1, n2, el, parentComponent, anchor)
    }

    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const { shapeFlag: prevShapeFlag, children: c1 } = n1
        const { shapeFlag, children: c2 } = n2
        // 新的是文本
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 旧的是数组
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                unMountChildren(c1)
            }
            // 设置文本
            if (c1 !== c2) {
                hostSetElementText(container, c2)
            }
        } else {
            // 新的是数组
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                // 旧的是文本
                hostSetElementText(container, '')
                mountChildren(c2, container, parentComponent, anchor)
            } else {
                // 旧的是数组
                patchKeyedChildren(c1, c2, container, parentComponent, anchor)
            }
        }
    }

    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        // 旧索引
        let e1 = c1.length - 1
        // 新索引
        let e2 = c2.length - 1
        // 头指针
        let i = 0
        // 判断是否为同一个类型节点
        function isSomeVnodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key
        }
        // 左侧开始移动头指针
        while (i <= e1 && i <= e2) {
            // 旧节点
            const n1 = c1[i]
            // 新节点
            const n2 = c2[i]
            // 比较是否为同一个节点
            if (isSomeVnodeType(n1, n2)) {
                // 是同类型节点，递归查看子节点
                patch(n1, n2, container, parentComponent, parentAnchor)
            } else {
                break
            }
            // 移动指针
            i++
        }
        // 右侧移动
        while (i <= e1 && i <= e2) {
            // 旧节点
            const n1 = c1[e1]
            // 新节点
            const n2 = c2[e2]
            // 比较是否为同一个节点
            if (isSomeVnodeType(n1, n2)) {
                // 是同类型节点，递归查看子节点
                patch(n1, n2, container, parentComponent, parentAnchor)
            } else {
                break
            }
            // 移动指针
            e1--;
            e2--;
        }
        // 新的比老的长
        if (i > e1) {
            if (i <= e2) {
                const nextPos = e2 + 1
                // 判断新增位置，大于新节点长度则是插在后面，小于新节点长度则是插在签名
                const anchor = nextPos < c2.length ? c2[nextPos].el : null
                // 处理增加多个节点
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor)
                    // hostInsert(c2[i].el, container, anchor)
                    i++
                }
            }
        } else if (i > e2) {
            // 老的比新的长
            while (i <= e1) {
                hostRemoveElement(c1[i].el)
                i++
            }
        } else {
            // 中间对比
            // 1.老的存在，新的不存在
            // 2.新的存在，老的不存在
            // 3.新老都存在，移动位置
            // 老节点开始对比索引
            let s1 = i
            // 新节点开始对比索引
            let s2 = i
            // 建立Map映射，加快查询效率（对应key在新节点中的索引）
            const keyToNewIndexMap = new Map()
            for (let i = s2; i <= e2; i++) {
                keyToNewIndexMap.set(c2[i].key, i)
            }
            // 记录新节点需要比较数量
            const toBePatched = e2 - s2 + 1
            // 当前比较次数
            let patched = 0
            // 建立定长数组，记录老节点在新节点中的索引
            const newIndexToOldIndexMap = new Array(toBePatched)
            // 初始化，0代表老节点不存在新节点中
            for (let i = 0; i < toBePatched; i++)newIndexToOldIndexMap[i] = 0
            // 是否需要移动（性能优化，为true才进行最长递增子序列的生成）
            // 判断条件：老节点映射到新节点中的索引递增则不需要移动
            let moved = false
            // 老节点映射到新节点中的索引
            let maxNewIndexSoFar = 0
            // 遍历老节点，处理不同情况
            for (let i = s1; i <= e1; i++) {
                const prevChildren = c1[i]
                // 达到最大比较次数，后续直接删除老节点
                if (patched >= toBePatched) {
                    hostRemoveElement(prevChildren.el)
                    continue
                }
                let newIndex
                if (prevChildren.key !== null) {
                    // 判断是否存在Map中
                    newIndex = keyToNewIndexMap.get(prevChildren.key)
                } else {
                    // 没有key值，直接遍历新节点
                    for (let j = s2; j <= e2; j++) {
                        const newChildren = c2[j]
                        if (isSomeVnodeType(newChildren, prevChildren)) {
                            newIndex = j
                            break
                        }
                    }
                }
                if (newIndex === undefined) {
                    // 不存在新节点中，直接删除
                    hostRemoveElement(prevChildren.el)
                } else {
                    // 判断是否需要移动
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex
                    } else {
                        moved = true
                    }
                    // 记录老节点在新节点中的索引
                    // newIndex-s2：减去前面不变的
                    // i+1:因为当i为0时，代表不存在，其实是存在的，所以加1避免该情况;并且对应的算法要求值不能为0
                    newIndexToOldIndexMap[newIndex - s2] = i + 1
                    // 存在新结点中，patch替换
                    patch(prevChildren, c2[newIndex], container, parentComponent, null)
                    patched++
                }
            }
            // 生成最长递增子序列
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []
            // 定义一个指针，倒序才能保证节点的准确位置插入
            let j = increasingNewIndexSequence.length - 1
            // 遍历新节点，找出需要更换位置的节点
            for (let i = toBePatched - 1; i >= 0; i--) {
                // 要移动节点索引
                const nextIndex = i + s2
                // 要移动节点
                const nextChild = c2[nextIndex]
                // 锚点
                const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null
                if (newIndexToOldIndexMap[i] === 0) {
                    // 该索引在老节点中不存在，直接创建新节点
                    patch(null, nextChild, container, parentComponent, anchor)
                } else if (moved) {
                    // 不存在最长递增子序列中直接新增，或者索引不一致
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        // 移动节点
                        hostInsert(nextChild.el, container, anchor)
                    } else {
                        j--
                    }
                }
            }
        }
    }

    function unMountChildren(children) {
        for (const child of children) {
            hostRemoveElement(child)
        }
    }

    function patchProps(el, oldProps, newProps) {
        // newProps比oldProps一致或者多
        for (const key in newProps) {
            const newVal = newProps[key]
            const oldVal = oldProps[key]
            if (newVal !== oldVal) {
                hostPatchProp(el, key, oldVal, newVal)
            }
        }
        // oldProps比newProps多，删除多余属性
        if (oldProps !== EMPTY_OBJ) {
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    hostPatchProp(el, key, oldProps[key], null)
                }
            }
        }
    }

    function mountElement(n2, container, parentComponent, anchor) {
        // 创建真实dom元素
        // 保存el到虚拟dom中，后须用于实现代理
        const el = n2.el = hostCreateElement(n2.type)
        const { children, props, shapeFlag } = n2
        // 判断h函数第三个参数,重构后根据shapeFlag区分，采用位运算记录当前vnode类型，处理children
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = n2.children
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            children.forEach(v => {
                patch(null, v, el, parentComponent, anchor)
            })
        }
        // 判断h函数第二个参数，处理props

        for (const key in props) {
            const value = props[key]
            hostPatchProp(el, key, null, value)
        }
        // 添加到容器中
        hostInsert(el, container, anchor)
    }

    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // 处理组件，并添加到容器中
            mountComponent(n2, container, parentComponent, anchor)
        } else {
            // 更新组件
            patchComponent(n1, n2)
        }
    }

    function patchComponent(n1, n2) {
        console.log('update-component');
        // 取出旧虚拟节点中的实例，并赋值给新虚拟节点
        const instance = n2.component = n1.component
        // 判断是否需要更新（避免不相关数据修改导致函数执行）
        if (shouldUpdateComponent(n1, n2)) {
            // 往实例上挂载新的虚拟节点，用于组件更新
            instance.next = n2
            // 调用更新函数
            instance.update()
        } else {
            // 挂载el属性到新节点
            n2.el = n1.el
            // 挂载新节点
            instance.vnode = n2
        }
    }

    function mountComponent(initialVnode, container, parentComponent, anchor) {
        // 创建实例
        // 将实例挂载到虚拟节点上，用于组件更新
        const instance = initialVnode.component = createComponentInstance(initialVnode, parentComponent)
        // 处理props、slot、setup
        setupComponent(instance)
        // 调用render函数，并完成挂载
        setupRenderEffect(instance, initialVnode, container, anchor)
    }

    function setupRenderEffect(instance, initialVnode, container, anchor) {
        // 往实例上保存effect函数，用于更新组件
        // 通过effect函数包裹渲染视图逻辑，当响应式数据变化后，重新执行effect中的函数
        const { proxy } = instance
        instance.update = effect(() => {
            // 根据isMounted判断是初始化还是更新
            if (!instance.isMounted) {
                // 在setupComponent中已经往实例上挂载了render函数，得到子树
                // call方法改变this指向，在render函数中就可以使用this去访问Setup中的属性
                // 存储当前虚拟节点树，用于更新判断
                const subTree = (instance.subTree = instance.render.call(proxy, proxy))
                // 子树递归调用patch
                patch(null, subTree, container, instance, anchor)
                // 初始化时vnode为根组件，subTree是根节点，且已经mount完毕。
                initialVnode.el = subTree.el
                // 改变isMounted状态
                instance.isMounted = true
            } else {
                // 更新组件Props，前置准备：新,老节点
                const { next, vnode } = instance
                if (next) {
                    // 挂载el属性到新节点
                    next.el = vnode.el
                    // 挂载新节点
                    instance.vnode = next
                    // 更新组件属性
                    updateComponentPreRender(instance, next)
                }
                const { proxy } = instance
                // 当前虚拟节点树
                const subTree = instance.render.call(proxy, proxy)
                // 上一个虚拟节点树
                const preSubTree = instance.subTree
                // 赋值，后续更新使用
                instance.subTree = subTree
                // 更新逻辑
                patch(preSubTree, subTree, container, instance, anchor)
            }
        }, {
            scheduler() {
                queueJobs(instance.update)
            }
        })
    }

    return {
        createApp: createAppAPI(render)
    }
}

function updateComponentPreRender(instance, nextVnode) {
    // 清空实例上新节点属性
    instance.next = null
    // 更新组件属性
    instance.props = nextVnode.props
}


function getSequence(arr) {
    // arr:[2, 1, 5, 3, 4, 7, 8, 6, 9]
    // p: [2, 1, 1, 1, 3, 4, 5, 4, 6]
    // result(prev):[1, 3, 4, 7, 6, 8]
    // result(end):[1, 3, 4, 5, 6, 8]
    // copy原数组，最终会得到一个索引数组，记录相关递增信息
    const p = arr.slice()
    // 返回的索引数组，索引数组中的索引映射到arr的值是递增的（最有潜力达到最长递增序列的索引数组）
    const result = [0]
    // i=>当前遍历索引
    // j=>索引数组尾节点
    // u=>头指针（针对result(prev)数组）
    // v=>尾指针（针对result(prev)数组）
    // c=>中间指针（针对resul(prev)t数组）
    let i, j, u, v, c
    // 数组长度
    const len = arr.length
    for (i = 0; i < len; i++) {
        const arrI = arr[i]
        if (arrI !== 0) {
            j = result[result.length - 1]
            // 当前数据和arr[索引数组中最后一位]比较
            // 当前数据更大的话，p数组对应的值赋为索引数组中最后一位，并且往result数组中添加当前索引
            if (arr[j] < arrI) {
                p[i] = j
                result.push(i)
                continue
            }
            // 当前数据更小的话，递归调用二分查找法
            u = 0
            v = result.length - 1
            while (u < v) {
                c = (u + v) >> 1
                if (arr[result[c]] < arrI) {
                    // arr[result数组中间的值（向下取整）]小于当前值
                    // 头指针移动
                    u = c + 1
                } else {
                    // arr[result数组中间的值（向下取整）]大于当前值
                    // 尾指针移动
                    v = c
                }
            }
            // arr[最新的头指针]和当前数据比较
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    // p[当前索引] = result[最新头指针的前一个]，因此u必须大于0
                    p[i] = result[u - 1]
                }
                // 替换,得到最有潜力数组
                // arr = [2,3,4,1]
                // [0,1,2] => [3,1,2]
                result[u] = i
            }
        }
    }
    // 最有潜力数组长度
    u = result.length
    // 最有潜力数组最大值（索引）
    v = result[u - 1]
    while (u-- > 0) {
        // 倒序赋值
        result[u] = v
        // v赋值为p[v]，使result得到的一定是递减的索引数组
        v = p[v]
    }
    return result
}