import { useState } from 'react'
import { Dialog, Box, Typography, Button, Chip, IconButton, CircularProgress, useMediaQuery, useTheme } from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { downloadDocument, gotoCenterLogin, previewSrc, CENTER_URL } from '../utils/api'

/**
 * 文档预览界面（弹窗）：标题 / 分类+免费VIP角标 / 完整简介 / 预览图（无图则占位）/ 下载。
 * 桌面居中圆角弹窗，移动端全屏。下载守门逻辑同卡片：401 去登录、403 提示开通 VIP。
 */
export default function DocumentPreview({ doc, open, onClose, isVip }) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [downloading, setDownloading] = useState(false)
  const [err, setErr] = useState(null)
  const [needVip, setNeedVip] = useState(false)

  if (!doc) return null
  const vipDoc = doc.requiredTier === 'vip'
  const locked = vipDoc && !isVip
  const icon = vipDoc ? { bg: '#fffbeb', fg: '#d97706' } : { bg: '#ecfdf5', fg: '#059669' }
  const previews = Array.isArray(doc.preview) ? doc.preview : []

  const handleDownload = async () => {
    if (downloading) return
    setErr(null); setNeedVip(false); setDownloading(true)
    try {
      await downloadDocument(doc)
    } catch (e) {
      if (e.status === 401) { gotoCenterLogin(); return }
      if (e.status === 403 || e.needVip) { setNeedVip(true); return }
      setErr(e.message || '下载失败')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog
      open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius: fullScreen ? 0 : '24px', position: 'relative' } } }}
    >
      {/* 关闭 */}
      <IconButton
        onClick={onClose}
        sx={{ position: 'absolute', top: 12, right: 12, color: '#64748b', bgcolor: 'rgba(248,250,252,0.8)', '&:hover': { bgcolor: '#f1f5f9' }, zIndex: 2 }}
      >
        <CloseRoundedIcon />
      </IconButton>

      <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        {/* 头部：图标 + 标题 + 角标 */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2.5, pr: 4 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: icon.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DescriptionOutlinedIcon sx={{ color: icon.fg, fontSize: 30 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.3rem' }, color: '#0f172a', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
              {doc.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
              {doc.category && <Chip label={doc.category} size="small" sx={{ height: 22, fontSize: '0.7rem', bgcolor: '#f1f5f9', color: '#64748b' }} />}
              {vipDoc ? (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.3, borderRadius: '999px', bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
                  <WorkspacePremiumIcon sx={{ fontSize: 14, color: '#d97706' }} />
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#b45309', lineHeight: 1 }}>VIP 专享</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.3, borderRadius: '999px', bgcolor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                  <TaskAltRoundedIcon sx={{ fontSize: 14, color: '#059669' }} />
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#047857', lineHeight: 1 }}>免费</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* 简介（完整） */}
        {doc.description && (
          <Typography sx={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.75, mb: 2.5, whiteSpace: 'pre-wrap' }}>
            {doc.description}
          </Typography>
        )}

        {/* 预览区 */}
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.06em', mb: 1.25 }}>文档预览</Typography>
        {previews.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: { sm: 380 }, overflowY: { sm: 'auto' }, pr: { sm: 0.5 } }}>
            {previews.map((p, i) => (
              <Box
                key={i} component="img" src={previewSrc(p.url)} alt={`${doc.title} 预览图 ${i + 1}`} loading="lazy"
                sx={{ width: '100%', display: 'block', borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc' }}
              />
            ))}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.75, py: 4.5, borderRadius: '16px', border: '1px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
            <ImageOutlinedIcon sx={{ fontSize: 34, color: '#cbd5e1' }} />
            <Typography sx={{ fontSize: '0.86rem', color: '#94a3b8', fontWeight: 600 }}>该文档暂无预览图</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: '#cbd5e1' }}>下载后即可查看完整内容</Typography>
          </Box>
        )}

        {/* VIP 提示 / 错误 */}
        {needVip && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, px: 1.5, py: 1.25, borderRadius: '12px', bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
            <WorkspacePremiumIcon sx={{ fontSize: 18, color: '#d97706', flexShrink: 0 }} />
            <Typography sx={{ flex: 1, fontSize: '0.82rem', color: '#b45309', fontWeight: 600 }}>该文档为 VIP 会员专享</Typography>
            <Button
              size="small" onClick={() => { window.location.href = CENTER_URL }}
              sx={{ flexShrink: 0, color: '#fff', bgcolor: '#d97706', fontWeight: 700, borderRadius: '999px', px: 1.5, '&:hover': { bgcolor: '#b45309' } }}
            >
              去开通
            </Button>
          </Box>
        )}
        {err && <Typography sx={{ color: '#dc2626', fontSize: '0.8rem', mt: 1.5 }}>{err}</Typography>}

        {/* 下载 */}
        <Button
          fullWidth variant={locked ? 'outlined' : 'contained'} disableElevation
          disabled={downloading || !doc.hasAttachment}
          startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : (locked ? <LockOutlinedIcon /> : <DownloadRoundedIcon />)}
          onClick={handleDownload}
          sx={{
            mt: 2.5, py: 1.25, borderRadius: '14px', fontSize: '0.95rem', fontWeight: 700,
            '&:active': { transform: 'scale(0.99)' },
            ...(locked
              ? { color: '#b45309', borderColor: '#fde68a', bgcolor: '#fffbeb', '&:hover': { borderColor: '#fbbf24', bgcolor: '#fef3c7' } }
              : { bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }),
            '&.Mui-disabled': { bgcolor: '#f1f5f9', color: '#cbd5e1' },
          }}
        >
          {!doc.hasAttachment ? '暂无附件' : downloading ? '下载中…' : (locked ? '开通 VIP 下载' : '下载文档')}
        </Button>
      </Box>
    </Dialog>
  )
}
