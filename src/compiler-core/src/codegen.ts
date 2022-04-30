import { isString } from "../../shared"
import { NodeType } from "./ast"
import { CREATE_ELEMENT_VNODE, helperMapName, TO_DISPLAY_STRING } from "./runtimeHelpers"

/**
 * 只负责生成代码
 * @param ast 
 * @returns 
 */
export function generate(ast) {
    const context = createCodegenContext()
    const { push } = context
    // 导入逻辑，可提取
    genFunctionPreamble(ast, context)
    push("\n")
    push("return ")
    const functionName = 'render'
    const args = ["_ctx", "_cache", "$props", "$setup", "$data", "$options"]
    const signature = args.join(', ')
    push(`function ${functionName}(${signature}) {`)
    push(`return `)
    genNode(ast.codegenNode, context)
    push('}')
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
    }
}
function genFunctionPreamble(ast: any, context) {
    const { push, helper } = context
    const VueBinging = "Vue"
    // const helpers = ["toDisplayString"]
    const aliasHelpers = (s) => `${helper(s)}: _${helper(s)}`
    if (ast.helpers.length) {
        push(`const { ${ast.helpers.map(aliasHelpers).join(", ")} } = ${VueBinging}`)
    }
}

function genNode(node, context) {
    switch (node.type) {
        case NodeType.TEXT:
            genText(node, context)
            break;
        case NodeType.INTERPOLATION:
            genInterpolRation(node, context)
            break
        case NodeType.SIMPLE_EXPRESSION:
            genExpression(node, context)
            break
        case NodeType.ELEMENT:
            genElement(node, context)
            break
        case NodeType.COMPOUND_EXPRESSION:
            genCompoundExpression(node, context)
            break
        default: break
    }
}

function genCompoundExpression(node, context) {
    const { push } = context
    const { children } = node
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child)
        } else {
            genNode(child, context)
        }
    }
}

function genElement(node, context) {
    const { push, helper } = context
    const { tag, children, props } = node
    push(`_${helper(CREATE_ELEMENT_VNODE)}(`)
    // for (let i = 0; i < children.length; i++) {
    //     const child = children[i];
    //     genNode(child, context)
    // }
    genNodeList(genNullable([tag, props, children]), context)
    // genNode(children, context)
    push(`)`)
}

function genNodeList(nodes, context) {
    const { push } = context
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node)
        } else {
            genNode(node, context)
        }

        if(i<nodes.length-1){
            push(", ")
        }
    }
}

function genNullable(args) {
    return args.map((arg) => arg || 'null')
}

function genText(node: any, context: any) {
    const { push } = context
    push(`"${node.content}"`)
}

function genInterpolRation(node: any, context: any) {
    const { push, helper } = context
    push(`_${helper(TO_DISPLAY_STRING)}(`)
    genNode(node.content, context)
    push(`)`)
}

function genExpression(node: any, context: any) {
    const { push } = context
    push(`${node.content}`)
}

function createCodegenContext() {
    const context = {
        code: '',
        push(source) {
            context.code += source
        },
        helper(key) {
            return helperMapName[key]
        }
    }
    return context
}
