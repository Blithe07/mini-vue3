import { isProxy, isReactive, reactive } from "../reactivity"

describe('reactive', () => {
    it('happy path', () => {
        const origin = { foo: 1 }
        const observed = reactive(origin)
        expect(observed).not.toBe(origin)
        expect(observed.foo).toBe(1)
    })
    it('isReactive', () => {
        const origin = { foo: 1 }
        const observed = reactive(origin)
        expect(isReactive(observed)).toBe(true)
        expect(isReactive(origin)).toBe(false)
    })
    it('nested reactive', () => {
        const original = {
            nested: {
                foo: 1
            },
            array: [{ bar: 2 }]
        }
        const observed = reactive(original)
        expect(isReactive(observed.nested)).toBe(true)
        expect(isReactive(observed.array)).toBe(true)
        expect(isReactive(observed.array[0])).toBe(true)
    })
    it('isProxy',()=>{
        const origin = { foo: 1 }
        const observed = reactive(origin)
        expect(isProxy(observed)).toBe(true)
        expect(isProxy(origin)).toBe(false)
    })
})