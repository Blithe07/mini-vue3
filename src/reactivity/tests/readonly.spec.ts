import { isProxy, isReadonly, readonly } from "../reactivity"

describe('readonly', () => {
    it('happy path', () => {
        const original = { foo: 1, bar: { baz: 2 } }
        const wrapped = readonly(original)
        expect(wrapped).not.toBe(original)
        expect(wrapped.foo).toBe(1)
    })
    it('warn when call set', () => {
        const user = readonly({
            age: 10
        })
        console.warn = jest.fn()
        user.age = 11
        expect(console.warn).toBeCalled()
    })
    it('isReadonly', () => {
        const original = { foo: 1, bar: { baz: 2 } }
        const wrapped = readonly(original)
        expect(isReadonly(original)).toBe(false)
        expect(isReadonly(wrapped)).toBe(true)
    })
    it('nested readonly', () => {
        const original = {
            nested: {
                foo: 1
            },
            array: [{ bar: 2 }]
        }
        const observed = readonly(original)
        expect(isReadonly(observed.nested)).toBe(true)
        expect(isReadonly(observed.array)).toBe(true)
        expect(isReadonly(observed.array[0])).toBe(true)
    })
    it('isProxy',()=>{
        const original = { foo: 1, bar: { baz: 2 } }
        const wrapped = readonly(original)
        expect(isProxy(original)).toBe(false)
        expect(isProxy(wrapped)).toBe(true)
    })
})