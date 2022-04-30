import { NodeType } from "./ast"
const enum TagType {
    Start,
    End
}

/**
 * 编译AST解构树
 * @param content 
 * @returns 
 */
export function baseParse(content: string) {
    const context = createParserContext(content)
    return createRoot(parseChildren(context, []))
}
/**
 * 解析子节点
 * @param context 
 * @returns 
 */
function parseChildren(context: Context, ancestors: any[]) {
    const nodes: any = []
    while (!isEnd(context, ancestors)) {
        let node
        const s = context.source
        if (s.startsWith("{{")) {
            node = parseInterpolation(context)
        } else if (s[0] === '<') {
            if (/[a-z]/i.test(s[1])) {
                node = parseElment(context, ancestors)
            }
        } else {
            node = parseText(context)
        }
        nodes.push(node)
    }
    return nodes
}
function isEnd(context: Context, ancestors: any[]) {
    const s = context.source
    if (s.startsWith("</")) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startsWithEndTagOpen(s, tag)) {
                return true
            }
        }
    }
    // if (parentTag && s.startsWith(`</${parentTag}>`)) {
    //     return true
    // }

    return !s
}
/**
 * 解析文本
 * @param context 
 * @returns 
 */
function parseText(context: Context) {
    let endIndex = context.source.length
    const endTokens = ["{{", "<"]
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i])
        if (index > -1 && endIndex > index) {
            endIndex = index
        }
    }
    const content = parseTextData(context, endIndex)
    advanceBy(context, content.length)
    return {
        type: NodeType.TEXT,
        content
    }
}
function parseTextData(context: Context, length: number) {
    return context.source.slice(0, length)
}

/**
 * 处理元素
 * @param context 
 * @returns 
 */
function parseElment(context: Context, ancestors: any[]) {
    let element = parseTag(context, TagType.Start)
    ancestors.push(element)
    element!.children = parseChildren(context, ancestors)
    ancestors.pop()
    if (startsWithEndTagOpen(context.source, element!.tag)) {
        parseTag(context, TagType.End)
    } else {
        throw new Error('缺少结束标签' + element!.tag)
    }
    return element
}
/**
 * 公共抽离方法
 * @param context 
 * @param type 
 * @returns 
 */
function startsWithEndTagOpen(source, tag) {
    return source.slice(2, 2 + tag.length) === tag
}
function parseTag(context: Context, type: TagType) {
    // 解析tag
    const match: any = /^<\/?([a-z]*)/i.exec(context.source)
    // 推进
    advanceBy(context, match[0].length + 1)
    const tag = match[1]
    if (type === TagType.End) return
    return {
        type: NodeType.ELEMENT,
        tag,
        children: []
    }
}
/**
 * 处理插值
 * @param context 
 * @returns 
 */
function parseInterpolation(context: Context) {
    // 抽离变化点
    const openDelimiter = "{{"
    const closeDelimiter = "}}"
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length)
    advanceBy(context, openDelimiter.length)
    const rawContentLength = closeIndex - openDelimiter.length
    const rawContent = parseTextData(context, rawContentLength)
    const content = rawContent.trim()
    advanceBy(context, rawContentLength + closeDelimiter.length)
    return {
        type: NodeType.INTERPOLATION,
        content: {
            type: NodeType.SIMPLE_EXPRESSION,
            content
        }
    }
}
/**
 * 推进
 * @param context 
 * @param length 
 */
function advanceBy(context: Context, length: number) {
    context.source = context.source.slice(length)
}
function createRoot(children) {
    return {
        children,
        type:NodeType.ROOT
    }
}
/**
 * 创建上下文对象，用于处理多种解析情况
 * @param content 
 */
function createParserContext(content: string) {
    return {
        source: content
    }
}

type Context = {
    source: string
}