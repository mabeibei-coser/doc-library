import { useState, useEffect } from 'react'
import {
  Container, Box, Typography, TextField, InputAdornment, Chip,
  Snackbar, Alert, Button, IconButton, Tooltip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import DocumentCard from './components/DocumentCard'
import DocumentPreview from './components/DocumentPreview'
import { fetchMe, fetchDocuments, gotoCenterLogin, CENTER_URL } from './utils/api'

// 骨架行：匹配文档横条布局的占位 + 流光，替代通用转圈
function DocSkeleton() {
  const shimmer = {
    position: 'relative', overflow: 'hidden', bgcolor: '#eef2f7',
    '&::after': {
      content: '""', position: 'absolute', inset: 0,
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)',
      transform: 'translateX(-100%)', animation: 'docShimmer 1.4s infinite',
    },
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: { xs: 1.75, sm: 2.25 }, bgcolor: '#fff', borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ ...shimmer, width: 50, height: 50, borderRadius: '14px', flexShrink: 0 }} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ ...shimmer, width: '52%', height: 13, borderRadius: '6px' }} />
        <Box sx={{ ...shimmer, width: '78%', height: 10, borderRadius: '6px' }} />
      </Box>
      <Box sx={{ ...shimmer, width: 120, height: 40, borderRadius: '12px', flexShrink: 0, display: { xs: 'none', sm: 'block' } }} />
    </Box>
  )
}

export default function App() {
  const [me, setMe] = useState(null)
  const [meReady, setMeReady] = useState(false)
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [vipSnack, setVipSnack] = useState(false)
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

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        background: 'radial-gradient(1100px 520px at 50% -180px, rgba(37,99,235,0.08), transparent 70%), #f6f8fc',
        py: { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="md">
        {/* 头部：左对齐 hero（eyebrow + 标题 + 副标题），用户状态浮右 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: { xs: 2.5, md: 3.5 } }}>
          <Box>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, mb: 1.5, borderRadius: '999px', bgcolor: 'rgba(37,99,235,0.08)', color: 'primary.dark' }}>
              <ShieldOutlinedIcon sx={{ fontSize: 15 }} />
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.01em' }}>安全隐患域 · 文档中心</Typography>
            </Box>
            <Typography
              component="h1"
              sx={{ fontSize: { xs: '1.95rem', md: '2.5rem' }, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a', lineHeight: 1.1 }}
            >
              安防文档库
            </Typography>
            <Typography sx={{ mt: 1.25, color: 'text.secondary', fontSize: { xs: '0.9rem', md: '1rem' }, maxWidth: 480, lineHeight: 1.6 }}>
              安全规范、应急预案、检查表模板，一处取齐。免费文档登录即下，VIP 解锁全部。
            </Typography>
          </Box>

          {/* 用户状态 */}
          <Box sx={{ flexShrink: 0 }}>
            {meReady && me ? (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: '#fff', border: '1px solid', borderColor: 'divider', borderRadius: '999px', pl: 1.5, pr: 0.5, py: 0.5, boxShadow: '0 6px 18px -10px rgba(15,23,42,0.25)' }}>
                {isVip && (
                  <Chip
                    icon={<WorkspacePremiumIcon sx={{ fontSize: 14, color: '#d97706 !important' }} />} label="VIP" size="small"
                    sx={{ height: 22, fontSize: '0.7rem', fontWeight: 800, bgcolor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}
                  />
                )}
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 600 }}>{me.phone}</Typography>
                <Tooltip title="会员中心">
                  <IconButton size="small" onClick={() => { window.location.href = CENTER_URL }} sx={{ color: 'primary.main' }}>
                    <WorkspacePremiumIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : meReady ? (
              <Button
                variant="outlined" size="small" onClick={gotoCenterLogin}
                sx={{ borderColor: 'divider', color: 'primary.main', borderRadius: '999px', px: 2, py: 0.6, bgcolor: '#fff', '&:hover': { borderColor: 'primary.main', bgcolor: '#fff' } }}
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
              bgcolor: '#fff', borderRadius: '16px', fontSize: '0.95rem',
              boxShadow: '0 8px 24px -14px rgba(15,23,42,0.2)',
              '& fieldset': { borderColor: 'divider' },
              '&:hover fieldset': { borderColor: '#cbd5e1' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 2 },
            },
          }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94a3b8' }} /></InputAdornment> } }}
        />

        {/* 分类筛选 */}
        {categories.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {['', ...categories].map((c) => {
              const active = category === c
              return (
                <Chip
                  key={c || '__all__'} label={c || '全部'} onClick={() => setCategory(c)}
                  sx={{
                    height: 34, px: 0.5, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                    border: '1px solid',
                    transition: 'all .2s cubic-bezier(0.16,1,0.3,1)',
                    ...(active
                      ? { bgcolor: 'primary.main', color: '#fff', borderColor: 'primary.main', boxShadow: '0 6px 16px -8px rgba(37,99,235,0.6)' }
                      : { bgcolor: '#fff', color: 'text.secondary', borderColor: 'divider', '&:hover': { borderColor: '#cbd5e1', transform: 'translateY(-1px)' } }),
                  }}
                />
              )
            })}
          </Box>
        )}

        {/* 文档列表 / 骨架 / 空状态 */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[0, 1, 2, 3].map((i) => <DocSkeleton key={i} />)}
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: { xs: 6, md: 9 } }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: 'rgba(37,99,235,0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <FolderOpenOutlinedIcon sx={{ fontSize: 34, color: 'primary.main' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>没有找到匹配的文档</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>换个关键词，或点上方「全部」看看所有文档</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {items.map((doc, i) => (
              <Box
                key={doc.id}
                sx={{ animation: 'docFadeUp .5s cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${Math.min(i, 8) * 55}ms` }}
              >
                <DocumentCard
                  doc={doc} isVip={isVip}
                  onOpen={(d) => setSelectedDoc(d)}
                  onNeedVip={() => setVipSnack(true)}
                />
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

      <Snackbar
        open={vipSnack} autoHideDuration={5000} onClose={() => setVipSnack(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="warning" variant="filled" onClose={() => setVipSnack(false)}
          icon={<WorkspacePremiumIcon fontSize="inherit" />}
          sx={{ borderRadius: '14px', alignItems: 'center', bgcolor: '#b45309', color: '#fff', fontWeight: 600, boxShadow: '0 14px 34px -12px rgba(180,83,9,0.55)' }}
          action={
            <Button color="inherit" size="small" onClick={() => { window.location.href = CENTER_URL }} sx={{ fontWeight: 800, borderRadius: '999px' }}>
              去开通
            </Button>
          }
        >
          该文档为 VIP 会员专享
        </Alert>
      </Snackbar>
    </Box>
  )
}
