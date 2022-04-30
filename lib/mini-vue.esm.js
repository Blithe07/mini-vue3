function toDisplayString(val) {
    return String(val);
}

const extend = Object.assign;
const isObject = (obj) => {
    return obj !== null && typeof obj === 'object';
};
const isString = (val) => typeof val === 'string';
const hasChanged = (val, newVal) => {
    return !Object.is(val, newVal);
};
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : '';
    });
};
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return 'on' + capitalize(str);
};
const EMPTY_OBJ = {};

// 记录当前effect
let activeEffect;
// 记录是否应该收集依赖(默认收集)
let shouldTrack = true;
class ReactiveEffect {
    // 添加public属性相当于在构造函数中书写this.属性 = 属性（此处在computed实现中需要用到scheduler）
    constructor(fn, scheduler) {
        this.scheduler = scheduler;
        this.active = true;
        this.deps = [];
        this._fn = fn;
    }
    run() {
        // 如果调用过了stop，此时active为false
        if (!this.active) {
            // 返回effect中的函数的执行结果
            return this._fn();
        }
        // 打开收集依赖权限
        shouldTrack = true;
        // 保存当前effect实例，用于触发依赖
        activeEffect = this;
        // 执行effect中的函数，内部如果使用了响应式数据就会触发依赖收集
        const result = this._fn();
        // 关闭收集依赖权限
        shouldTrack = false;
        return result;
    }
    stop() {
        if (this.active) {
            // 如果存在onStop函数则执行
            if (this.onStop) {
                this.onStop();
            }
            // 清空收集的依赖
            cleanUpEffect(this);
            // 防止多次调用stop函数
            this.active = false;
        }
    }
}
function cleanUpEffect(effect) {
    for (const dep of effect.deps) {
        dep.delete(effect);
    }
}
const effect = (fn, options) => {
    // 创建effect实例
    const _effect = new ReactiveEffect(fn, options === null || options === void 0 ? void 0 : options.scheduler);
    // 合并选项
    extend(_effect, options);
    // 调用fn
    _effect.run();
    // 通过bind函数保证runner直接执行的时候this指向正确
    const runner = _effect.run.bind(_effect);
    // 往runner函数上挂在effect实例，使stop函数中可以执行effect实例中的stop方法
    runner.effect = _effect;
    // 返回runner函数，函数中返回fn中的返回结果
    return runner;
};
// 记录依赖关系
const targetMap = new Map();
const track = (target, key) => {
    // 判断是否需要进行依赖收集
    if (!isTracking())
        return;
    // target -> key -> dep(存放effect)
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    // 已存在相同的effect不再添加
    if (dep.has(activeEffect))
        return;
    trackEffects(dep);
};
const isTracking = () => {
    return shouldTrack && activeEffect !== undefined;
};
const trackEffects = (dep) => {
    // 往dep中添加当前effect实例，用于后续set时候调用
    dep.add(activeEffect);
    // 往effect中添加dep，用于后续stop函数调用
    activeEffect.deps.push(dep);
};
const trigger = (target, key) => {
    const depsMap = targetMap.get(target);
    const dep = depsMap.get(key);
    triggerEffects(dep);
};
const triggerEffects = (dep) => {
    // 执行dep中收集的effect内部的函数
    for (const effect of dep) {
        // 如果存在scheduler执行scheduler，反之执行effect中的函数
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
};

// 性能优化，减少每次创建Handler都需要函数调用
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        // 根据key判断isReactive和isReadonly
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        // 代理对象
        const res = Reflect.get(target, key);
        // 判断是否为shallowReadonly
        if (shallow) {
            return res;
        }
        // 判断是否为嵌套对象
        if (isObject(res)) {
            // 递归
            return isReadonly ? readonly(res) : reactive(res);
        }
        if (!isReadonly) {
            // 依赖收集
            track(target, key);
        }
        // 返回代理对象
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        // 代理对象
        const res = Reflect.set(target, key, value);
        // 触发依赖
        trigger(target, key);
        // 返回代理对象
        return res;
    };
}
const ReactiveHandler = {
    get,
    set
};
const ReadonlyHandler = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`key:${key} can not be set , because target is readonly`);
        return true;
    }
};
const shallowReadonlyHandler = extend({}, ReadonlyHandler, { get: shallowReadonlyGet });

const reactive = (obj) => {
    return createActiveObject(obj, ReactiveHandler);
};
const readonly = (obj) => {
    return createActiveObject(obj, ReadonlyHandler);
};
const shallowReadonly = (obj) => {
    return createActiveObject(obj, shallowReadonlyHandler);
};
const createActiveObject = (obj, baseHandler) => {
    return new Proxy(obj, baseHandler);
};

class RefImpl {
    constructor(value) {
        this.dep = new Set();
        this.__v_isRef = true;
        // 保留原始数据
        this._rawValue = value;
        // 转换数据
        this._value = convert(value);
    }
    get value() {
        // 根据条件判断是否进行依赖收集
        trackRefValue(this);
        // 结果返回
        return this._value;
    }
    set value(newVal) {
        if (hasChanged(this._rawValue, newVal)) {
            // 改变值
            this._rawValue = newVal;
            this._value = convert(newVal);
            // 改变以后才能触发依赖
            triggerEffects(this.dep);
        }
    }
}
function convert(value) {
    // 如果传入的是对象，使用reactive包裹
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
const ref = (value) => {
    return new RefImpl(value);
};
const isRef = (value) => {
    return !!value['__v_isRef'];
};
const unRef = (ref) => {
    return isRef(ref) ? ref.value : ref;
};
const proxyRefs = (objWithRefs) => {
    return new Proxy(objWithRefs, {
        get(target, key) {
            // 如果是ref就获取ref.value，否则直接取value值
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            // 如果set的值应是ref类型，传进来的是普通类型的话，就将其value值赋值为传进来的值
            if (isRef(target[key]) && !isRef(value)) {
                return target[key].value = value;
            }
            else {
                return Reflect.set(target, key, value);
            }
        }
    });
};

/**
 *
 * @param instance 当前组件实例
 * @param event 子组件emit调用的事件名称
 * @param args 子组件emit调用传递参数
 */
function emit(instance, event, ...args) {
    // 获取props上的事件，并执行
    const { props } = instance;
    const handler = props[toHandlerKey(camelize(event))];
    handler && handler(...args);
}

function initProps(instance, props) {
    instance.props = props || {};
}

/**
 * 通过代理使模板中可以使用this去访问setup中的数据
 */
// 代码重构，抽离$data等属性的判断
const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        // 处理setup
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        // 处理props
        if (hasOwn(props, key)) {
            return props[key];
        }
        // 处理$data等数据
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    }
};

function initSlots(instance, children) {
    // 当前虚拟节点存在插槽（虚拟节点是组件类型，children是对象则满足条件），才初始化插槽
    if (instance.vnode.shapeFlag & 16 /* SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
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
        const value = children[key];
        // 挂载到slots上，使子组件可以调用this.$slots
        // 由于子组件可传参给父组件使用，并且在renderSlots中是函数调用传入props，所以初始化的slots要是一个函数来接受props
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
/**
 * 处理slot函数执行后的结果，统一转为数组处理
 * @param value
 * @returns
 */
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode, parent) {
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
    };
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    // 初始化props，使子组件可以在Setup函数中使用props
    initProps(instance, instance.vnode.props);
    // 初始化slots
    initSlots(instance, instance.vnode.children);
    // 处理setup函数，并添加一层代理，使h函数中可以使用this访问setup返回的对象属性
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    // 虚拟节点信息
    const Component = instance.vnode.type;
    const { setup = {} } = Component;
    // 添加代理，通过context将instance传递到componentPublicInstance中
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    if (setup) {
        // 规则：只能在setup中调用getCurrentInstance，所以要在setup函数执行前，填充currentInstance
        setCurrentInstance(instance);
        // 当前只处理返回值为object，返回结果会注入到当前组件上下文中
        const setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit });
        // 规则：只能在setup中调用getCurrentInstance，所以要在setup函数执行后，清空currentInstance
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
        // 如果返回值为function，返回结果则作为render函数
    }
}
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === 'object') {
        // 模板使用ref数据，不需通过访问其value属性
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (compiler && !Component.render) {
        if (Component.template) {
            Component.render = compiler(Component.template);
        }
    }
    instance.render = Component.render;
}
// 全局变量记录当前实例
let currentInstance = null;
function setCurrentInstance(instance) {
    currentInstance = instance;
}
function getCurrentInstance() {
    return currentInstance;
}
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
}

function shouldUpdateComponent(prevVnode, nextVnode) {
    const { props: prevProps } = prevVnode;
    const { props: nextProps } = nextVnode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

const Fragement = Symbol('Fragment');
const Text = Symbol('Text');
function createVnode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapeFlag(type),
        el: null,
        key: props && props.key,
        component: null
    };
    if (typeof children === 'string') {
        vnode.shapeFlag |= 4 /* TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ARRAY_CHILDREN */;
    }
    if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        if (typeof children === 'object') {
            vnode.shapeFlag |= 16 /* SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVnode(text) {
    return createVnode(Text, {}, text);
}
function getShapeFlag(type) {
    // 判断虚拟节点类型
    return typeof type === 'string' ? 1 /* ELEMENT */ : 2 /* STATEFUL_COMPONENT */;
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        // createApp(App).mount(container)
        // 返回包含Mount方法的对象达到链式调用的效果
        return {
            mount: function (rootContainer) {
                // 根据传入配置生成vnode
                const vnode = createVnode(rootComponent);
                // 根据vnode调用render生成真实元素并挂载到容器中
                render(vnode, rootContainer, null);
            }
        };
    };
}

// 缓存队列
const queue = [];
// 创建一个Promise
const p = Promise.resolve();
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
function queueJobs(job) {
    // 减少重复任务
    if (!queue.includes(job)) {
        queue.push(job);
    }
    // 执行任务队列
    queueFlush();
}
// 避免重复创建promise
let isFlushPending = false;
function queueFlush() {
    if (isFlushPending) {
        return;
    }
    isFlushPending = true;
    // 异步执行队列
    nextTick(flushJob);
}
function flushJob() {
    let job;
    isFlushPending = false;
    while (job = queue.shift()) {
        job && job();
    }
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, removeElement: hostRemoveElement, setElementText: hostSetElementText } = options;
    function render(n2, container, parentComponent) {
        // 通过patch区分vnode类型，进行对应的处理
        // processComponent/processElement等
        patch(null, n2, container, parentComponent, null);
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
        const { shapeFlag, type } = n2;
        switch (type) {
            case Fragement:
                // 处理空节点（插槽）
                processFragement(n2, container, parentComponent, anchor);
                break;
            case Text:
                // 处理文本节点(插槽)
                processText(n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ELEMENT */) {
                    // 处理元素
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    // 处理组件
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    function processText(n2, container) {
        // 只渲染children,并将真实元素挂载到el上
        const textNode = n2.el = document.createTextNode(n2.children);
        // 添加到容器
        container.append(textNode);
    }
    function processFragement(n2, container, parentComponent, anchor) {
        // 只渲染children
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach(v => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // 初始化
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            // 更新
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        const el = n2.el = n1.el;
        if (oldProps !== newProps) {
            patchProps(el, oldProps, newProps);
        }
        patchChildren(n1, n2, el, parentComponent, anchor);
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const { shapeFlag: prevShapeFlag, children: c1 } = n1;
        const { shapeFlag, children: c2 } = n2;
        // 新的是文本
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            // 旧的是数组
            if (prevShapeFlag & 8 /* ARRAY_CHILDREN */) {
                unMountChildren(c1);
            }
            // 设置文本
            if (c1 !== c2) {
                hostSetElementText(container, c2);
            }
        }
        else {
            // 新的是数组
            if (prevShapeFlag & 4 /* TEXT_CHILDREN */) {
                // 旧的是文本
                hostSetElementText(container, '');
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                // 旧的是数组
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        // 旧索引
        let e1 = c1.length - 1;
        // 新索引
        let e2 = c2.length - 1;
        // 头指针
        let i = 0;
        // 判断是否为同一个类型节点
        function isSomeVnodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 左侧开始移动头指针
        while (i <= e1 && i <= e2) {
            // 旧节点
            const n1 = c1[i];
            // 新节点
            const n2 = c2[i];
            // 比较是否为同一个节点
            if (isSomeVnodeType(n1, n2)) {
                // 是同类型节点，递归查看子节点
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            // 移动指针
            i++;
        }
        // 右侧移动
        while (i <= e1 && i <= e2) {
            // 旧节点
            const n1 = c1[e1];
            // 新节点
            const n2 = c2[e2];
            // 比较是否为同一个节点
            if (isSomeVnodeType(n1, n2)) {
                // 是同类型节点，递归查看子节点
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            // 移动指针
            e1--;
            e2--;
        }
        // 新的比老的长
        if (i > e1) {
            if (i <= e2) {
                const nextPos = e2 + 1;
                // 判断新增位置，大于新节点长度则是插在后面，小于新节点长度则是插在签名
                const anchor = nextPos < c2.length ? c2[nextPos].el : null;
                // 处理增加多个节点
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    // hostInsert(c2[i].el, container, anchor)
                    i++;
                }
            }
        }
        else if (i > e2) {
            // 老的比新的长
            while (i <= e1) {
                hostRemoveElement(c1[i].el);
                i++;
            }
        }
        else {
            // 中间对比
            // 1.老的存在，新的不存在
            // 2.新的存在，老的不存在
            // 3.新老都存在，移动位置
            // 老节点开始对比索引
            let s1 = i;
            // 新节点开始对比索引
            let s2 = i;
            // 建立Map映射，加快查询效率（对应key在新节点中的索引）
            const keyToNewIndexMap = new Map();
            for (let i = s2; i <= e2; i++) {
                keyToNewIndexMap.set(c2[i].key, i);
            }
            // 记录新节点需要比较数量
            const toBePatched = e2 - s2 + 1;
            // 当前比较次数
            let patched = 0;
            // 建立定长数组，记录老节点在新节点中的索引
            const newIndexToOldIndexMap = new Array(toBePatched);
            // 初始化，0代表老节点不存在新节点中
            for (let i = 0; i < toBePatched; i++)
                newIndexToOldIndexMap[i] = 0;
            // 是否需要移动（性能优化，为true才进行最长递增子序列的生成）
            // 判断条件：老节点映射到新节点中的索引递增则不需要移动
            let moved = false;
            // 老节点映射到新节点中的索引
            let maxNewIndexSoFar = 0;
            // 遍历老节点，处理不同情况
            for (let i = s1; i <= e1; i++) {
                const prevChildren = c1[i];
                // 达到最大比较次数，后续直接删除老节点
                if (patched >= toBePatched) {
                    hostRemoveElement(prevChildren.el);
                    continue;
                }
                let newIndex;
                if (prevChildren.key !== null) {
                    // 判断是否存在Map中
                    newIndex = keyToNewIndexMap.get(prevChildren.key);
                }
                else {
                    // 没有key值，直接遍历新节点
                    for (let j = s2; j <= e2; j++) {
                        const newChildren = c2[j];
                        if (isSomeVnodeType(newChildren, prevChildren)) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (newIndex === undefined) {
                    // 不存在新节点中，直接删除
                    hostRemoveElement(prevChildren.el);
                }
                else {
                    // 判断是否需要移动
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    // 记录老节点在新节点中的索引
                    // newIndex-s2：减去前面不变的
                    // i+1:因为当i为0时，代表不存在，其实是存在的，所以加1避免该情况;并且对应的算法要求值不能为0
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    // 存在新结点中，patch替换
                    patch(prevChildren, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            // 生成最长递增子序列
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
            // 定义一个指针，倒序才能保证节点的准确位置插入
            let j = increasingNewIndexSequence.length - 1;
            // 遍历新节点，找出需要更换位置的节点
            for (let i = toBePatched - 1; i >= 0; i--) {
                // 要移动节点索引
                const nextIndex = i + s2;
                // 要移动节点
                const nextChild = c2[nextIndex];
                // 锚点
                const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null;
                if (newIndexToOldIndexMap[i] === 0) {
                    // 该索引在老节点中不存在，直接创建新节点
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    // 不存在最长递增子序列中直接新增，或者索引不一致
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        // 移动节点
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function unMountChildren(children) {
        for (const child of children) {
            hostRemoveElement(child);
        }
    }
    function patchProps(el, oldProps, newProps) {
        // newProps比oldProps一致或者多
        for (const key in newProps) {
            const newVal = newProps[key];
            const oldVal = oldProps[key];
            if (newVal !== oldVal) {
                hostPatchProp(el, key, oldVal, newVal);
            }
        }
        // oldProps比newProps多，删除多余属性
        if (oldProps !== EMPTY_OBJ) {
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    hostPatchProp(el, key, oldProps[key], null);
                }
            }
        }
    }
    function mountElement(n2, container, parentComponent, anchor) {
        // 创建真实dom元素
        // 保存el到虚拟dom中，后须用于实现代理
        const el = n2.el = hostCreateElement(n2.type);
        const { children, props, shapeFlag } = n2;
        // 判断h函数第三个参数,重构后根据shapeFlag区分，采用位运算记录当前vnode类型，处理children
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            el.textContent = n2.children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
            children.forEach(v => {
                patch(null, v, el, parentComponent, anchor);
            });
        }
        // 判断h函数第二个参数，处理props
        for (const key in props) {
            const value = props[key];
            hostPatchProp(el, key, null, value);
        }
        // 添加到容器中
        hostInsert(el, container, anchor);
    }
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // 处理组件，并添加到容器中
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            // 更新组件
            patchComponent(n1, n2);
        }
    }
    function patchComponent(n1, n2) {
        console.log('update-component');
        // 取出旧虚拟节点中的实例，并赋值给新虚拟节点
        const instance = n2.component = n1.component;
        // 判断是否需要更新（避免不相关数据修改导致函数执行）
        if (shouldUpdateComponent(n1, n2)) {
            // 往实例上挂载新的虚拟节点，用于组件更新
            instance.next = n2;
            // 调用更新函数
            instance.update();
        }
        else {
            // 挂载el属性到新节点
            n2.el = n1.el;
            // 挂载新节点
            instance.vnode = n2;
        }
    }
    function mountComponent(initialVnode, container, parentComponent, anchor) {
        // 创建实例
        // 将实例挂载到虚拟节点上，用于组件更新
        const instance = initialVnode.component = createComponentInstance(initialVnode, parentComponent);
        // 处理props、slot、setup
        setupComponent(instance);
        // 调用render函数，并完成挂载
        setupRenderEffect(instance, initialVnode, container, anchor);
    }
    function setupRenderEffect(instance, initialVnode, container, anchor) {
        // 往实例上保存effect函数，用于更新组件
        // 通过effect函数包裹渲染视图逻辑，当响应式数据变化后，重新执行effect中的函数
        const { proxy } = instance;
        instance.update = effect(() => {
            // 根据isMounted判断是初始化还是更新
            if (!instance.isMounted) {
                // 在setupComponent中已经往实例上挂载了render函数，得到子树
                // call方法改变this指向，在render函数中就可以使用this去访问Setup中的属性
                // 存储当前虚拟节点树，用于更新判断
                const subTree = (instance.subTree = instance.render.call(proxy, proxy));
                // 子树递归调用patch
                patch(null, subTree, container, instance, anchor);
                // 初始化时vnode为根组件，subTree是根节点，且已经mount完毕。
                initialVnode.el = subTree.el;
                // 改变isMounted状态
                instance.isMounted = true;
            }
            else {
                // 更新组件Props，前置准备：新,老节点
                const { next, vnode } = instance;
                if (next) {
                    // 挂载el属性到新节点
                    next.el = vnode.el;
                    // 挂载新节点
                    instance.vnode = next;
                    // 更新组件属性
                    updateComponentPreRender(instance, next);
                }
                const { proxy } = instance;
                // 当前虚拟节点树
                const subTree = instance.render.call(proxy, proxy);
                // 上一个虚拟节点树
                const preSubTree = instance.subTree;
                // 赋值，后续更新使用
                instance.subTree = subTree;
                // 更新逻辑
                patch(preSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                queueJobs(instance.update);
            }
        });
    }
    return {
        createApp: createAppAPI(render)
    };
}
function updateComponentPreRender(instance, nextVnode) {
    // 清空实例上新节点属性
    instance.next = null;
    // 更新组件属性
    instance.props = nextVnode.props;
}
function getSequence(arr) {
    // arr:[2, 1, 5, 3, 4, 7, 8, 6, 9]
    // p: [2, 1, 1, 1, 3, 4, 5, 4, 6]
    // result(prev):[1, 3, 4, 7, 6, 8]
    // result(end):[1, 3, 4, 5, 6, 8]
    // copy原数组，最终会得到一个索引数组，记录相关递增信息
    const p = arr.slice();
    // 返回的索引数组，索引数组中的索引映射到arr的值是递增的（最有潜力达到最长递增序列的索引数组）
    const result = [0];
    // i=>当前遍历索引
    // j=>索引数组尾节点
    // u=>头指针（针对result(prev)数组）
    // v=>尾指针（针对result(prev)数组）
    // c=>中间指针（针对resul(prev)t数组）
    let i, j, u, v, c;
    // 数组长度
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            // 当前数据和arr[索引数组中最后一位]比较
            // 当前数据更大的话，p数组对应的值赋为索引数组中最后一位，并且往result数组中添加当前索引
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            // 当前数据更小的话，递归调用二分查找法
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    // arr[result数组中间的值（向下取整）]小于当前值
                    // 头指针移动
                    u = c + 1;
                }
                else {
                    // arr[result数组中间的值（向下取整）]大于当前值
                    // 尾指针移动
                    v = c;
                }
            }
            // arr[最新的头指针]和当前数据比较
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    // p[当前索引] = result[最新头指针的前一个]，因此u必须大于0
                    p[i] = result[u - 1];
                }
                // 替换,得到最有潜力数组
                // arr = [2,3,4,1]
                // [0,1,2] => [3,1,2]
                result[u] = i;
            }
        }
    }
    // 最有潜力数组长度
    u = result.length;
    // 最有潜力数组最大值（索引）
    v = result[u - 1];
    while (u-- > 0) {
        // 倒序赋值
        result[u] = v;
        // v赋值为p[v]，使result得到的一定是递减的索引数组
        v = p[v];
    }
    return result;
}

function h(type, props, children) {
    const vnode = createVnode(type, props, children);
    return vnode;
}

function renderSlots(slots, name, props) {
    // 获取父组件传入的指定name的slots,第三个参数此时为对象 eg:{header:()=>h('div',{},'header')} 
    const slot = slots[name];
    if (slot) {
        if (typeof slot === 'function') {
            // 作用域插槽，获取子组件传递的props
            return createVnode(Fragement, {}, slot(props));
        }
    }
}

function provide(key, value) {
    // 获取实例对象
    const instance = getCurrentInstance();
    if (instance) {
        let { provides } = instance;
        const parentProvides = instance.parent.provides;
        // 如果当前组件的provides和父组件的一致说明是初始化
        if (provides === parentProvides) {
            // 改变原型链来解决provides不同层级provide同一个key，导致父级以上传递数据改变
            // 通过解构声明的变量和原对象中对应的属性初始化的时候才相同，因此需要将instance.provides的值重新赋给解构后的值
            provides = instance.provides = Object.create(parentProvides);
        }
        // 注入数据
        provides[key] = value;
    }
}
function inject(key, defaultVal) {
    // 获取实例对象
    const instance = getCurrentInstance();
    if (instance) {
        // 从父级中的provides中取值/*  */
        const { provides } = instance.parent;
        if (key in provides) {
            return provides[key];
        }
        else {
            // 可传默认值
            if (typeof defaultVal === 'function') {
                return defaultVal();
            }
            else {
                return defaultVal;
            }
        }
    }
}

/**
 * 创建DOM元素
 * @param type 元素类型
 * @returns
 */
function createElement(type) {
    return document.createElement(type);
}
/**
 * 处理属性高
 * @param el DOM元素
 * @param key 属性名
 * @param oldValue 旧属性值
 * @param newvalue 新属性值
 */
function patchProp(el, key, oldValue, newValue) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        // 绑定事件
        // onClick => click
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, newValue);
    }
    else {
        if (newValue === null || newValue === undefined) {
            // 移除多余属性
            el.removeAttribute(key);
        }
        else {
            // 绑定属性
            el.setAttribute(key, newValue);
        }
    }
}
/**
 * 将DOM插入到容器中
 * @param el DOM元素
 * @param container 容器
 * @param anchor 锚点
 */
function insert(el, container, anchor) {
    // container.appendChild(el)
    container.insertBefore(el, anchor);
}
/**
 * 移除DOM
 */
function removeElement(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
/**
 * 设置文本
 */
function setElementText(el, text) {
    el.textContent = text;
}
// 得到对象，返回createApp函数
const render = createRenderer({ createElement, patchProp, insert, removeElement, setElementText });
function createApp(...args) {
    // ...args等同于rootComponent
    return render.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    h: h,
    renderSlots: renderSlots,
    createTextVnode: createTextVnode,
    createElementVnode: createVnode,
    provide: provide,
    inject: inject,
    getCurrentInstance: getCurrentInstance,
    registerRuntimeCompiler: registerRuntimeCompiler,
    nextTick: nextTick,
    toDisplayString: toDisplayString,
    ref: ref
});

const TO_DISPLAY_STRING = Symbol('toDisplayString');
const CREATE_ELEMENT_VNODE = Symbol('createElementVnode');
/**
 * Symbol -> String
 */
const helperMapName = {
    [TO_DISPLAY_STRING]: 'toDisplayString',
    [CREATE_ELEMENT_VNODE]: 'createElementVnode'
};

/**
 * 只负责生成代码
 * @param ast
 * @returns
 */
function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    // 导入逻辑，可提取
    genFunctionPreamble(ast, context);
    push("\n");
    push("return ");
    const functionName = 'render';
    const args = ["_ctx", "_cache", "$props", "$setup", "$data", "$options"];
    const signature = args.join(', ');
    push(`function ${functionName}(${signature}) {`);
    push(`return `);
    genNode(ast.codegenNode, context);
    push('}');
    // // 抽离函数名，参数，以及返回值
    // let code = ''
    // code += "return "
    // const functionName = 'render'
    // const args = ["_ctx", "_cache", "$props", "$setup", "$data", "$options"]
    // const signature = args.join(', ')
    // /** 划分职责，抽离节点内容，将节点内容获取交给transform处理 */
    // // const node = ast.children[0]
    // // const node = ast.codegenNode
    // code += `function ${functionName}(${signature}) {
    //         ${genNode(ast, code)}
    //       }`
    return {
        code: context.code
    };
}
function genFunctionPreamble(ast, context) {
    const { push, helper } = context;
    const VueBinging = "Vue";
    // const helpers = ["toDisplayString"]
    const aliasHelpers = (s) => `${helper(s)}: _${helper(s)}`;
    if (ast.helpers.length) {
        push(`const { ${ast.helpers.map(aliasHelpers).join(", ")} } = ${VueBinging}`);
    }
}
function genNode(node, context) {
    switch (node.type) {
        case 3 /* TEXT */:
            genText(node, context);
            break;
        case 0 /* INTERPOLATION */:
            genInterpolRation(node, context);
            break;
        case 1 /* SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 2 /* ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* COMPOUND_EXPRESSION */:
            genCompoundExpression(node, context);
            break;
    }
}
function genCompoundExpression(node, context) {
    const { push } = context;
    const { children } = node;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(`_${helper(CREATE_ELEMENT_VNODE)}(`);
    // for (let i = 0; i < children.length; i++) {
    //     const child = children[i];
    //     genNode(child, context)
    // }
    genNodeList(genNullable([tag, props, children]), context);
    // genNode(children, context)
    push(`)`);
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(", ");
        }
    }
}
function genNullable(args) {
    return args.map((arg) => arg || 'null');
}
function genText(node, context) {
    const { push } = context;
    push(`"${node.content}"`);
}
function genInterpolRation(node, context) {
    const { push, helper } = context;
    push(`_${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(`)`);
}
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}
function createCodegenContext() {
    const context = {
        code: '',
        push(source) {
            context.code += source;
        },
        helper(key) {
            return helperMapName[key];
        }
    };
    return context;
}

/**
 * 编译AST解构树
 * @param content
 * @returns
 */
function baseParse(content) {
    const context = createParserContext(content);
    return createRoot(parseChildren(context, []));
}
/**
 * 解析子节点
 * @param context
 * @returns
 */
function parseChildren(context, ancestors) {
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        if (s.startsWith("{{")) {
            node = parseInterpolation(context);
        }
        else if (s[0] === '<') {
            if (/[a-z]/i.test(s[1])) {
                node = parseElment(context, ancestors);
            }
        }
        else {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    const s = context.source;
    if (s.startsWith("</")) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startsWithEndTagOpen(s, tag)) {
                return true;
            }
        }
    }
    // if (parentTag && s.startsWith(`</${parentTag}>`)) {
    //     return true
    // }
    return !s;
}
/**
 * 解析文本
 * @param context
 * @returns
 */
function parseText(context) {
    let endIndex = context.source.length;
    const endTokens = ["{{", "<"];
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index > -1 && endIndex > index) {
            endIndex = index;
        }
    }
    const content = parseTextData(context, endIndex);
    advanceBy(context, content.length);
    return {
        type: 3 /* TEXT */,
        content
    };
}
function parseTextData(context, length) {
    return context.source.slice(0, length);
}
/**
 * 处理元素
 * @param context
 * @returns
 */
function parseElment(context, ancestors) {
    let element = parseTag(context, 0 /* Start */);
    ancestors.push(element);
    element.children = parseChildren(context, ancestors);
    ancestors.pop();
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, 1 /* End */);
    }
    else {
        throw new Error('缺少结束标签' + element.tag);
    }
    return element;
}
/**
 * 公共抽离方法
 * @param context
 * @param type
 * @returns
 */
function startsWithEndTagOpen(source, tag) {
    return source.slice(2, 2 + tag.length) === tag;
}
function parseTag(context, type) {
    // 解析tag
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    // 推进
    advanceBy(context, match[0].length + 1);
    const tag = match[1];
    if (type === 1 /* End */)
        return;
    return {
        type: 2 /* ELEMENT */,
        tag,
        children: []
    };
}
/**
 * 处理插值
 * @param context
 * @returns
 */
function parseInterpolation(context) {
    // 抽离变化点
    const openDelimiter = "{{";
    const closeDelimiter = "}}";
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    advanceBy(context, openDelimiter.length);
    const rawContentLength = closeIndex - openDelimiter.length;
    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim();
    advanceBy(context, rawContentLength + closeDelimiter.length);
    return {
        type: 0 /* INTERPOLATION */,
        content: {
            type: 1 /* SIMPLE_EXPRESSION */,
            content
        }
    };
}
/**
 * 推进
 * @param context
 * @param length
 */
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
function createRoot(children) {
    return {
        children,
        type: 4 /* ROOT */
    };
}
/**
 * 创建上下文对象，用于处理多种解析情况
 * @param content
 */
function createParserContext(content) {
    return {
        source: content
    };
}

function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    // 1.遍历树，深度优先搜索
    // 2.替换textContent    
    traverseNode(root, context);
    // 生成对应属性给codegen生成代码
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}
function createRootCodegen(root) {
    const child = root.children[0];
    if (child.type === 2 /* ELEMENT */) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = root.children[0];
    }
}
function traverseNode(node, context) {
    const nodeTransforms = context.nodeTransforms;
    const exitFns = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context);
        if (onExit)
            exitFns.push(onExit);
    }
    switch (node.type) {
        case 0 /* INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 4 /* ROOT */:
        case 2 /* ELEMENT */:
            // 获取子节点
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(node, context) {
    const children = node.children;
    if (children) {
        // 深度优先遍历
        for (let i = 0; i < children.length; i++) {
            const node = children[i];
            traverseNode(node, context);
        }
    }
}
/**
 * 创建上下文对象
 * @param root
 * @param options
 */
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        }
    };
    return context;
}

function createVnodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type: 2 /* ELEMENT */,
        tag,
        props,
        children
    };
}

function transformElement(node, context) {
    if (node.type === 2 /* ELEMENT */) {
        return () => {
            const { children, tag } = node;
            const vnodeTag = `"${tag}"`;
            let vnodeProps;
            let vnodeChildren = children[0];
            node.codegenNode = createVnodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

function transformExpression(node) {
    if (node.type === 0 /* INTERPOLATION */) {
        return () => {
            node.content = processExpression(node.content);
        };
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

function isText(node) {
    return node.type === 3 /* TEXT */ || node.type === 0 /* INTERPOLATION */;
}

function transformText(node) {
    const { type } = node;
    if (type === 2 /* ELEMENT */) {
        return () => {
            let currentContainer;
            const { children } = node;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5 /* COMPOUND_EXPRESSION */,
                                    children: [child]
                                };
                            }
                            currentContainer.children.push(' + ');
                            currentContainer.children.push(next);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template) {
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText]
    });
    return generate(ast);
}

function compilerToFunction(template) {
    const { code } = baseCompile(template);
    const render = new Function("Vue", code)(runtimeDom);
    return render;
    // function renderFunction(Vue) {
    //     const {
    //         toDisplayString: _toDisplayString,
    //         openBlock: _openBlock,
    //         createElementBlock: _createElementBlock
    //     } = Vue
    //     return function render(_ctx, _cache, $props, $setup, $data, $options) {
    //         return (
    //             _openBlock(),
    //             _createElementBlock(
    //                 "div",
    //                 null,
    //                 "hi, " + _toDisplayString(_ctx.message),
    //                 1 /* TEXT */
    //             )
    //         )
    //     }
    // }
}
registerRuntimeCompiler(compilerToFunction);

export { createApp, createVnode as createElementVnode, createTextVnode, getCurrentInstance, h, inject, nextTick, provide, ref, registerRuntimeCompiler, renderSlots, toDisplayString };
