import { NodeType } from "./ast"
import { TO_DISPLAY_STRING } from "./runtimeHelpers"

export function transform(root, options = {}) {
    const context = createTransformContext(root, options)
    // 1.遍历树，深度优先搜索
    // 2.替换textContent    
    traverseNode(root, context)
    // 生成对应属性给codegen生成代码
    createRootCodegen(root)

    root.helpers = [...context.helpers.keys()]
}

function createRootCodegen(root: any) {
    const child = root.children[0]
    if (child.type === NodeType.ELEMENT) {
        root.codegenNode = child.codegenNode
    } else {
        root.codegenNode = root.children[0]
    }
}

function traverseNode(node, context) {
    const nodeTransforms = context.nodeTransforms
    const exitFns: any = []
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context)
        if (onExit) exitFns.push(onExit)
    }
    switch (node.type) {
        case NodeType.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING)
            break
        case NodeType.ROOT:
        case NodeType.ELEMENT:
            // 获取子节点
            traverseChildren(node, context);
            break
        default:
            break
    }
    let i = exitFns.length
    while (i--) {
        exitFns[i]()
    }
}
function traverseChildren(node: any, context: any) {
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
function createTransformContext(root: any, options: any) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1)
        }
    }
    return context
}    
