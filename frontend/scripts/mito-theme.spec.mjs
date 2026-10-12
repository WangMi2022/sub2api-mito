import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync, statSync, utimesSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { adaptations, contracts } from '../src/themes/mito/adaptations.mjs'
import { planAdaptation, writeAdaptation } from './mito-theme.mjs'

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const temporaryRoot = process.env.MITO_TEST_TMP_ROOT
if (!temporaryRoot) throw new Error('Set MITO_TEST_TMP_ROOT to an isolated task directory before running these tests.')
mkdirSync(temporaryRoot, { recursive: true })

function fixture(t) {
  const root = mkdtempSync(resolve(temporaryRoot, 'mito-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  for (const path of new Set([...adaptations, ...contracts].map(item => item.path))) {
    const destination = resolve(root, path)
    mkdirSync(dirname(destination), { recursive: true })
    copyFileSync(resolve(sourceRoot, path), destination)
  }
  // Reconstruct the upstream inputs independently of the adapter under test.
  for (const adaptation of adaptations) {
    const path = resolve(root, adaptation.path)
    let content = readFileSync(path, 'utf8')
    for (const edit of [...adaptation.edits].reverse()) content = content.replace(edit.after, edit.before)
    writeFileSync(path, content)
  }
  return root
}

const snapshots = root => adaptations.map(({ path }) => readFileSync(resolve(root, path), 'utf8'))
const apply = root => writeAdaptation(planAdaptation(root, 'apply'))
const firstPath = root => resolve(root, adaptations[0].path)

test('apply is idempotent and check verifies every integration', t => {
  const root = fixture(t)
  assert.throws(() => planAdaptation(root, 'check'), /theme adaptation missing/)
  assert.equal(apply(root), adaptations.length)
  assert.equal(planAdaptation(root, 'check').files.length, adaptations.length)
  assert.equal(apply(root), 0)
})

test('remove restores upstream seams and preserves unrelated edits', t => {
  const root = fixture(t)
  const upstream = snapshots(root)
  apply(root)
  const path = firstPath(root)
  writeFileSync(path, `${readFileSync(path, 'utf8')}\n// unrelated local customization\n`)
  assert.equal(writeAdaptation(planAdaptation(root, 'remove')), adaptations.length)
  const actual = snapshots(root)
  assert.equal(actual[0], `${upstream[0]}\n// unrelated local customization\n`)
  assert.deepEqual(actual.slice(1), upstream.slice(1))
  assert.equal(writeAdaptation(planAdaptation(root, 'remove')), 0)
})

test('a changed upstream anchor prevents all writes', t => {
  const root = fixture(t)
  const path = resolve(root, adaptations.at(-1).path)
  writeFileSync(path, readFileSync(path, 'utf8').replace(adaptations.at(-1).edits[0].before, '<AppLayout changed>'))
  const before = snapshots(root)
  assert.throws(() => apply(root), /No files written.*Resolve these conflicts first/s)
  assert.deepEqual(snapshots(root), before)
})

test('duplicate anchors are rejected without applying earlier files', t => {
  const root = fixture(t)
  const path = firstPath(root)
  writeFileSync(path, `${readFileSync(path, 'utf8')}\n${adaptations[0].edits[0].before}\n`)
  const before = snapshots(root)
  assert.throws(() => apply(root), /ambiguous anchor/)
  assert.deepEqual(snapshots(root), before)
})

test('missing upstream contracts fail before any mutation', t => {
  const root = fixture(t)
  const contract = contracts[0]
  const path = resolve(root, contract.path)
  writeFileSync(path, readFileSync(path, 'utf8').replace(contract.anchors[0], 'renamed contract'))
  const before = snapshots(root)
  assert.throws(() => apply(root), /contract missing/)
  assert.deepEqual(snapshots(root), before)
})

test('a concurrent content change is preserved and cancels the whole plan', t => {
  const root = fixture(t)
  const plan = planAdaptation(root, 'apply')
  const path = firstPath(root)
  const changed = `${readFileSync(path, 'utf8')}\n// edited in another session\n`
  writeFileSync(path, changed)
  const before = snapshots(root)
  assert.throws(() => writeAdaptation(plan), /Concurrent change.*No files written/s)
  assert.deepEqual(snapshots(root), before)
  assert.equal(readFileSync(path, 'utf8'), changed)
})

test('mtime-only changes also invalidate the plan', t => {
  const root = fixture(t)
  const plan = planAdaptation(root, 'apply')
  const path = firstPath(root)
  const stat = statSync(path)
  utimesSync(path, stat.atime, new Date(stat.mtimeMs + 2000))
  const before = snapshots(root)
  assert.throws(() => writeAdaptation(plan), /Concurrent change/)
  assert.deepEqual(snapshots(root), before)
})

test('a concurrent theme dependency change cannot produce a mixed adaptation', t => {
  const root = fixture(t)
  const plan = planAdaptation(root, 'apply')
  const path = resolve(root, contracts.find(item => item.path.endsWith('theme.css')).path)
  const changed = `${readFileSync(path, 'utf8')}\n/* concurrent token update */\n`
  writeFileSync(path, changed)
  const before = snapshots(root)
  assert.throws(() => writeAdaptation(plan), /Concurrent change/)
  assert.deepEqual(snapshots(root), before)
  assert.equal(readFileSync(path, 'utf8'), changed)
})
