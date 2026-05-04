import { ref, reactive } from '@common/utils/vueTools'

export const selectedListId = ref<string | null>(null)

export type AnalysisStatus = 'idle' | 'analyzing' | 'searching' | 'done' | 'error'
export const status = ref<AnalysisStatus>('idle')

export const errorMessage = ref('')

export const rawRecommendations = ref<Array<{ name: string; singer: string; reason?: string }>>([])

export const recommendationResults = ref<LX.Music.MusicInfo[]>([])

export const searchStats = reactive({
  found: 0,
  total: 0,
})

export const lastAnalyzedListId = ref<string | null>(null)
export const lastAnalyzedSongCount = ref(0)
export const lastAnalyzedTime = ref(0)
export const lastResults = ref<LX.Music.MusicInfo[]>([])

export const currentSongCount = ref(0)

export const analysisText = ref('')
