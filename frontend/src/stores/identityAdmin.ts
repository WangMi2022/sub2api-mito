import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { identityAPI } from '@/api/identity'
import { useAuthStore } from './auth'

export const useIdentityAdminStore = defineStore('identityAdmin', () => {
  const auth = useAuthStore()
  const granted = ref(false)
  const checkedUser = ref<number | null>(null)
  let generation = 0
  const canManage = computed(() => granted.value && checkedUser.value === auth.user?.id)

  async function refresh(): Promise<boolean> {
    const current = ++generation
    const id = auth.user?.id
    granted.value = false
    checkedUser.value = null
    if (!id || !auth.isAuthenticated) return false
    try {
      const result = await identityAPI.capabilities()
      if (current !== generation || auth.user?.id !== id) return false
      checkedUser.value = id
      granted.value = result.manage
      return result.manage
    } catch { return false }
  }
  watch(() => auth.user?.id, () => { void refresh() }, { immediate: true })
  return { canManage, refresh }
})
