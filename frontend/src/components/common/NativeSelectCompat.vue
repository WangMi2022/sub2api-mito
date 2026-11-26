<template>
  <div :class="['mito-select-compat', wrapClass]" :style="wrapStyle">
    <span
      ref="triggerRef"
      aria-hidden="true"
      :class="['select-trigger', 'mito-select-compat-trigger', triggerClass, isOpen && 'select-trigger-open', disabled && 'select-trigger-disabled']"
    >
      <span class="select-value">{{ selectedLabel }}</span>
      <span class="select-icon">
        <Icon name="chevronDown" size="md" :class="['transition-transform duration-200', isOpen && 'rotate-180']" />
      </span>
    </span>

    <Teleport to="body">
      <Transition name="select-dropdown">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          :class="['select-dropdown-portal', 'mito-select-compat-portal', instanceId]"
          :style="dropdownStyle"
          role="listbox"
          tabindex="-1"
          @click.stop
          @mousedown.stop
          @keydown="onDropdownKeyDown"
        >
          <div v-if="searchable" class="select-search">
            <Icon name="search" size="sm" class="text-gray-400" />
            <input ref="searchInputRef" v-model="searchQuery" type="text" class="select-search-input" :placeholder="searchPlaceholder" @click.stop />
          </div>
          <div ref="listRef" class="select-options">
            <div
              v-for="(option, index) in filteredOptions"
              :key="`${option.value}:${index}`"
              role="option"
              :aria-selected="isOptionSelected(option)"
              :aria-disabled="option.disabled || undefined"
              :class="[
                'select-option',
                option.group !== undefined && 'select-option-group',
                isOptionSelected(option) && 'select-option-selected',
                option.disabled && option.group === undefined && 'select-option-disabled',
                focusedIndex === index && option.group === undefined && 'select-option-focused'
              ]"
              @click.stop="!option.disabled && choose(option)"
              @mouseenter="!option.disabled && (focusedIndex = index)"
            >
              <span class="select-option-label">{{ option.label }}</span>
              <Icon v-if="isOptionSelected(option)" name="check" size="sm" class="text-primary-500" :stroke-width="2" />
            </div>
            <div v-if="filteredOptions.length === 0" class="select-empty">{{ emptyText }}</div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 兼容层:真实 select/options 就是可视触发器(透明覆盖在美化按钮上),
         原生点击/键盘/表单语义与既有 setValue、选择器测试全部保留;下拉面板用美化层。 -->
    <select
      ref="selectRef"
      class="mito-select-compat-native"
      :disabled="disabled"
      v-bind="nativeAttrs"
      @change="onNativeChange"
      @keydown="onNativeKeyDown"
      @click.prevent="toggle"
    >
      <slot />
    </select>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number | boolean | null | undefined">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, useAttrs } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'

// 原生 <select> 的通用美化替身:从插槽里的真实 option DOM 读取选项,
// 渲染与共用 Select.vue 一致的下拉;选择后回写原生 select 并派发 change,
// v-model / v-model.number / @change 处理器全部按原生语义工作。
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  value?: T | Array<string | number | boolean>
  disabled?: boolean
  searchable?: boolean | 'auto'
  multiple?: boolean
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: T): void; (e: 'change', value: T): void }>()

const { t } = useI18n()
const attrs = useAttrs()
const instanceId = `nselect-${Math.random().toString(36).substring(2, 9)}`

interface CompatOption { value: string | number | boolean; label: string; disabled: boolean; group?: string }

const selectRef = ref<HTMLSelectElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const searchQuery = ref('')
const focusedIndex = ref(-1)
const options = ref<CompatOption[]>([])
const currentValue = ref<string>('')
const selectedValues = ref<string[]>([])
const position = ref<'bottom' | 'top'>('bottom')
const triggerRect = ref<DOMRect | null>(null)

// 原生 select 上除 class/style/value/disabled 外的属性(id/data-testid/name 等)原样保留。
const nativeAttrs = computed(() => {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class' || k === 'style' || k === 'value' || k === 'disabled' || k === 'onChange' || k.startsWith('onUpdate:')) continue
    out[k] = v
  }
  return out
})

// 布局类留在外层容器;其余外观类(input/text-*/py-* 等)透传给触发按钮覆盖默认样式。
const LAYOUT_RE = /^(w-|min-w-|max-w-|flex-|grow|shrink|basis-|col-span-|mt-|mb-|ml-|mr-|mx-|my-|m-|hidden|block|inline|self-|justify-|order-)/
const wrapClass = computed(() => String(attrs.class ?? '').split(/\s+/).filter((c) => LAYOUT_RE.test(c)).join(' '))
const triggerClass = computed(() => String(attrs.class ?? '').split(/\s+/).filter((c) => c && !LAYOUT_RE.test(c)).join(' '))
const wrapStyle = computed(() => attrs.style as any)

const searchable = computed(() => {
  if (props.searchable === 'auto' || props.searchable === undefined) return options.value.length > 8
  return props.searchable
})
const searchPlaceholder = computed(() => t('common.searchPlaceholder'))
const emptyText = computed(() => t('common.noOptionsFound'))

const selectedLabel = computed(() => {
  if (props.multiple) {
    if (selectedValues.value.length === 0) return ''
    const labels = selectedValues.value.map((v) => options.value.find((o) => String(o.value) === v)?.label ?? v)
    if (labels.length <= 2) return labels.join(', ')
    return t('common.selectedCount', { count: labels.length })
  }
  const found = options.value.find((o) => String(o.value) === currentValue.value)
  return found?.label ?? currentValue.value ?? ''
})

function isOptionSelected(option: CompatOption): boolean {
  if (props.multiple) return selectedValues.value.includes(String(option.value))
  return String(option.value) === currentValue.value
}

const filteredOptions = computed(() => {
  if (!searchable.value || !searchQuery.value) return options.value
  const q = searchQuery.value.toLowerCase()
  return options.value.filter((o) => o.group === undefined && o.label.toLowerCase().includes(q))
})

const dropdownStyle = computed(() => {
  const rect = triggerRect.value
  if (!rect) return {}
  const pad = 8
  const right = Math.max(pad, window.innerWidth - pad)
  const left = Math.min(Math.max(pad, rect.left), right)
  const available = Math.max(0, right - left)
  const minWidth = Math.min(Math.max(200, rect.width), available)
  const style: Record<string, string> = {
    position: 'fixed', left: `${left}px`, minWidth: `${minWidth}px`, maxWidth: `${available}px`, zIndex: '100000020'
  }
  if (position.value === 'top') style.bottom = `${window.innerHeight - rect.top + 4}px`
  else style.top = `${rect.bottom + 4}px`
  return style
})

function readOptions() {
  const el = selectRef.value
  if (!el) return
  const list: CompatOption[] = []
  for (const child of Array.from(el.children)) {
    if (child.tagName === 'OPTGROUP') {
      const label = child.getAttribute('label') ?? ''
      list.push({ value: `__group__${label}`, label, disabled: true, group: label })
      for (const o of Array.from(child.querySelectorAll('option'))) {
        list.push({ value: (o as any)._value !== undefined ? (o as any)._value : o.value, label: (o.textContent ?? '').trim(), disabled: o.disabled })
      }
    } else if (child.tagName === 'OPTION') {
      const o = child as HTMLOptionElement
      list.push({ value: (o as any)._value !== undefined ? (o as any)._value : o.value, label: (o.textContent ?? '').trim(), disabled: o.disabled })
    }
  }
  options.value = list
  if (props.multiple) {
    // 多选:受控数组优先;否则读 DOM selected。
    const want = Array.isArray(props.value) ? props.value.map(String) : null
    for (const o of Array.from(el.options)) {
      const sel = want ? want.includes(o.value) : o.selected
      if (o.selected !== sel) o.selected = sel
    }
    selectedValues.value = Array.from(el.options).filter((o) => o.selected).map((o) => {
      const typed = (o as any)._value
      return String(typed !== undefined ? typed : o.value)
    })
    return
  }
  // Vue patch option 子树(文本/增删)会触发浏览器「ask for a reset」把选中项重置为
  // 第一项;本函数在 post-flush watch 与 MutationObserver 里跑,同步把受控值写回。
  const want = props.value != null ? String(props.value) : currentValue.value
  // 空字符串是合法受控值(占位选项 value=""),不能用 truthy 判断。
  if (props.value != null && Array.from(el.options).some((o) => o.value === want)) {
    if (el.value !== want) el.value = want
    currentValue.value = want
  } else {
    currentValue.value = el.value
  }
}

let observer: MutationObserver | null = null
onMounted(() => {
  readOptions()
  // 选项来自插槽响应式渲染;DOM 变化(含 label 文案更新)时同步。
  observer = new MutationObserver(() => readOptions())
  if (selectRef.value) observer.observe(selectRef.value, { childList: true, subtree: true, characterData: true })
  document.addEventListener('click', onClickOutside)
})
onUnmounted(() => {
  observer?.disconnect()
  document.removeEventListener('click', onClickOutside)
  window.removeEventListener('scroll', updateRect, { capture: true })
  window.removeEventListener('resize', updateRect)
})

watch(() => props.value, (v) => {
  if (!props.multiple) currentValue.value = v != null ? String(v) : ''
  // post-flush: DOM(含插槽 option)已更新,同步校准原生 select,时序确定。
  readOptions()
}, { immediate: true, flush: 'post', deep: true })

function updateRect() {
  if (triggerRef.value) triggerRect.value = triggerRef.value.getBoundingClientRect()
}

function open() {
  if (props.disabled || isOpen.value) return
  readOptions()
  isOpen.value = true
}
function toggle() {
  if (isOpen.value) isOpen.value = false
  else open()
}

watch(isOpen, (openNow) => {
  if (openNow) {
    updateRect()
    nextTick(() => {
      if (dropdownRef.value && triggerRect.value) {
        const h = dropdownRef.value.offsetHeight || 240
        position.value = window.innerHeight - triggerRect.value.bottom < h && triggerRect.value.top > h ? 'top' : 'bottom'
      }
      const idx = filteredOptions.value.findIndex((o) => o.group === undefined && (props.multiple ? selectedValues.value.includes(String(o.value)) : String(o.value) === currentValue.value))
      focusedIndex.value = idx >= 0 ? idx : filteredOptions.value.findIndex((o) => o.group === undefined)
      if (searchable.value) searchInputRef.value?.focus()
      else dropdownRef.value?.focus()
    })
    window.addEventListener('scroll', updateRect, { capture: true, passive: true })
    window.addEventListener('resize', updateRect)
  } else {
    searchQuery.value = ''
    focusedIndex.value = -1
    window.removeEventListener('scroll', updateRect, { capture: true })
    window.removeEventListener('resize', updateRect)
  }
})

function choose(option: CompatOption) {
  const el = selectRef.value
  if (!el) return
  if (props.multiple) {
    // 以组件状态为基准切换,不依赖可能被浏览器重置的 DOM selectedness。
    const key = String(option.value)
    const next = selectedValues.value.includes(key)
      ? selectedValues.value.filter((v) => v !== key)
      : [...selectedValues.value, key]
    selectedValues.value = next
    for (const o of Array.from(el.options)) o.selected = next.includes(o.value)
    const typed = next.map((v) => {
      const opt = options.value.find((o) => String(o.value) === v)
      return opt ? opt.value : v
    })
    emit('change', typed as unknown as T)
    nextTick(() => readOptions())
    return
  }
  el.value = String(option.value)
  currentValue.value = String(option.value)
  // 合成 @change(先赋值再调用用户 handler)需要拿到新值而非 Event 对象;保留原类型。
  emit('change', option.value as T)
  isOpen.value = false
  selectRef.value?.focus()
  // 受控回滚:父级拒绝新值(如保存失败)时 props.value 不变,post-flush 把 DOM 拉回。
  nextTick(() => readOptions())
}

function onNativeChange() {
  // 测试 setValue、键盘或程序式修改原生 select 时同步显示,并按原生语义先写值再触发 change。
  const el = selectRef.value
  if (!el) return
  if (props.multiple) {
    const typed = Array.from(el.options).filter((o) => o.selected).map((o) => (o as any)._value !== undefined ? (o as any)._value : o.value)
    selectedValues.value = typed.map(String)
    emit('change', typed as unknown as T)
    return
  }
  const v = el.value
  currentValue.value = v
  const opt = options.value.find((o) => String(o.value) === v)
  emit('change', (opt ? opt.value : v) as T)
  nextTick(() => readOptions())
}

function onNativeKeyDown(e: KeyboardEvent) {
  // 拦截原生展开,统一用美化面板;保留 Tab 焦点流转。
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    open()
  }
}

function moveFocus(delta: number) {
  const opts = filteredOptions.value
  if (!opts.length) return
  for (let offset = 1; offset <= opts.length; offset++) {
    const idx = (focusedIndex.value + delta * offset + opts.length * offset) % opts.length
    if (!opts[idx].disabled) {
      focusedIndex.value = idx
      nextTick(() => {
        const list = listRef.value
        const el = list?.children[idx] as HTMLElement | undefined
        if (!list || !el) return
        if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop
        else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.offsetHeight) list.scrollTop = el.offsetTop + el.offsetHeight - list.offsetHeight
      })
      return
    }
  }
}

function onDropdownKeyDown(e: KeyboardEvent) {
  if (e.isComposing) return
  switch (e.key) {
    case 'ArrowDown': e.preventDefault(); moveFocus(1); break
    case 'ArrowUp': e.preventDefault(); moveFocus(-1); break
    case 'Enter': {
      e.preventDefault()
      const opt = filteredOptions.value[focusedIndex.value]
      if (opt && !opt.disabled) choose(opt)
      break
    }
    case 'Escape':
      e.preventDefault(); e.stopPropagation()
      isOpen.value = false
      selectRef.value?.focus()
      break
    case 'Tab': isOpen.value = false; break
  }
}

function onClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!isOpen.value) return
  if (target.closest(`.${instanceId}`)) return
  if (triggerRef.value?.parentElement?.contains(target)) return
  isOpen.value = false
}
</script>

<style scoped>
.mito-select-compat {
  position: relative;
  display: block;
}

.mito-select-compat-native {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: 0;
}

.mito-select-compat-native:disabled {
  cursor: not-allowed;
}

.mito-select-compat-native:focus-visible + .select-trigger,
.mito-select-compat:focus-within .select-trigger {
  border-color: rgb(var(--mito-primary-500, 59 130 246));
  box-shadow: 0 0 0 2px rgb(var(--mito-primary-500, 59 130 246) / 30%);
}
</style>
