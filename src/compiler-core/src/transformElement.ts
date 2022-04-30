import { createVnodeCall, NodeType } from "./ast";
import { CREATE_ELEMENT_VNODE } from "./runtimeHelpers";

export function transformElement(node, context) {
    if (node.type === NodeType.ELEMENT) {
        return () => {
            const { children, tag } = node
            const vnodeTag = `"${tag}"`
            let vnodeProps
            let vnodeChildren = children[0]
            node.codegenNode = createVnodeCall(context, vnodeTag, vnodeProps, vnodeChildren)
        }
    }
}