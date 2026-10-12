import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/** The upstream sidebar and theme header share the existing html.dark preference. */
export function useThemeSync(dark: Ref<boolean>) {
  const sync = () => { dark.value = document.documentElement.classList.contains('dark') }
  const observer = new MutationObserver(sync)
  onMounted(() => {
    sync()
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  })
  onBeforeUnmount(() => observer.disconnect())
}
