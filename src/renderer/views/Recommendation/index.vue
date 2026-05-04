<template>
  <div :class="$style.container">
    <div :class="$style.content">
      <!-- Idle state -->
      <div v-if="currentStatus === 'idle'" :class="$style.stateBox">
        <div :class="$style.form">
          <div :class="$style.formItem">
            <label :class="$style.label">{{ $t('ai_recommend__select_list') }}</label>
            <select v-model="selectedId" :class="$style.select">
              <option :value="null" disabled>{{ $t('ai_recommend__select_list') }}</option>
              <option v-for="pl in playlists" :key="pl.id" :value="pl.id">{{ pl.name }}</option>
            </select>
          </div>
          <div :class="$style.formItem">
            <base-btn :disabled="!selectedId" @click="startAnalysis">{{ $t('ai_recommend__start') }}</base-btn>
          </div>
        </div>
        <!-- 上次分析信息 -->
        <div v-if="lastTimeText" :class="$style.lastInfo">
          <p :class="$style.lastTime">上次分析：{{ lastTimeText }}</p>
          <p v-if="songChangeHint" :class="$style.changeHint">{{ songChangeHint }}</p>
        </div>
        <p v-if="lastResults.length" :class="$style.hint">
          {{ $t('ai_recommend__found_count', { found: lastSearchStats.found, total: lastSearchStats.total }) }}
        </p>
      </div>

      <!-- Loading state -->
      <div v-else-if="currentStatus === 'analyzing' || currentStatus === 'searching'" :class="$style.stateBox">
        <div :class="$style.loading">
          <div :class="$style.spinner" />
          <p :class="$style.statusText">
            {{ currentStatus === 'analyzing' ? $t('ai_recommend__analyzing') : $t('ai_recommend__searching') }}
          </p>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="currentStatus === 'error'" :class="$style.stateBox">
        <div :class="$style.error">
          <p :class="$style.errorMsg">{{ errorMsg }}</p>
          <base-btn @click="startAnalysis">{{ $t('ai_recommend__retry') }}</base-btn>
        </div>
      </div>

      <!-- Done state -->
      <div v-else-if="currentStatus === 'done'" :class="$style.results">
        <div v-if="analysis" :class="$style.analysisBox">
          <div :class="$style.analysisIcon">AI</div>
          <p :class="$style.analysisText">{{ analysis }}</p>
        </div>
        <div :class="$style.resultsHeader">
          <span :class="$style.foundInfo">{{ $t('ai_recommend__found_count', { found: stats.found, total: stats.total }) }}</span>
          <div :class="$style.resultsActions">
            <base-btn :disabled="!results.length" @click="playAll">{{ $t('ai_recommend__play_all') }}</base-btn>
            <base-btn :disabled="!results.length" @click="addAllToList">{{ $t('ai_recommend__add_all') }}</base-btn>
            <base-btn @click="backToSelect">{{ $t('ai_recommend__back') }}</base-btn>
          </div>
        </div>
        <template v-if="results.length">
          <div :class="$style.listWrap">
            <material-online-list
              ref="onlineListRef"
              :page="1"
              :limit="results.length"
              :total="results.length"
              :list="results"
              :no-item="''"
              check-api-source
              @play-list="handlePlayList"
            />
          </div>
        </template>
        <p v-else :class="$style.noFound">AI 推荐的歌曲在当前音乐源中均未找到，请尝试更换歌单或重试。</p>
        <div v-if="selectedOnlineCount" :class="$style.batchBar">
          <span :class="$style.batchInfo">已选择 {{ selectedOnlineCount }} 首</span>
          <base-btn :class="$style.batchBtn" @click="removeSelected">移除所选</base-btn>
          <base-btn :class="$style.batchBtn" @click="cancelSelect">取消选择</base-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, watch } from '@common/utils/vueTools'
import { useI18n } from '@root/lang'
import { appSetting } from '@renderer/store/setting'
import { userLists, loveList } from '@renderer/store/list/listManage'
import { getUserLists } from '@renderer/store/list/listManage/rendererListManage'
import { addListMusics, getListMusics } from '@renderer/store/list/action'
import { playList } from '@renderer/core/player/action'
import { LIST_IDS } from '@common/constants'
import { assertApiSupport } from '@renderer/store/utils'
import {
  selectedListId,
  status,
  errorMessage,
  recommendationResults,
  searchStats,
  lastAnalyzedListId,
  lastAnalyzedSongCount,
  lastAnalyzedTime,
  lastResults,
  currentSongCount,
  analysisText,
  analyzePlaylist,
} from '@renderer/store/recommendation'

interface PlaylistOption {
  id: string
  name: string
}

export default {
  name: 'Recommendation',
  setup() {
    const t = useI18n()

    // 从持久化设置中恢复上次选择的歌单 ID
    const lastId = appSetting['aiRecommend.lastListId']
    const selectedId = ref<string | null>(lastId || null)

    const playlists = computed<PlaylistOption[]>(() => {
      const list: PlaylistOption[] = [
        { id: loveList.id, name: t(loveList.name) },
      ]
      for (const ul of userLists) {
        list.push({ id: ul.id, name: ul.name })
      }
      return list
    })

    const currentStatus = computed(() => status.value)
    const errorMsg = computed(() => errorMessage.value)
    const results = computed(() => recommendationResults.value)
    const stats = computed(() => searchStats)
    const analysis = computed(() => analysisText.value)

    // 上次分析时间（可读格式）
    const lastTimeText = computed(() => {
      if (!lastAnalyzedTime.value) return ''
      const date = new Date(lastAnalyzedTime.value)
      const h = date.getHours().toString().padStart(2, '0')
      const m = date.getMinutes().toString().padStart(2, '0')
      return `${date.getMonth() + 1}/${date.getDate()} ${h}:${m}`
    })

    // 歌单是否自上次分析后有变化
    const playlistChanged = computed(() => {
      if (!lastAnalyzedTime.value) return false
      return currentSongCount.value !== lastAnalyzedSongCount.value
    })

    const songChangeHint = computed(() => {
      if (!lastAnalyzedTime.value) return ''
      if (!playlistChanged.value) return ''
      const diff = currentSongCount.value - lastAnalyzedSongCount.value
      if (diff > 0) return `歌单新增了 ${diff} 首歌曲，建议重新分析`
      return `歌单减少了 ${Math.abs(diff)} 首歌曲`
    })

    const lastSearchStats = ref({ found: 0, total: 0 })

    watch(status, (s) => {
      if (s === 'done') {
        lastSearchStats.value = { ...searchStats }
      }
    })

    const startAnalysis = async() => {
      if (!selectedId.value) return
      selectedListId.value = selectedId.value
      await analyzePlaylist(selectedId.value)
    }

    // 初始化：恢复上次的推荐结果
    void getUserLists()
    if (lastAnalyzedListId.value && lastResults.value.length) {
      selectedId.value = lastAnalyzedListId.value
      recommendationResults.value = lastResults.value
      status.value = 'done'
    } else if (lastId) {
      // 跨会话：歌单 ID 已自动选中，但结果未缓存，等待用户点击"开始分析"
      status.value = 'idle'
    }

    const handlePlayList = async(index: number) => {
      const targetSong = results.value[index]
      if (!targetSong || !assertApiSupport(targetSong.source)) return
      const defaultListMusics = await getListMusics(LIST_IDS.DEFAULT)
      await addListMusics(LIST_IDS.DEFAULT, [targetSong])
      const targetIndex = defaultListMusics.findIndex(s => s.id === targetSong.id)
      if (targetIndex > -1) playList(LIST_IDS.DEFAULT, targetIndex)
    }

    const addAllToList = async() => {
      if (!results.value.length) return
      try {
        await addListMusics('default', results.value.slice())
      } catch (err) {
        console.error('Failed to add songs to list:', err)
      }
    }

    const backToSelect = () => {
      status.value = 'idle'
    }

    const playAll = async() => {
      if (!results.value.length) return
      try {
        await addListMusics(LIST_IDS.DEFAULT, results.value.slice())
        playList(LIST_IDS.DEFAULT, 0)
      } catch (err) {
        console.error('Failed to play all:', err)
      }
    }

    // 批量操作：通过 ref 访问 material-online-list 内部的 selectedList
    const onlineListRef = ref<any>(null)
    const selectedOnlineCount = computed(() => {
      return onlineListRef.value?.selectedList?.length || 0
    })
    const removeSelected = () => {
      const selected = onlineListRef.value?.selectedList
      if (!selected?.length) return
      const ids = new Set(selected.map((s: LX.Music.MusicInfo) => s.id))
      recommendationResults.value = recommendationResults.value.filter(s => !ids.has(s.id))
      onlineListRef.value.removeAllSelect?.()
    }
    const cancelSelect = () => {
      onlineListRef.value?.removeAllSelect?.()
    }

    return {
      selectedId,
      playlists,
      currentStatus,
      errorMsg,
      results,
      stats,
      analysis,
      lastResults,
      lastSearchStats,
      lastTimeText,
      playlistChanged,
      songChangeHint,
      startAnalysis,
      handlePlayList,
      addAllToList,
      backToSelect,
      playAll,
      onlineListRef,
      selectedOnlineCount,
      removeSelected,
      cancelSelect,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  padding: 15px;
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
}

.content {
  max-width: 900px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.stateBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.formItem {
  display: flex;
  align-items: center;
  gap: 10px;
}

.label {
  font-size: 14px;
  color: var(--color-font);
  white-space: nowrap;
}

.select {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid var(--color-button-border);
  background: var(--color-button-background);
  color: var(--color-font);
  font-size: 14px;
  cursor: pointer;
  min-width: 200px;
  outline: none;

  &:focus {
    border-color: var(--color-primary);
  }
}

.hint {
  margin-top: 20px;
  font-size: 13px;
  color: var(--color-font-label);
}

.lastInfo {
  margin-top: 20px;
  padding: 10px 16px;
  border-radius: 6px;
  background: var(--color-primary-light-400-alpha-200);
  text-align: center;
}

.lastTime {
  margin: 0;
  font-size: 12px;
  color: var(--color-font-label);
}

.changeHint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-primary);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-primary-light-400-alpha-700);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.statusText {
  font-size: 15px;
  color: var(--color-font);
}

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.errorMsg {
  font-size: 14px;
  color: var(--color-red);
  text-align: center;
}

.results {
  display: flex;
  flex-direction: column;
  flex: auto;
  min-height: 0;
}

.analysisBox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 15px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: var(--color-primary-light-400-alpha-300);
  border-left: 3px solid var(--color-primary);
  flex: none;
}

.analysisIcon {
  flex: none;
  width: 28px;
  height: 28px;
  line-height: 28px;
  text-align: center;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 11px;
  font-weight: bold;
}

.analysisText {
  flex: auto;
  margin: 0;
  font-size: 13px;
  color: var(--color-font);
  line-height: 1.5;
}

.resultsHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 15px;
  flex: none;
}

.foundInfo {
  font-size: 14px;
  color: var(--color-font);
}

.resultsActions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.listWrap {
  flex: auto;
  min-height: 0;
}

.noFound {
  text-align: center;
  font-size: 14px;
  color: var(--color-font-label);
  padding: 40px 0;
}

.batchBar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: var(--color-primary);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  z-index: 100;
}

.batchInfo {
  font-size: 13px;
  color: #fff;
  white-space: nowrap;
}

.batchBtn {
  font-size: 12px;
  padding: 4px 12px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  color: #fff;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
}
</style>
