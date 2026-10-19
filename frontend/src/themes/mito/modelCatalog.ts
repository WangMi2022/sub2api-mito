import type { ModelPlazaGroup, PlazaModel } from '@/api/modelPlaza'
import type { UserPricingInterval, UserSupportedModelPricing } from '@/api/channels'
import { BILLING_MODE_IMAGE, BILLING_MODE_TOKEN, BILLING_MODE_VIDEO } from '@/constants/channel'
import { formatScaled, resolveIntervalPrices } from '@/utils/pricing'

export const CATALOG_CATEGORIES = ['language', 'embedding', 'rerank', 'image', 'video', 'audio', 'other'] as const
export type CatalogCategory = typeof CATALOG_CATEGORIES[number]

export interface CatalogEntry {
  key: string
  group: ModelPlazaGroup
  model: PlazaModel
}

export function catalogBillingMode(model: PlazaModel) {
  return model.pricing?.billing_mode || BILLING_MODE_TOKEN
}

/** Display grouping only. Unknown names remain visible instead of claiming capabilities. */
export function catalogCategory(model: PlazaModel): CatalogCategory {
  const mode = catalogBillingMode(model)
  if (mode === BILLING_MODE_IMAGE) return 'image'
  if (mode === BILLING_MODE_VIDEO) return 'video'
  const name = model.name.toLowerCase().split('/').at(-1) ?? ''
  if (/(?:^|[-_.])rerank(?:er)?(?:[-_.]|$)/.test(name)) return 'rerank'
  if (/(?:^|[-_.])embed(?:ding|dings)?(?:[-_.]|$)/.test(name) || /^(bge|e5|gte)[-_.]/.test(name)) return 'embedding'
  if (/^(whisper|tts|speech|suno)[-_.]|(?:^|[-_.])(tts|asr)(?:[-_.]|$)/.test(name)) return 'audio'
  if (/^(dall-e|imagen|cogview|flux|stable-diffusion)[-_.]/.test(name)) return 'image'
  if (/^(veo|sora|cogvideo)[-_.]/.test(name)) return 'video'
  if (/^(gpt-|chatgpt-|o[1-9](?:[-_.]|$)|claude|gemini|gemma|glm|chatglm|deepseek|kimi|moonshot|qwen|qwq|minimax|abab|llama|mistral|mixtral|codestral|ernie|doubao|grok|yi-|hunyuan)/.test(name)) return 'language'
  return 'other'
}

/** Each group/model pair is a separate offer; never merge different group prices. */
export function catalogSections(groups: ModelPlazaGroup[]) {
  const buckets = new Map<CatalogCategory, CatalogEntry[]>()
  for (const group of groups) {
    for (const model of group.models) {
      const category = catalogCategory(model)
      const entries = buckets.get(category) ?? []
      entries.push({ key: `${group.id}:${model.platform}:${model.name}`, group, model })
      buckets.set(category, entries)
    }
  }
  return CATALOG_CATEGORIES.flatMap(category => {
    const entries = buckets.get(category)
    return entries?.length ? [{ category, entries }] : []
  })
}

/** Keep the existing plaza's media overrides, including a configured zero rate. */
export function catalogRate(model: PlazaModel, group: ModelPlazaGroup): number {
  const mode = catalogBillingMode(model)
  if (mode === BILLING_MODE_VIDEO && group.video_rate_independent) return Math.max(0, group.video_rate_multiplier ?? 1)
  if (mode === BILLING_MODE_IMAGE && group.image_rate_independent) return group.image_rate_multiplier ?? 1
  return group.user_rate_multiplier ?? group.rate_multiplier
}

export type CatalogPriceRow = Pick<UserSupportedModelPricing,
  'input_price' | 'output_price' | 'cache_write_price' | 'cache_write_1h_price' | 'cache_read_price' | 'per_request_price'
> & { interval?: UserPricingInterval }

/** The API already applies the group's long-context switch. Resolve relative tiers with the shared utility. */
export function catalogPriceRows(model: PlazaModel): CatalogPriceRow[] {
  const pricing = model.pricing
  if (!pricing) return []
  const intervals = pricing.intervals ?? []
  if (catalogBillingMode(model) === BILLING_MODE_TOKEN) {
    if (intervals.length) {
      return [...intervals].sort((a, b) => a.min_tokens - b.min_tokens)
        .map(interval => ({ ...resolveIntervalPrices(interval, pricing), interval }))
    }
  } else {
    const requestIntervals = intervals.filter(interval => interval.per_request_price != null)
    if (requestIntervals.length) return requestIntervals.map(interval => ({ ...interval, interval }))
  }
  return [pricing]
}

export function catalogPrice(value: number | null | undefined, rate: number, token = true, unit = 1_000_000): string {
  return value == null ? '—' : formatScaled(value * rate, token ? unit : 1, 2)
}

/** Model family is a display label, not the gateway protocol or a capability claim. */
export function catalogVendor(model: PlazaModel): { id: string; name: string; icon: string } {
  const name = model.name.toLowerCase().split('/').at(-1) ?? ''
  const vendors: Array<[RegExp, string, string, string]> = [
    [/^deepseek/, 'deepseek', 'DeepSeek', 'deepseek'],
    [/^(glm|chatglm|cogview|cogvideo)/, 'zhipu', 'Z.ai', 'glm'],
    [/^(kimi|moonshot)/, 'moonshot', 'Moonshot', 'kimi'],
    [/^(minimax|abab)/, 'minimax', 'MiniMax', 'minimax'],
    [/^(gpt-|chatgpt-|o[1-9](?:[-_.]|$)|dall-e|whisper|tts-|sora)/, 'openai', 'OpenAI', 'gpt'],
    [/^claude/, 'anthropic', 'Anthropic', 'claude'],
    [/^(gemini|gemma|imagen|veo)/, 'google', 'Google', 'gemini'],
    [/^(qwen|qwq)/, 'qwen', 'Qwen', 'qwen'],
    [/^(llama)/, 'meta', 'Meta', 'llama'],
    [/^(mistral|mixtral|codestral)/, 'mistral', 'Mistral', 'mistral'],
    [/^grok/, 'xai', 'xAI', 'grok'],
    [/^doubao/, 'doubao', 'Doubao', 'doubao']
  ]
  const vendor = vendors.find(([pattern]) => pattern.test(name))
  return vendor ? { id: vendor[1], name: vendor[2], icon: vendor[3] } : { id: 'unknown', name: '', icon: model.name }
}

export type CatalogPriceDisplay = 'standard' | 'effective'

/** Preserve administrator tier labels and the existing inclusive-upper-bound semantics. */
export function catalogTierLabel(interval: UserPricingInterval): string {
  if (interval.tier_label) return interval.tier_label
  const count = (n: number) => n >= 1_000_000 ? `${Math.round(n / 10_000) / 100}M`
    : n >= 1_000 ? `${Math.round(n / 10) / 100}K` : String(n)
  return interval.max_tokens == null ? `>${count(interval.min_tokens)}` : `≤${count(interval.max_tokens)}`
}
