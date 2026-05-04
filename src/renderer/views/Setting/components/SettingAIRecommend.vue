<template lang="pug">
dt#ai_recommend {{ $t('setting__ai_recommend') }}
dd
  h3#ai_recommend_enable {{ $t('setting__ai_recommend_enable') }}
  div
    .p
      base-checkbox(id="setting_ai_enable" :model-value="appSetting['aiRecommend.enable']" :label="$t('setting__is_enable')" @update:model-value="updateSetting({'aiRecommend.enable': $event})")
    .p(v-if="appSetting['aiRecommend.enable']")
      span.tip {{ $t('setting__ai_recommend_enable_tip') }}
dd(v-if="appSetting['aiRecommend.enable']")
  h3#ai_recommend_provider {{ $t('setting__ai_recommend_provider') }}
  div
    .p(v-for="p in providers" :key="p.id")
      base-checkbox(:id="'setting_ai_provider_' + p.id" :model-value="appSetting['aiRecommend.provider']" :value="p.id" :label="p.label" :need="true" @update:model-value="updateSetting({'aiRecommend.provider': $event})")
dd(v-if="appSetting['aiRecommend.enable']")
  h3#ai_recommend_api_key {{ $t('setting__ai_recommend_api_key') }}
  div
    .p
      base-input(:model-value="appSetting['aiRecommend.apiKey']" type="password" :placeholder="$t('setting__ai_recommend_api_key')" @update:model-value="setApiKey")
    .p
      span.tip {{ $t('setting__ai_recommend_api_key_tip') }}
dd(v-if="appSetting['aiRecommend.enable']")
  h3#ai_recommend_api_host {{ $t('setting__ai_recommend_api_host') }}
  div
    .p
      base-input(:model-value="appSetting['aiRecommend.apiHost']" :placeholder="$t('setting__ai_recommend_api_host_tip')" @update:model-value="setApiHost")
dd(v-if="appSetting['aiRecommend.enable']")
  h3#ai_recommend_model {{ $t('setting__ai_recommend_model') }}
  div
    .p
      base-input(:model-value="appSetting['aiRecommend.model']" :placeholder="$t('setting__ai_recommend_model_tip')" @update:model-value="setModel")
dd(v-if="appSetting['aiRecommend.enable']")
  h3#ai_recommend_params {{ $t('setting__ai_recommend_params') }}
  div
    .p
      | {{ $t('setting__ai_recommend_max_tokens') }}
    .p
      base-selection(:model-value="appSetting['aiRecommend.maxTokens']" :list="maxTokensOptions" item-key="id" item-name="label" @update:model-value="updateSetting({'aiRecommend.maxTokens': $event})")
    .p
      | {{ $t('setting__ai_recommend_temperature') }}
    .p
      base-selection(:model-value="appSetting['aiRecommend.temperature']" :list="temperatureOptions" item-key="id" item-name="label" @update:model-value="updateSetting({'aiRecommend.temperature': $event})")
    .p
      | {{ $t('setting__ai_recommend_count') }}
    .p
      base-selection(:model-value="appSetting['aiRecommend.recommendCount']" :list="countOptions" item-key="id" item-name="label" @update:model-value="updateSetting({'aiRecommend.recommendCount': $event})")
dd(v-if="appSetting['aiRecommend.enable']")
  h3#ai_recommend_custom_prompt {{ $t('setting__ai_recommend_custom_prompt') }}
  div
    .p
      textarea(:value="appSetting['aiRecommend.customPrompt']" :placeholder="$t('setting__ai_recommend_custom_prompt_tip')" style="width: 100%; min-height: 120px; padding: 8px; border-radius: 4px; border: 1px solid var(--color-button-border); background: var(--color-button-background); color: var(--color-font); font-size: 12px; resize: vertical; outline: none;" @input="setCustomPrompt($event.target.value)")
    .p
      span.tip {{ $t('setting__ai_recommend_custom_prompt_tip') }}
dd(v-if="appSetting['aiRecommend.enable']")
  div
    span.tip(style="color: var(--color-red); font-size: 12px;") ⚠ {{ $t('setting__ai_recommend_cost_warning') }}
</template>

<script>
import { debounce } from '@common/utils'
import { appSetting, updateSetting } from '@renderer/store/setting'

export default {
  name: 'SettingAIRecommend',
  setup() {
    const setApiKey = debounce(key => {
      updateSetting({ 'aiRecommend.apiKey': key.trim() })
    }, 500)
    const setApiHost = debounce(host => {
      updateSetting({ 'aiRecommend.apiHost': host.trim() })
    }, 500)
    const setModel = debounce(model => {
      updateSetting({ 'aiRecommend.model': model.trim() })
    }, 500)
    const setCustomPrompt = debounce(val => {
      updateSetting({ 'aiRecommend.customPrompt': val })
    }, 500)

    const providers = [
      { id: 'openai', label: 'OpenAI (兼容接口)' },
      { id: 'anthropic', label: 'Anthropic' },
      { id: 'custom', label: window.i18n ? window.i18n.t('setting__ai_recommend_api_host') : 'Custom' },
    ]

    const maxTokensOptions = [
      { id: 1024, label: '1024' },
      { id: 2048, label: '2048' },
      { id: 4096, label: '4096' },
      { id: 8192, label: '8192' },
    ]

    const temperatureOptions = [
      { id: 0.1, label: '0.1' },
      { id: 0.3, label: '0.3' },
      { id: 0.5, label: '0.5' },
      { id: 0.7, label: '0.7' },
      { id: 0.9, label: '0.9' },
      { id: 1.0, label: '1.0' },
      { id: 1.2, label: '1.2' },
    ]

    const countOptions = [
      { id: 5, label: '5' },
      { id: 10, label: '10' },
      { id: 15, label: '15' },
      { id: 20, label: '20' },
      { id: 30, label: '30' },
      { id: 50, label: '50' },
    ]

    return {
      appSetting,
      updateSetting,
      setApiKey,
      setApiHost,
      setModel,
      setCustomPrompt,
      providers,
      maxTokensOptions,
      temperatureOptions,
      countOptions,
    }
  },
}
</script>
