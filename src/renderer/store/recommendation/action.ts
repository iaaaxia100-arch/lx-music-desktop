import { appSetting } from '@renderer/store/setting'
import { httpFetch } from '@renderer/utils/request'
import music from '@renderer/utils/musicSdk'
import { similar } from '@common/utils/common'
import { toNewMusicInfo } from '@common/utils/tools'
import { markRaw } from '@common/utils/vueTools'
import {
  status,
  errorMessage,
  rawRecommendations,
  recommendationResults,
  searchStats,
  lastAnalyzedListId,
  lastAnalyzedSongCount,
  lastAnalyzedTime,
  lastResults,
  currentSongCount,
  analysisText,
} from './state'
import { updateSetting } from '@renderer/store/setting'
import { getListMusics } from '@renderer/store/list/listManage/rendererListManage'

const MAX_SAMPLE_SONGS = 50

function buildPrompt(songs: Array<{ name: string; singer: string; album?: string }>): string {
  const songListText = songs
    .map((s, i) => `${i + 1}. ${s.name} - ${s.singer}${s.album ? ` (${s.album})` : ''}`)
    .join('\n')
  const count = Math.max(5, Math.min(appSetting['aiRecommend.recommendCount'], 50))

  // 从歌单提取歌手分布信息，帮助模型理解偏好
  const singerSet = new Set(songs.map(s => s.singer))
  const topSingers = [...singerSet].slice(0, 10)
  const singerHint = topSingers.length > 0
    ? `\n用户最常听的歌手包括：${topSingers.join('、')}`
    : ''

  // 自定义 Prompt
  const customPrompt = appSetting['aiRecommend.customPrompt']
  if (customPrompt) {
    return customPrompt
      .replace(/\{songList\}/g, songListText)
      .replace(/\{singerHint\}/g, singerHint)
      .replace(/\{count\}/g, String(count))
      .replace(/\{totalSongs\}/g, String(songs.length))
  }

  return `你是一个资深的音乐推荐专家，精通全球各类音乐的风格、流派和文化背景。现在有一个用户的私人歌单，请分析这些歌曲，挖掘用户的音乐品味，并推荐他们可能喜欢的新歌。

## 用户歌单（共 ${songs.length} 首歌曲）

${songListText}${singerHint}

## 分析要求

请从以下维度分析用户的音乐品味：
1. **核心风格**：主要的音乐流派和曲风（如流行、摇滚、R&B、电子、民谣、嘻哈等）
2. **语种偏好**：用户偏爱哪些语言的歌曲
3. **年代分布**：歌曲集中在哪个年代
4. **情绪基调**：歌单传达的普遍情绪（欢快/深沉/温暖/忧郁等）
5. **独特偏好**：是否有小众、独立音乐人，或特定地区/文化的音乐倾向

## 推荐要求

基于以上分析，请推荐 ${count} 首歌曲。每首歌必须遵循以下规则：
- **绝对不能推荐用户歌单中已有的歌曲**
- 优先推荐风格相似但不同的歌曲（约 70%）
- 适量拓展到相邻风格领域，帮用户发现新音乐（约 30%）
- 推荐的歌曲必须是真实存在且有一定知名度的
- 兼顾经典作品和相对小众的佳作
- 推荐的歌手尽量避免与歌单已有歌手重复，除非是不同风格的歌曲

## 输出格式

严格返回如下 JSON，不要包含任何其他文字或代码块标记：

{
  "analysis": {
    "coreGenres": ["流行", "R&B"],
    "languagePreference": "中文为主",
    "eraRange": "2015-2024",
    "mood": "温暖治愈",
    "summary": "用户偏好温暖治愈的华语流行和R&B，以近十年的作品为主"
  },
  "recommendations": [
    {
      "name": "歌曲名",
      "singer": "歌手名",
      "reason": "一句话说明为什么推荐这首歌"
    }
  ]
}`
}

function getApiEndpoint(): string {
  const provider = appSetting['aiRecommend.provider']
  const customHost = appSetting['aiRecommend.apiHost']

  if (customHost) return customHost
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1/messages'
  return 'https://api.openai.com/v1/chat/completions'
}

interface LLMRecommendation {
  name: string
  singer: string
  reason?: string
}

interface LLMResponse {
  analysis: {
    coreGenres?: string[]
    languagePreference?: string
    eraRange?: string
    mood?: string
    summary?: string
  } | string
  recommendations: LLMRecommendation[]
}

function extractJSON(text: string): LLMResponse {
  // 尝试多种策略从 LLM 回复中提取 JSON

  // 策略1: 匹配 ```json ... ``` 代码块
  let jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1].trim()) } catch { /* continue */ }
  }

  // 策略2: 匹配 ``` ... ``` 任意代码块
  jsonMatch = text.match(/```\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1].trim()) } catch { /* continue */ }
  }

  // 策略3: 查找最外层的 { ... } 对
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1))
    } catch { /* continue */ }
  }

  // 策略4: 直接尝试解析全文
  return JSON.parse(text.trim())
}

async function callLLMAPI(prompt: string): Promise<LLMResponse> {
  const apiKey = appSetting['aiRecommend.apiKey']
  const provider = appSetting['aiRecommend.provider']
  const model = appSetting['aiRecommend.model']
  const maxTokens = appSetting['aiRecommend.maxTokens']
  const temperature = appSetting['aiRecommend.temperature']

  if (!apiKey) throw new Error('No API key configured')

  if (provider === 'anthropic') {
    // httpFetch 返回类型缺少 promise 属性声明，使用 any 类型绕过
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestObj: any = httpFetch(getApiEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
      timeout: 120000,
    })
    const resp = await requestObj.promise
    if (resp?.body?.content?.[0]?.text) return safeExtractJSON(resp.body.content[0].text)
    if (resp?.body?.error?.message) throw new Error(resp.body.error.message)
    throw new Error(`API returned status ${resp?.statusCode || 'unknown'} body=${safeStringify(resp?.body)}`)
  }

  // OpenAI-compatible API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestObj: any = httpFetch(getApiEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: 'system', content: '你是一个专业的音乐推荐助手。请始终以JSON格式回复。' },
        { role: 'user', content: prompt },
      ],
    }),
    timeout: 120000,
  })
  const resp = await requestObj.promise
  if (resp?.body?.choices?.[0]?.message?.content) return safeExtractJSON(resp.body.choices[0].message.content)
  if (resp?.body?.error?.message) throw new Error(resp.body.error.message)
  throw new Error(`API returned status ${resp?.statusCode || 'unknown'} body=${safeStringify(resp?.body)}`)
}

function safeStringify(obj: any, maxLen = 200): string {
  try {
    return JSON.stringify(obj).substring(0, maxLen)
  } catch {
    return `[object type=${typeof obj}, keys=${Object.keys(obj || {}).slice(0, 10).join(', ')}]`
  }
}

function safeExtractJSON(text: string): LLMResponse {
  try {
    return extractJSON(text)
  } catch (err: any) {
    // 显示 LLM 返回的原始内容（前 500 字符）帮助排查问题
    const preview = text.trim().substring(0, 500)
    throw new Error(`JSON parse failed: ${err.message}\n\nLLM response preview:\n${preview}`)
  }
}

async function searchOneSong(name: string, singer: string): Promise<LX.Music.MusicInfo | null> {
  const query = `${name} ${singer}`
  const sources = ['kw', 'kg', 'tx', 'wy', 'mg'] as LX.OnlineSource[]

  const tasks = sources.map(async (source) => {
    try {
      const result = await music[source]?.musicSearch.search(query, 1, 10)
      if (result && result.list && result.list.length > 0) {
        return result.list
      }
    } catch {
      // skip failed source
    }
    return []
  })

  const sourceResults = await Promise.all(tasks)
  // 合并所有来源的结果，并转换为新版格式
  const allResults = sourceResults.flat().map((s: any) => toNewMusicInfo(s))

  if (allResults.length === 0) return null

  // 计算每首歌的匹配度分数
  // 歌名相似度权重 0.6 + 歌手相似度权重 0.4
  const scored = allResults.map((song: LX.Music.MusicInfo) => {
    const nameScore = similar(name, song.name)
    const singerScore = similar(singer, song.singer)
    return {
      song,
      score: nameScore * 0.6 + singerScore * 0.4,
    }
  })

  // 按分数降序排列，取最佳匹配
  scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score)

  // 分数阈值：小于 0.3 认为不是同一首歌
  if (scored[0].score < 0.3) return null

  return scored[0].song
}

export async function analyzePlaylist(listId: string): Promise<void> {
  status.value = 'analyzing'
  errorMessage.value = ''

  try {
    // 1. Get songs from playlist
    const songs = await getListMusics(listId)
    if (!songs || songs.length === 0) {
      throw new Error('Playlist is empty')
    }

    // 2. Sample songs to control token usage
    const sampled = songs.slice(0, MAX_SAMPLE_SONGS).map(s => ({
      name: s.name,
      singer: s.singer,
      album: s.meta?.albumName,
    }))

    // 3. Build prompt and call LLM
    const prompt = buildPrompt(sampled)
    const result = await callLLMAPI(prompt)

    rawRecommendations.value = result.recommendations
    // Format analysis as readable text
    if (typeof result.analysis === 'object') {
      const a = result.analysis
      const parts: string[] = []
      if (a.summary) parts.push(a.summary)
      if (a.coreGenres?.length) parts.push(`风格: ${a.coreGenres.join('、')}`)
      if (a.mood) parts.push(`情绪: ${a.mood}`)
      analysisText.value = parts.join(' | ')
    } else {
      analysisText.value = result.analysis || ''
    }
    status.value = 'searching'

    // 4. Search each recommendation across music sources
    const searchResults: LX.Music.MusicInfo[] = []
    const seen = new Set<string>()
    let found = 0

    for (const rec of result.recommendations) {
      try {
        const musicInfo = await searchOneSong(rec.name, rec.singer)
        if (musicInfo) {
          // 去重：同一首歌不同平台只保留最优匹配
          const dedupKey = `${musicInfo.name}|${musicInfo.singer}`
          if (!seen.has(dedupKey)) {
            seen.add(dedupKey)
            searchResults.push(markRaw(musicInfo) as unknown as LX.Music.MusicInfo)
            found++
          }
        }
      } catch {
        // skip individual search failures
      }
    }

    recommendationResults.value = searchResults
    searchStats.found = found
    searchStats.total = result.recommendations.length
    lastAnalyzedListId.value = listId
    lastAnalyzedSongCount.value = songs.length
    lastAnalyzedTime.value = Date.now()
    currentSongCount.value = songs.length
    lastResults.value = searchResults
    // 持久化上次选择的歌单 ID
    updateSetting({ 'aiRecommend.lastListId': listId })
    status.value = 'done'

  } catch (err: any) {
    status.value = 'error'
    const msg = err.message || String(err)
    console.error('[AI Recommend] Error:', msg, err)
    if (msg === 'No API key configured') {
      errorMessage.value = window.i18n.t('ai_recommend__no_api_key')
    } else if (msg === 'Playlist is empty') {
      errorMessage.value = window.i18n.t('ai_recommend__no_songs')
    } else if (msg.includes('JSON') || msg.includes('SyntaxError') || err.name === 'SyntaxError') {
      errorMessage.value = window.i18n.t('ai_recommend__error_parse')
    } else {
      errorMessage.value = msg
    }
  }
}
