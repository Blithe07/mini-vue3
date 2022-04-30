import {
    h, ref
} from '/lib/mini-vue.esm.js'

// const prevChildren = [
//     h('div', { key: 'A' }, 'A'),
//     h('div', { key: 'B' }, 'B'),
//     h('div', { key: 'C' }, 'C'),
// ]
// const nextChildren = [
//     h('div', { key: 'A' }, 'A'),
//     h('div', { key: 'B' }, 'B'),
//     h('div', { key: 'C' }, 'C'),
//     h('div', { key: 'D' }, 'D'),
//     h('div', { key: 'E' }, 'E'),
// ]
// const prevChildren = [
//     h('div', { key: 'A' }, 'A'),
//     h('div', { key: 'B' }, 'B'),
//     h('div', { key: 'C' }, 'C'),
// ]
// const nextChildren = [
//     h('div', { key: 'D' }, 'D'),
//     h('div', { key: 'E' }, 'E'),
//     h('div', { key: 'A' }, 'A'),
//     h('div', { key: 'B' }, 'B'),
//     h('div', { key: 'C' }, 'C'),
// ]
// const prevChildren = [
//     h('div', { key: 'A' }, 'A'),
//     h('div', { key: 'B' }, 'B'),
//     h('div', { key: 'C' }, 'C'),
// ]
// const nextChildren = [
//     h('div', { key: 'A' }, 'A'),
//     h('div', { key: 'B' }, 'B'),
// ]
// const prevChildren = [
//     h('div', { key: 'A' }, 'A'),
//     h('div', { key: 'B' }, 'B'),
//     h('div', { key: 'C' }, 'C'),
// ]
// const nextChildren = [
//     h('div', { key: 'B' }, 'B'),
//     h('div', { key: 'C' }, 'C'),
// ]
// const prevChildren = [
//     h('div', { key: 'A' }, 'A'),
//     h('div', { key: 'B' }, 'B'),
//     h('div', { key: 'C', id: 'prev-c' }, 'C'),
//     h('div', { key: 'D' }, 'D'),
//     h('div', { key: 'F' }, 'F'),
//     h('div', { key: 'G' }, 'G'),
// ]
// const nextChildren = [
//     h('div', { key: 'A' }, 'A'),
//     h('div', { key: 'B' }, 'B'),
//     h('div', { key: 'E' }, 'E'),
//     h('div', { key: 'C', id: 'next-c' }, 'C'),
//     h('div', { key: 'F' }, 'F'),
//     h('div', { key: 'G' }, 'G'),
// ]
const prevChildren = [
    h('div', { key: 'A' }, 'A'),
    h('div', { key: 'B' }, 'B'),
    h('div', { key: 'C' }, 'C'),
    h('div', { key: 'D' }, 'D'),
    h('div', { key: 'E' }, 'E'),
    h('div', { key: 'F' }, 'F'),
    h('div', { key: 'Z' }, 'Z'),
    h('div', { key: 'F' }, 'F'),
    h('div', { key: 'G' }, 'G'),
]
const nextChildren = [
    h('div', { key: 'A' }, 'A'),
    h('div', { key: 'B' }, 'B'),
    h('div', { key: 'D' }, 'D'),
    h('div', { key: 'C' }, 'C'),
    h('div', { key: 'Y' }, 'Y'),
    h('div', { key: 'E' }, 'E'),
    h('div', { key: 'F' }, 'F'),
    h('div', { key: 'F' }, 'F'),
    h('div', { key: 'G' }, 'G'),
]
export default {
    name: 'ArrayToArray',
    setup() {
        const isChange = ref(false)
        window.isChange = isChange
        return { isChange }
    },
    render() {
        const self = this
        return this.isChange === true ? h('div', {}, nextChildren) : h('div', {}, prevChildren)
    }
}