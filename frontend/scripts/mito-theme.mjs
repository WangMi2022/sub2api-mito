#!/usr/bin/env node
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { adaptations, contracts } from '../src/themes/mito/adaptations.mjs'

const digest = value => createHash('sha256').update(value).digest('hex')
const count = (value, anchor) => value.split(anchor).length - 1

function replaceEdit(value, edit, mode, path) {
  const afterCount = count(value, edit.after)
  const outside = afterCount === 1 ? value.replace(edit.after, '') : value
  const beforeCount = count(outside, edit.before)
  if (afterCount > 1 || beforeCount > 1 || (afterCount && beforeCount)) {
    throw new Error(`${path}: ambiguous anchor (${edit.before.slice(0, 60)})`)
  }
  if (mode === 'check') {
    if (afterCount !== 1) throw new Error(`${path}: theme adaptation missing`)
    return value
  }
  if (mode === 'apply' && afterCount === 1) return value
  if (mode === 'remove' && afterCount === 1) return value.replace(edit.after, edit.before)
  if (beforeCount !== 1) throw new Error(`${path}: upstream anchor changed (${edit.before.slice(0, 60)})`)
  return mode === 'apply' ? value.replace(edit.before, edit.after) : value
}

/** Validate every file before any write; conflicts cannot leave a half-applied theme. */
export function planAdaptation(root, mode) {
  if (!['apply', 'check', 'remove'].includes(mode)) throw new Error('Use apply, check or remove')
  const errors = []
  const dependencies = []
  for (const contract of contracts) {
    try {
      const absolute = resolve(root, contract.path)
      const content = readFileSync(absolute)
      for (const anchor of contract.anchors || []) {
        if (!content.toString().includes(anchor)) throw new Error(`contract missing: ${anchor}`)
      }
      if (contract.binary && content.length < 1000) throw new Error('font asset is incomplete')
      dependencies.push({ absolute, hash: digest(content), mtime: statSync(absolute).mtimeMs })
    } catch (error) { errors.push(`${contract.path}: ${error.message}`) }
  }
  const files = []
  for (const adaptation of adaptations) {
    try {
      const absolute = resolve(root, adaptation.path)
      const before = readFileSync(absolute, 'utf8')
      let after = before
      const edits = mode === 'remove' ? [...adaptation.edits].reverse() : adaptation.edits
      for (const edit of edits) after = replaceEdit(after, edit, mode, adaptation.path)
      files.push({ path: adaptation.path, absolute, before, after, hash: digest(before), mtime: statSync(absolute).mtimeMs })
    } catch (error) { errors.push(`${adaptation.path}: ${error.message}`) }
  }
  if (errors.length) throw new Error(`No files written. Resolve these conflicts first:\n${errors.join('\n')}`)
  return { files, dependencies }
}

/** Recheck the entire snapshot immediately before editing, preserving concurrent changes. */
export function writeAdaptation(plan) {
  for (const snapshot of [...plan.dependencies, ...plan.files]) {
    if (digest(readFileSync(snapshot.absolute)) !== snapshot.hash || statSync(snapshot.absolute).mtimeMs !== snapshot.mtime) {
      throw new Error(`Concurrent change: ${snapshot.absolute}. No files written.`)
    }
  }
  const written = []
  try {
    for (const file of plan.files) {
      if (file.before === file.after) continue
      // A second check narrows the race between planning and each individual write.
      if (digest(readFileSync(file.absolute)) !== file.hash || statSync(file.absolute).mtimeMs !== file.mtime) throw new Error(`Concurrent change: ${file.path}`)
      writeFileSync(file.absolute, file.after)
      written.push(file)
    }
  } catch (error) {
    const preserved = []
    for (const file of written.reverse()) {
      if (digest(readFileSync(file.absolute)) === digest(file.after)) writeFileSync(file.absolute, file.before)
      else preserved.push(file.path)
    }
    throw new Error(`${error.message}. Applied files rolled back${preserved.length ? `; concurrent edits preserved in: ${preserved.join(', ')}` : ''}.`)
  }
  return written.length
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invoked) {
  try {
    const mode = process.argv[2]?.replace(/^--/, '') || 'check'
    const rootFlag = process.argv.find(arg => arg.startsWith('--root='))
    const root = rootFlag ? resolve(rootFlag.slice(7)) : resolve(dirname(fileURLToPath(import.meta.url)), '../..')
    const plan = planAdaptation(root, mode)
    const changed = mode === 'check' ? 0 : writeAdaptation(plan)
    console.log(`Mito theme ${mode}: OK (${plan.files.length} upstream files; ${changed} changed).`)
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
