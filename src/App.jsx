import { useState, useEffect } from 'react'
import {
  Container, Box, Typography, TextField, InputAdornment, Chip,
  Button, IconButton, Tooltip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import DocumentCard from './components/DocumentCard'
import DocumentPreview from './components/DocumentPreview'
import { fetchMe, fetchDocuments, gotoCenterLogin, recordView, CENTER_URL } from './utils/api'

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

export default function App() {
  const [me, setMe] = useState(null)
  const [meReady, setMeReady] = useState(false)
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState(null)

  useEffect(() => {
    fetchMe().then(setMe).catch(() => setMe(null)).finally(() => setMeReady(true))
  }, [])

  // 搜索/筛选（防抖）
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      fetchDocuments(category, q)
        .then((d) => { setItems(d.items); setCategories(d.categories) })
        .catch(() => setItems([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [category, q])

  const isVip = me?.isVip

  // 点开文档：乐观把列表里该条 viewCount +1，然后异步通知后端记一次 view（失败也不回滚）
  const handleOpenDoc = (d) => {
    setSelectedDoc({ ...d, viewCount: (d.viewCount ?? 0) + 1 })
    setItems((prev) => prev.map((x) => x.id === d.id ? { ...x, viewCount: (x.viewCount ?? 0) + 1 } : x))
    recordView(d.id)
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        background: 'radial-gradient(1100px 520px at 50% -180px, rgba(15,118,110,0.07), transparent 70%)',
        py: { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="md">
        {/* 头部：居中标题 + 副标题；用户状态绝对定位右上角 */}
        <Box sx={{ position: 'relative', mb: { xs: 2.5, md: 3.5 } }}>
          <Box sx={{ textAlign: 'center', px: { xs: 6, sm: 0 } }}>
            <Typography
              component="h1"
              sx={{ fontSize: { xs: '1.3rem', md: '1.55rem' }, fontWeight: 800, letterSpacing: '-0.012em', color: 'var(--ink)', lineHeight: 1.25 }}
            >
              安全资料库
            </Typography>
          </Box>

          {/* 用户状态：绝对定位右上 */}
          <Box sx={{ position: 'absolute', right: 0, top: 0 }}>
            {meReady && me ? (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: '#fff', border: '1px solid', borderColor: 'divider', borderRadius: 'var(--r-md)', pl: 1.5, pr: 0.5, py: 0.5, boxShadow: 'var(--shadow-sm)' }}>
                {isVip && (
                  <Chip
                    icon={<WorkspacePremiumIcon sx={{ fontSize: 14, color: 'var(--gold) !important' }} />} label="VIP" size="small"
                    sx={{ height: 22, fontSize: '0.7rem', fontWeight: 800, bgcolor: 'var(--gold-soft)', color: 'var(--gold-ink)', border: '1px solid rgba(176,138,62,0.35)' }}
                  />
                )}
                <Typography sx={{ fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 600 }}>{maskPhone(me.phone)}</Typography>
                <Tooltip title="会员中心">
                  <IconButton size="small" onClick={() => { window.location.href = CENTER_URL }} sx={{ color: 'primary.main' }}>
                    <WorkspacePremiumIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : meReady ? (
              <Button
                variant="outlined" size="small" onClick={gotoCenterLogin}
                sx={{ borderColor: 'divider', color: 'primary.main', borderRadius: 'var(--r-sm)', px: 2, py: 0.6, bgcolor: '#fff', '&:hover': { borderColor: 'primary.main', bgcolor: '#fff' } }}
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
            mb: 2,
            '& .MuiOutlinedInput-root': {
              bgcolor: '#fff', borderRadius: 'var(--r-md)', fontSize: '0.95rem',
              boxShadow: '0 8px 24px -14px rgba(15,118,110,0.18)',
              '& fieldset': { borderColor: 'divider' },
              '&:hover fieldset': { borderColor: 'var(--line-strong)' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 2 },
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
    </Box>
  )
}
