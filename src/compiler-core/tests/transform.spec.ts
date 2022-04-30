import { NodeType } from "../src/ast"
import { baseParse } from "../src/parse"
import { transform } from "../src/transform"

describe('transform', () => {
    it('happy path', () => {
        const ast = baseParse('<div>hi,{{message}}</div>')
        /**
         * 插件机制
         * @param node 
         */
        const plugin = (node) => {
            if (node.type === NodeType.TEXT) {
                node.content = node.content + "mini-vue"
            }
        }
        transform(ast, {
            nodeTransforms: [plugin]
        })
        const nodeText = ast.children[0].children[0].content
        expect(nodeText).toBe('hi,mini-vue')
    })
})