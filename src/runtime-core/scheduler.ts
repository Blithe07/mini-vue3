// 缓存队列
const queue: any[] = []
// 创建一个Promise
const p = Promise.resolve()
export function nextTick(fn) {
    return fn ? p.then(fn) : p
}
export function queueJobs(job) {
    // 减少重复任务
    if (!queue.includes(job)) {
        queue.push(job)
    }
    // 执行任务队列
    queueFlush()
}
// 避免重复创建promise
let isFlushPending = false
function queueFlush() {
    if (isFlushPending) {
        return
    }
    isFlushPending = true
    // 异步执行队列
    nextTick(flushJob)
}

function flushJob() {
    let job
    isFlushPending = false
    while (job = queue.shift()) {
        job && job()
    }

}