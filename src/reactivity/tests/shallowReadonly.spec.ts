import { isReadonly, shallowReadonly } from "../reactivity"

describe('shallowReadonly', () => {
    it('should not mank non-reactive properties reactive', () => {
        const props = shallowReadonly({ n: { foo: 1 } })
        expect(isReadonly(props)).toBe(true)
        expect(isReadonly(props.n)).toBe(false)
    })
    it('warn when call set', () => {
        const user = shallowReadonly({
            age: 10
        })
        console.warn = jest.fn()
        user.age = 11
        expect(console.warn).toBeCalled()
    })
})