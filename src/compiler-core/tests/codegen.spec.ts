import { generate } from "../src/codegen"
import { baseParse } from "../src/parse"
import { transform } from "../src/transform"
import { transformElement } from "../src/transformElement"
import { transformExpression } from "../src/transformExpression"
import { transformText } from "../src/transformText"

describe('codegen', () => {
    it('text', () => {
        const ast = baseParse('hi')
        transform(ast)
        const { code } = generate(ast)
        // 快照
        expect(code).toMatchSnapshot()
    })
    it('interpolation', () => {
        const ast = baseParse('{{message}}')
        transform(ast, {
            nodeTransforms: [transformExpression]
        })
        const { code } = generate(ast)
        expect(code).toMatchSnapshot()
    })
    it('element', () => {
        const ast: any = baseParse('<div>hi,{{message}}</div>')
        transform(ast, {
            nodeTransforms: [transformExpression, transformElement, transformText]
        })
        const { code } = generate(ast)
        expect(code).toMatchSnapshot()
    })

})