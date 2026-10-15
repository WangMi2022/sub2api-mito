<template>
  <div ref="containerRef" class="model-tag-field" data-testid="model-tag-input">
    <div class="model-tag-values">
      <span v-for="model in modelValue" :key="model" class="model-tag" data-testid="model-tag">
        <span class="min-w-0 break-all">{{ model }}</span>
        <button
          type="button"
          class="model-tag-remove"
          :aria-label="`${t('common.remove')} ${model}`"
          @click="removeModel(model)"
        >
          <Icon name="x" size="xs" />
        </button>
      </span>
      <input
        ref="inputRef"
        v-model="draft"
        type="text"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        :aria-expanded="isOpen"
        :aria-controls="isOpen ? listId : undefined"
        :aria-activedescendant="isOpen && focusedIndex >= 0 ? `${listId}-${focusedIndex}` : undefined"
        :aria-label="placeholder || t('admin.groups.deniedModelsPlaceholder')"
        :placeholder="placeholder || t('admin.groups.deniedModelsPlaceholder')"
        class="model-tag-draft"
        data-testid="model-tag-draft"
        @focus="openDropdown"
        @click="openDropdown"
        @input="openDropdown"
        @keydown="handleKeydown"
        @blur="handleBlur"
      />
    </div>
    <button
      type="button"
      class="model-tag-toggle"
      :aria-label="t('admin.groups.toggleModelCandidates')"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? listId : undefined"
      @mousedown.prevent
      @click="toggleDropdown"
    >
      <Icon name="chevronDown" size="sm" :class="isOpen && 'rotate-180'" />
    </button>

    <Teleport to="body">
      <Transition name="select-dropdown">
        <div v-if="isOpen" class="select-dropdown-portal model-candidate-menu" :style="dropdownStyle" @mousedown.prevent>
          <div class="model-candidate-heading">
            <span>{{ t('admin.groups.modelCandidates') }}</span>
            <span class="tabular-nums">{{ filteredCandidates.length }}</span>
          </div>
          <div ref="optionsRef" :id="listId" role="listbox" :aria-label="t('admin.groups.modelCandidates')" class="model-candidate-options">
            <div
              v-for="(candidate, index) in filteredCandidates"
              :id="`${listId}-${index}`"
              :key="candidate"
              role="option"
              :aria-selected="focusedIndex === index"
              class="model-candidate-option"
              :class="focusedIndex === index && 'model-candidate-option-focused'"
              @mouseenter="focusedIndex = index"
              @click="selectCandidate(candidate)"
            >
              <span class="min-w-0 flex-1 break-all">{{ candidate }}</span>
              <Icon name="plus" size="sm" class="shrink-0 text-primary-500" />
            </div>
            <div v-if="filteredCandidates.length === 0" class="px-3 py-5 text-sm leading-6 text-gray-500 dark:text-gray-400" role="status">
              {{ t(draft.trim() ? 'admin.groups.modelCandidatesNoMatch' : 'admin.groups.modelCandidatesEmpty') }}
            </div>
          </div>
          <p class="model-candidate-hint">{{ t('admin.groups.modelInputHint') }}</p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CSSProperties } from 'vue'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps<{
  modelValue: string[]
  candidates?: string[]
  placeholder?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
const { t } = useI18n()
const listId = `model-candidates-${useId()}`
const draft = ref('')
const isOpen = ref(false)
const focusedIndex = ref(-1)
const containerRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const optionsRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref<CSSProperties>({})

const hasModel = (models: string[], model: string) =>
  models.some(existing => existing.toLowerCase() === model.toLowerCase())

const availableCandidates = computed(() => {
  const seen = new Set(props.modelValue.map(model => model.toLowerCase()))
  return (props.candidates ?? []).filter(candidate => {
    const key = candidate.toLowerCase()
    if (!candidate.trim() || seen.has(key)) return false
    seen.add(key)
    return true
  })
})

const filteredCandidates = computed(() => {
  const keyword = draft.value.trim().toLowerCase()
  return availableCandidates.value.filter(candidate => candidate.toLowerCase().includes(keyword))
})

watch(filteredCandidates, () => { focusedIndex.value = -1 })

// 与共享 Select 使用同一菜单表面；浮层独立定位，避免表格滚动容器裁切。
function updatePosition() {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return
  const padding = 8
  const width = Math.min(Math.max(rect.width, 280), window.innerWidth - padding * 2)
  const below = window.innerHeight - rect.bottom - padding
  const above = rect.top - padding
  const openAbove = below < 280 && above > below
  dropdownStyle.value = {
    position: 'fixed',
    left: `${Math.max(padding, Math.min(rect.left, window.innerWidth - width - padding))}px`,
    width: `${width}px`,
    minWidth: '0',
    maxHeight: `${Math.max(0, Math.min(320, (openAbove ? above : below) - 4))}px`,
    ...(openAbove ? { bottom: `${window.innerHeight - rect.top + 4}px` } : { top: `${rect.bottom + 4}px` }),
    zIndex: 100000020
  }
}

function removePositionListeners() {
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
}

watch(isOpen, open => {
  if (open) {
    updatePosition()
    window.addEventListener('scroll', updatePosition, { capture: true, passive: true })
    window.addEventListener('resize', updatePosition)
  } else {
    focusedIndex.value = -1
    removePositionListeners()
  }
})

watch(() => props.modelValue, () => {
  if (isOpen.value) nextTick(updatePosition)
}, { deep: true })

function openDropdown() {
  isOpen.value = true
}

function toggleDropdown() {
  const open = !isOpen.value
  inputRef.value?.focus()
  isOpen.value = open
}

function addModels(models: string[]) {
  const next = [...props.modelValue]
  for (const model of models) {
    if (!hasModel(next, model)) next.push(model)
  }
  if (next.length !== props.modelValue.length) emit('update:modelValue', next)
}

// 保留逗号、中文逗号、空白分隔的批量输入和末尾 *，由服务端校验模型规则。
function commitDraft() {
  const parts = draft.value.split(/[\s,，]+/).map(part => part.trim()).filter(Boolean)
  draft.value = ''
  addModels(parts)
}

function selectCandidate(candidate: string) {
  draft.value = ''
  focusedIndex.value = -1
  addModels([candidate])
  inputRef.value?.focus()
}

function removeModel(model: string) {
  emit('update:modelValue', props.modelValue.filter(existing => existing !== model))
}

function handleBlur() {
  isOpen.value = false
  commitDraft()
}

function moveFocus(direction: number) {
  isOpen.value = true
  const count = filteredCandidates.value.length
  if (!count) return
  focusedIndex.value = focusedIndex.value < 0
    ? (direction > 0 ? 0 : count - 1)
    : (focusedIndex.value + direction + count) % count
  nextTick(() => {
    const list = optionsRef.value
    const option = list?.children[focusedIndex.value] as HTMLElement | undefined
    if (!list || !option) return
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight
    }
  })
}

function handleKeydown(event: KeyboardEvent) {
  if (event.isComposing) return
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    event.stopPropagation()
    isOpen.value = false
    return
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    moveFocus(event.key === 'ArrowDown' ? 1 : -1)
    return
  }
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    const candidate = isOpen.value && focusedIndex.value >= 0 ? filteredCandidates.value[focusedIndex.value] : undefined
    if (event.key === 'Enter' && candidate) selectCandidate(candidate)
    else commitDraft()
    return
  }
  if (event.key === 'Backspace' && draft.value === '' && props.modelValue.length > 0) {
    removeModel(props.modelValue[props.modelValue.length - 1])
  }
}

onBeforeUnmount(removePositionListeners)
</script>

<style scoped>
.model-tag-field {
  @apply flex min-h-[44px] min-w-0 items-start gap-1 rounded-xl border border-gray-200 bg-white p-1.5;
  @apply focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20;
  @apply dark:border-dark-500 dark:bg-dark-800;
}
.model-tag-values { @apply flex min-w-0 flex-1 flex-wrap items-center gap-1.5; }
.model-tag {
  @apply inline-flex max-w-full items-center gap-1 rounded-lg bg-red-50 py-0.5 pl-2 text-xs font-medium text-red-700;
  @apply dark:bg-red-900/20 dark:text-red-300;
}
.model-tag-remove {
  @apply inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md;
  @apply hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 dark:hover:bg-red-900/40;
}
.model-tag-draft {
  @apply min-w-0 flex-1 basis-36 border-0 bg-transparent px-1 py-1.5 text-sm text-gray-900;
  @apply placeholder:text-gray-500 focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-gray-400;
}
.model-tag-toggle {
  @apply inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500;
  @apply hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 dark:text-gray-400 dark:hover:bg-dark-700;
}
.model-candidate-menu { @apply flex flex-col; }
.model-candidate-heading {
  @apply flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2.5 text-xs font-medium text-gray-500;
  @apply dark:border-dark-700 dark:text-gray-400;
}
.model-candidate-options { @apply min-h-0 overflow-y-auto overscroll-contain p-1; }
.model-candidate-option {
  @apply flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-800;
  @apply hover:bg-primary-50 dark:text-gray-100 dark:hover:bg-primary-900/20;
}
.model-candidate-option-focused { @apply bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300; }
.model-candidate-hint {
  @apply shrink-0 border-t border-gray-100 px-3 py-2 text-xs leading-5 text-gray-500;
  @apply dark:border-dark-700 dark:text-gray-400;
}
</style>
