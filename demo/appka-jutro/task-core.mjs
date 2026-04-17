export const STORAGE_KEY = 'appka-na-jutro-v3'

export const PRIORITIES = ['low', 'medium', 'high']

export const createId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const normalizePriority = (priority) => (PRIORITIES.includes(priority) ? priority : 'medium')

export const normalizeText = (value) => {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim()
}

export const createTask = ({ text, priority = 'medium', id = createId(), done = false, createdAt = Date.now() }) => {
  const normalizedText = normalizeText(text)
  if (!normalizedText) return null

  return {
    id: typeof id === 'string' && id ? id : createId(),
    text: normalizedText,
    priority: normalizePriority(priority),
    done: Boolean(done),
    createdAt: Number.isFinite(Number(createdAt)) ? Number(createdAt) : Date.now(),
  }
}

export const sanitizeTasks = (rawTasks) => {
  if (!Array.isArray(rawTasks)) return []

  const seenIds = new Set()
  const result = []

  for (const rawTask of rawTasks) {
    const task = createTask(rawTask ?? {})
    if (!task) continue

    if (seenIds.has(task.id)) {
      task.id = createId()
    }

    seenIds.add(task.id)
    result.push(task)
  }

  return result
}

export const filterTasks = (tasks, { filter = 'all', query = '' } = {}) => {
  const search = normalizeText(query).toLowerCase()

  return tasks.filter((task) => {
    const byFilter =
      filter === 'all' ||
      (filter === 'active' && !task.done) ||
      (filter === 'done' && task.done)

    if (!byFilter) return false

    if (!search) return true
    return task.text.toLowerCase().includes(search)
  })
}

export const computeStats = (tasks) => {
  const total = tasks.length
  const done = tasks.reduce((acc, task) => acc + Number(task.done), 0)
  return { total, done, remaining: total - done }
}

export const readStorage = (storage) => {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    return sanitizeTasks(JSON.parse(raw))
  } catch {
    return []
  }
}

export const writeStorage = (storage, tasks) => {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(tasks))
    return true
  } catch {
    return false
  }
}
