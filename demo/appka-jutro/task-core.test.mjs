import test from 'node:test'
import assert from 'node:assert/strict'
import { computeStats, createTask, filterTasks, normalizeText, sanitizeTasks } from './task-core.mjs'

test('normalizeText collapses spaces', () => {
  assert.equal(normalizeText('  hello   world '), 'hello world')
})

test('createTask returns null for empty text', () => {
  assert.equal(createTask({ text: '   ' }), null)
})

test('sanitizeTasks removes invalid entries and normalizes duplicates', () => {
  const input = [
    { id: '1', text: 'Task 1', done: false, priority: 'low' },
    { id: '1', text: 'Task 2', done: true, priority: 'wrong' },
    { id: '2', text: '   ' },
  ]

  const output = sanitizeTasks(input)

  assert.equal(output.length, 2)
  assert.equal(output[0].id, '1')
  assert.notEqual(output[1].id, '1')
  assert.equal(output[1].priority, 'medium')
})

test('filterTasks handles state filter and text query', () => {
  const tasks = [
    { text: 'Release app', done: false },
    { text: 'Write tests', done: true },
  ]

  assert.equal(filterTasks(tasks, { filter: 'active' }).length, 1)
  assert.equal(filterTasks(tasks, { filter: 'done', query: 'write' }).length, 1)
  assert.equal(filterTasks(tasks, { filter: 'done', query: 'release' }).length, 0)
})

test('computeStats returns correct numbers', () => {
  const stats = computeStats([
    { done: false },
    { done: true },
    { done: true },
  ])

  assert.deepEqual(stats, { total: 3, done: 2, remaining: 1 })
})
