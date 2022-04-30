import {
    h
} from '/lib/mini-vue.esm.js'
export const Foo = {
    setup(props, { emit }) {
        const emitAdd = () => {
            console.log('child emit');
            emit('add',1,2)
            emit('add-foo')
        }
        return { emitAdd }
    },
    render() {
        const btn = h('button', { onClick: this.emitAdd }, 'emit')
        return h('div', {}, [btn])
    }
}