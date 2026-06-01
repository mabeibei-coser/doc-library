import { useState, useEffect } from 'react'
import {
  Container, Box, Typography, TextField, InputAdornment, Chip, Stack,
  CircularProgress, Snackbar, Alert, Button, IconButton, Tooltip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import DocumentCard from './components/DocumentCard'
import { fetchMe, fetchDocuments, gotoCenterLogin, CENTER_URL } from './utils/api'

export default function App() {
  const [me, setMe] = useState(null)
  const [meReady, setMeReady] = useState(false)
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [vipSnack, setVipSnack] = useState(false)

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
    <Box sx={{ minHeight: '100vh', py: { xs: 2, md: 4 }, backgroundColor: '#f4f6f9' }}>
      <Container maxWidth="md">
        {/* 顶栏 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.75, mb: 1, minHeight: 28 }}>
          {meReady && me ? (
            <>
              {isVip && (
                <Chip icon={<WorkspacePremiumIcon sx={{ fontSize: 14, color: '#f59e0b !important' }} />} label="VIP" size="small"
                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#1e3a5f', color: '#fff' }} />
              )}
              <Typography variant="caption" sx={{ color: '#64748b' }}>{me.phone}</Typography>
              <Tooltip title="会员中心">
                <IconButton size="small" onClick={() => { window.location.href = CENTER_URL }} sx={{ color: '#94a3b8', p: 0.5 }}>
                  <WorkspacePremiumIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </>
          ) : meReady ? (
            <Button size="small" onClick={gotoCenterLogin} sx={{ color: '#1e3a5f' }}>登录</Button>
          ) : null}
        </Box>

        {/* 标题 */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
            安防文档库
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            安全规范 · 应急预案 · 检查表模板，免费文档登录可下，VIP 解锁全部
          </Typography>
        </Box>

        {/* 搜索 */}
        <TextField
          fullWidth size="small" placeholder="搜索文档标题、说明、分类"
          value={q} onChange={(e) => setQ(e.target.value)}
          sx={{ mb: 2, bgcolor: '#fff', borderRadius: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94a3b8' }} /></InputAdornment> }}
        />

        {/* 分类筛选 */}
        {categories.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
            <Chip label="全部" onClick={() => setCategory('')} variant={category === '' ? 'filled' : 'outlined'}
              sx={{ bgcolor: category === '' ? '#1e3a5f' : 'transparent', color: category === '' ? '#fff' : '#475569' }} />
            {categories.map((c) => (
              <Chip key={c} label={c} onClick={() => setCategory(c)} variant={category === c ? 'filled' : 'outlined'}
                sx={{ bgcolor: category === c ? '#1e3a5f' : 'transparent', color: category === c ? '#fff' : '#475569' }} />
            ))}
          </Stack>
        )}

        {/* 文档网格 */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={28} sx={{ color: '#1e3a5f' }} /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}>
            <Typography>没有找到匹配的文档</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            {items.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} isVip={isVip} onNeedVip={() => setVipSnack(true)} />
            ))}
          </Box>
        )}
      </Container>

      <Snackbar open={vipSnack} autoHideDuration={5000} onClose={() => setVipSnack(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="warning" variant="filled" onClose={() => setVipSnack(false)} sx={{ borderRadius: 2 }}
          action={<Button color="inherit" size="small" onClick={() => { window.location.href = CENTER_URL }}>去开通</Button>}>
          该文档为 VIP 会员专享
        </Alert>
      </Snackbar>
    </Box>
  )
}
