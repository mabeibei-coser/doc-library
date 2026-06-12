import { useState, useEffect } from 'react'
import {
  Container, Box, Typography, TextField, InputAdornment,
  Button, Chip, IconButton, Tooltip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import DocumentCard from './components/DocumentCard'
import DocumentPreview from './components/DocumentPreview'
import BottomNav from './components/BottomNav'
import { fetchMe, fetchDocuments, gotoCenterLogin, recordView, centerUrlFor } from './utils/api'

// 手机号打码：保留前 3 位、后 2 位，中间全部打码 → 18621933756 → 186******56
const maskPhone = (p) => {
  if (!p) return p
  const s = String(p)
  if (s.length <= 5) return s
  return `${s.slice(0, 3)}${'*'.repeat(s.length - 5)}${s.slice(-2)}`
}

// 骨架行：匹配文档横条布局的占位 + 流光，替代通用转圈
function DocSkeleton() {
  const shimmer = {
    position: 'relative', overflow: 'hidden', bgcolor: 'var(--bg-mute)',
    '&::after': {
      content: '""', position: 'absolute', inset: 0,
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)',
      transform: 'translateX(-100%)', animation: 'docShimmer 1.4s infinite',
    },
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, px: { xs: 1.75, sm: 2.25 }, py: { xs: 1.5, sm: 1.75 } }}>
      <Box sx={{ ...shimmer, width: 46, height: 46, borderRadius: '12px', flexShrink: 0 }} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ ...shimmer, width: '52%', height: 13, borderRadius: '6px' }} />
        <Box sx={{ ...shimmer, width: '38%', height: 10, borderRadius: '6px' }} />
      </Box>
    </Box>
  )
}

// 列表外壳：白底圆角 + 细描边 + 柔和投影，行与行之间用细分隔线，整体无空隙（仿网盘紧凑列表）
const listSurfaceSx = {
  bgcolor: '#fff',
  borderRadius: 'var(--r-lg)',
  border: '1px solid',
  borderColor: 'divider',
  overflow: 'hidden',
  boxShadow: '0 10px 30px -18px rgba(15, 118, 110, 0.16)',
}

// URL 里的 ?category= 决定当前用户应看到哪一域文档；没传由后端按 cookie 兜底（见 server.js /api/documents）。
// 入口：ASG100 / ATA100 各自首页跳过来时会显式带参数；老链接 / 收藏的裸 URL 走 cookie 兜底。
const URL_CATEGORY = (() => {
  try { return new URLSearchParams(window.location.search).get('category') || '' } catch { return '' }
})()

// 当前域 → 标题：ATA 用户看到「岗位全景」，其余（含 ASG / 未识别）看到「安全资料库」。
const titleForCategory = (cat) => cat === '人才ATA' ? '岗位全景' : '安全资料库'

export default function App() {
  const [me, setMe] = useState(null)
  const [meReady, setMeReady] = useState(false)
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState(null)
  // 实际生效的域：URL 显式传了就用 URL 的；否则用后端返回的（按 cookie 推断的结果），后端给出前先用 URL 值占位
  const [activeCategory, setActiveCategory] = useState(URL_CATEGORY)

  useEffect(() => {
    fetchMe().then(setMe).catch(() => setMe(null)).finally(() => setMeReady(true))
  }, [])

  // 浏览器 tab 标题跟随域切换，避免 ATA 用户看到"安防文档库"违和
  useEffect(() => {
    document.title = titleForCategory(activeCategory)
  }, [activeCategory])

  // 搜索（防抖）
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      fetchDocuments(URL_CATEGORY, q)
        .then((d) => {
          setItems(d.items)
          // 后端回的 category 是"实际生效的域"（兜底之后的结果）→ 同步给标题用
          if (d.category) setActiveCategory(d.category)
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  const isVip = me?.isVip

  // 点开文档：乐观把列表里该条 viewCount +1，然后异步通知后端记一次 view（失败也不回滚）
  const handleOpenDoc = (d) => {
    setSelectedDoc({ ...d, viewCount: (d.viewCount ?? 0) + 1 })
    setItems((prev) => prev.map((x) => x.id === d.id ? { ...x, viewCount: (x.viewCount ?? 0) + 1 } : x))
    recordView(d.id)
  }

  // 悬浮底部导航：首页 = 回本应用首页（清搜索 + 清分类 + 回到顶部）；记录 = 会员中心识别历史；我的 = 去会员中心
  const goHome = () => {
    setQ('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  // 回中心按当前域路由：activeCategory 优先用 URL 显式值，裸 URL 进来时被后端按 cookie 兜底纠正
  const goHistory = () => { window.location.href = `${centerUrlFor(activeCategory)}?view=history` }
  const goMine = () => { window.location.href = centerUrlFor(activeCategory) }
  const goCenterHome = () => { window.location.href = centerUrlFor(activeCategory) }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        background: 'radial-gradient(1100px 520px at 50% -180px, rgba(15,118,110,0.07), transparent 70%)',
        pt: { xs: 3, md: 5 },
        pb: { xs: 11, md: 12 }, // 给悬浮底部导航留位置
      }}
    >
      <Container maxWidth="md">
        {/* 头部：标题左 + 用户状态条右（VIP chip + 手机号），同一行；space-between 撑开保证标题不被 VIP 遮挡 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, minHeight: 32, mb: { xs: 2.5, md: 3.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <IconButton
              aria-label="返回首页"
              size="small"
              onClick={goCenterHome}
              sx={{
                ml: -1,
                mr: 0.25,
                p: 0.35,
                color: 'var(--ink-2)',
                '&:hover': { color: 'var(--accent)', bgcolor: 'transparent' },
              }}
            >
              <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Typography
              component="h1"
              sx={{ fontSize: { xs: '1.3rem', md: '1.55rem' }, fontWeight: 800, letterSpacing: '-0.012em', color: 'var(--ink)', lineHeight: 1.25 }}
            >
              {titleForCategory(activeCategory)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
            {meReady && me ? (
              <>
                {isVip && (
                  <Chip
                    icon={<WorkspacePremiumIcon sx={{ fontSize: 14, color: 'var(--gold) !important' }} />}
                    label="VIP" size="small"
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: 'var(--gold-soft)', color: 'var(--gold-ink)' }}
                  />
                )}
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  {maskPhone(me.phone)}
                </Typography>
                {!isVip && (
                  <Tooltip title="会员中心">
                    <IconButton size="small" onClick={() => { window.location.href = centerUrlFor(activeCategory) }} sx={{ color: 'var(--ink-3)', p: 0.5 }}>
                      <WorkspacePremiumIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            ) : meReady ? (
              <Button
                variant="outlined" size="small" onClick={gotoCenterLogin}
                startIcon={<WorkspacePremiumIcon sx={{ fontSize: 16, color: 'var(--success)' }} />}
                sx={{
                  borderColor: 'rgba(47,133,89,0.30)', color: 'var(--success-ink)',
                  borderRadius: 'var(--r-md)', px: 1.5, py: 0.5, bgcolor: 'var(--success-soft)',
                  '&:hover': { borderColor: 'var(--success)', bgcolor: '#d6ebdd' },
                }}
              >
                登录
              </Button>
            ) : null}
          </Box>
        </Box>

        {/* 搜索 */}
        <TextField
          fullWidth placeholder="搜索文档标题、说明或分类"
          value={q} onChange={(e) => setQ(e.target.value)}
          sx={{
            mb: { xs: 1.5, md: 2 },
            '& .MuiOutlinedInput-root': {
              bgcolor: '#fff', borderRadius: 'var(--r-md)', fontSize: '0.95rem',
              boxShadow: '0 8px 24px -14px rgba(15,118,110,0.18)',
              '& fieldset': { borderColor: 'divider' },
              '&:hover fieldset': { borderColor: 'var(--line-strong)' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 2 },
            },
            '& .MuiInputBase-input': {
              bgcolor: 'transparent',
              borderRadius: 0,
              boxShadow: 'none',
              outline: 'none',
            },
            '& .MuiInputBase-input:focus, & .MuiInputBase-input:focus-visible': {
              bgcolor: 'transparent',
              boxShadow: 'none',
              outline: 'none',
            },
          }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'var(--ink-3)' }} /></InputAdornment> } }}
        />

        {/* 文档列表 / 骨架 / 空状态 */}
        {loading ? (
          <Box sx={listSurfaceSx}>
            {[0, 1, 2, 3].map((i) => (
              <Box key={i} sx={{ borderTop: i === 0 ? 'none' : '1px solid', borderColor: 'var(--line)' }}>
                <DocSkeleton />
              </Box>
            ))}
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: { xs: 6, md: 9 } }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: 'var(--accent-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <FolderOpenOutlinedIcon sx={{ fontSize: 34, color: 'primary.main' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: 'var(--ink)', mb: 0.5 }}>没有找到匹配的文档</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>换个关键词，或点上方「全部」看看所有文档</Typography>
          </Box>
        ) : (
          <Box sx={listSurfaceSx}>
            {items.map((doc, i) => (
              <Box
                key={doc.id}
                sx={{
                  borderTop: i === 0 ? 'none' : '1px solid',
                  borderColor: 'var(--line)',
                  animation: 'docFadeUp .5s cubic-bezier(0.16,1,0.3,1) both',
                  animationDelay: `${Math.min(i, 8) * 55}ms`,
                }}
              >
                <DocumentCard doc={doc} onOpen={handleOpenDoc} />
              </Box>
            ))}
          </Box>
        )}
      </Container>

      {/* 文档预览界面 */}
      <DocumentPreview
        doc={selectedDoc}
        open={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        isVip={isVip}
      />

      <BottomNav onHome={goHome} onHistory={goHistory} onMine={goMine} />
    </Box>
  )
}
