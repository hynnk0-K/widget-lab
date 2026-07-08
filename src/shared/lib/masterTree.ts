export interface MasterNode {
  type: string
  id: number
  name: string
  children?: MasterNode[]
}

export function childrenOf(node: MasterNode, type: string): MasterNode[] {
  return node.children?.filter((c) => c.type === type) ?? []
}

export function allOf(nodes: MasterNode[], type: string): MasterNode[] {
  const res: MasterNode[] = []
  for (const n of nodes) {
    if (n.type === type) res.push(n)
    else if (n.children?.length) res.push(...allOf(n.children, type))
  }
  return res
}
