import {
  computeStats,
  createTask,
  filterTasks,
  readStorage,
  sanitizeTasks,
  writeStorage,
} from './task-core.mjs'

const elements = {
  form: document.querySelector('#task-form'),
  taskInput: document.querySelector('#task-input'),
  priorityInput: document.querySelector('#priority-input'),
  formMessage: document.querySelector('#form-message'),
  taskList: document.querySelector('#task-list'),
  emptyState: document.querySelector('#empty-state'),
  stats: document.querySelector('#stats'),
  searchInput: document.querySelector('#search-input'),
  filterButtons: Array.from(document.querySelectorAll('[data-filter]')),
  clearDoneBtn: document.querySelector('#clear-done-btn'),
  clearAllBtn: document.querySelector('#clear-all-btn'),
  exportBtn: document.querySelector('#export-btn'),
  importInput: document.querySelector('#import-input'),
  taskTemplate: document.querySelector('#task-template'),
}

const state = {
  tasks: [],
  filter: 'all',
  search: '',
}

const priorityLabels = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

const persist = () => {
  const ok = writeStorage(localStorage, state.tasks)
  if (!ok) {
    setMessage('Не удалось сохранить изменения в localStorage.', true)
  }
  return ok
}

const setMessage = (message, isError = false) => {
  elements.formMessage.textContent = message
  elements.formMessage.style.color = isError ? 'var(--danger)' : 'var(--muted)'
}

const getVisibleTasks = () => filterTasks(state.tasks, { filter: state.filter, query: state.search })

const renderStats = () => {
  const { total, done, remaining } = computeStats(state.tasks)
  elements.stats.textContent = `${total} задач · ${done} выполнено · ${remaining} осталось`
}

const createTaskNode = (task) => {
  const fragment = elements.taskTemplate.content.cloneNode(true)
  const item = fragment.querySelector('.task-item')
  const toggle = fragment.querySelector('.toggle')
  const text = fragment.querySelector('.task-text')
  const priority = fragment.querySelector('.task-priority')
  const editButton = fragment.querySelector('.edit')
  const removeButton = fragment.querySelector('.remove')

  item.dataset.id = task.id
  item.classList.toggle('done', task.done)

  toggle.checked = task.done
  toggle.dataset.action = 'toggle'

  text.textContent = task.text
  text.dataset.role = 'task-text'

  priority.dataset.priority = task.priority
  priority.textContent = priorityLabels[task.priority]

  editButton.dataset.action = 'edit'
  removeButton.dataset.action = 'remove'

  return fragment
}

const render = () => {
  const visibleTasks = getVisibleTasks()
  elements.taskList.innerHTML = ''

  const listFragment = document.createDocumentFragment()
  visibleTasks.forEach((task) => listFragment.append(createTaskNode(task)))
  elements.taskList.append(listFragment)

  elements.emptyState.hidden = visibleTasks.length > 0
  renderStats()
}

const addTask = () => {
  const task = createTask({ text: elements.taskInput.value, priority: elements.priorityInput.value })
  if (!task) {
    setMessage('Введите корректный текст задачи.', true)
    return
  }

  state.tasks.unshift(task)
  persist()
  render()

  elements.taskInput.value = ''
  elements.taskInput.focus()
  setMessage('Задача добавлена.')
}

const updateTask = (id, updater) => {
  let changed = false

  state.tasks = state.tasks.map((task) => {
    if (task.id !== id) return task
    changed = true
    return updater(task)
  })

  if (!changed) return
  persist()
  render()
}

const removeTask = (id) => {
  const next = state.tasks.filter((task) => task.id !== id)
  if (next.length === state.tasks.length) return
  state.tasks = next
  persist()
  render()
  setMessage('Задача удалена.')
}

const replaceTaskText = (id, nextText) => {
  const normalized = createTask({ text: nextText })
  if (!normalized) {
    setMessage('Пустой текст недопустим.', true)
    return
  }

  updateTask(id, (task) => ({ ...task, text: normalized.text }))
  setMessage('Задача обновлена.')
}

const startInlineEdit = (taskItem) => {
  const id = taskItem.dataset.id
  const textElement = taskItem.querySelector('[data-role="task-text"]')
  if (!textElement || !id) return

  const previousText = textElement.textContent ?? ''
  const input = document.createElement('input')
  input.type = 'text'
  input.value = previousText
  input.className = 'inline-input'
  input.maxLength = 120

  const finish = (shouldSave) => {
    if (shouldSave) {
      replaceTaskText(id, input.value)
    } else {
      render()
    }
  }

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') finish(true)
    if (event.key === 'Escape') finish(false)
  })

  input.addEventListener('blur', () => finish(true), { once: true })

  textElement.replaceWith(input)
  input.focus()
  input.select()
}

const clearDone = () => {
  const next = state.tasks.filter((task) => !task.done)
  if (next.length === state.tasks.length) {
    setMessage('Нет выполненных задач для удаления.')
    return
  }

  state.tasks = next
  persist()
  render()
  setMessage('Выполненные задачи удалены.')
}

const clearAll = () => {
  if (!state.tasks.length) {
    setMessage('Список уже пуст.')
    return
  }

  const confirmed = window.confirm('Удалить все задачи без возможности восстановления?')
  if (!confirmed) return

  state.tasks = []
  persist()
  render()
  setMessage('Все задачи удалены.')
}

const exportTasks = () => {
  const data = JSON.stringify(state.tasks, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = 'planer-na-zavtra.json'
  anchor.click()

  URL.revokeObjectURL(url)
  setMessage('Экспорт готов.')
}

const importTasks = async (file) => {
  if (!file) return

  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    state.tasks = sanitizeTasks(parsed)
    persist()
    render()
    setMessage('Импорт выполнен.')
  } catch {
    setMessage('Не удалось импортировать JSON.', true)
  } finally {
    elements.importInput.value = ''
  }
}

const bindEvents = () => {
  elements.form.addEventListener('submit', (event) => {
    event.preventDefault()
    addTask()
  })

  elements.taskList.addEventListener('click', (event) => {
    const taskItem = event.target.closest('.task-item')
    if (!taskItem) return

    const id = taskItem.dataset.id
    if (!id) return

    const actionElement = event.target.closest('[data-action]')
    if (!actionElement) return

    const action = actionElement.dataset.action

    if (action === 'toggle') {
      updateTask(id, (task) => ({ ...task, done: !task.done }))
      return
    }

    if (action === 'remove') {
      removeTask(id)
      return
    }

    if (action === 'edit') {
      startInlineEdit(taskItem)
    }
  })

  elements.searchInput.addEventListener('input', () => {
    state.search = elements.searchInput.value
    render()
  })

  elements.filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter

      elements.filterButtons.forEach((item) => {
        item.classList.toggle('active', item === button)
      })

      render()
    })
  })

  elements.clearDoneBtn.addEventListener('click', clearDone)
  elements.clearAllBtn.addEventListener('click', clearAll)
  elements.exportBtn.addEventListener('click', exportTasks)

  elements.importInput.addEventListener('change', () => {
    const [file] = elements.importInput.files
    importTasks(file)
  })
}

const init = () => {
  state.tasks = readStorage(localStorage)
  bindEvents()
  render()
  setMessage('Готово к работе.')
}

init()
