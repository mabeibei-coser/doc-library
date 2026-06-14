import { useState, useEffect } from 'react'
import { Dialog, Box, Typography, Button, Chip, IconButton, CircularProgress, useMediaQuery, useTheme } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import { fetchSignedDownloadUrl, triggerDownload, inlineUrl, centerUrlFor, previewSrc } from '../utils/api'
import { getFileType, FILE_TYPE_META } from '../utils/fileType'

// 安卓微信（X5 内核）会拦截 WebView 内的压缩包下载，必须导到外部浏览器；
// iOS 微信能直下，其它浏览器也能直下——只有「压缩包 + 安卓 + 微信」这一组要特殊处理。
const IS_WECHAT = /MicroMessenger/i.test(navigator.userAgent)
const IS_ANDROID = /Android/i.test(navigator.userAgent)

function descriptionImageSrc(url) {
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  if (url.startsWith('/api/preview/')) return previewSrc(url)
  return url
}

function DescriptionContent({ value }) {
  const parts = []
  const re = /!\[([^\]]*)\]\(([^)]+)\)/g
  let last = 0
  let match
  while ((match = re.exec(value))) {
    if (match.index > last) parts.push({ type: 'text', value: value.slice(last, match.index) })
    parts.push({ type: 'image', alt: match[1] || '说明图片', url: match[2] })
    last = re.lastIndex
  }
  if (last < value.length) parts.push({ type: 'text', value: value.slice(last) })

  return (
    <Box sx={{ mb: 2.5 }}>
      {parts.map((part, i) => part.type === 'image' ? (
        <Box
          key={`img-${i}`}
          component="img"
          src={descriptionImageSrc(part.url)}
          alt={part.alt}
          loading="lazy"
          sx={{ width: '100%', display: 'block', borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'var(--bg-mute)', my: 1.25 }}
        />
      ) : part.value.trim() ? (
        <Typography key={`text-${i}`} sx={{ color: 'var(--ink-2)', fontSize: '0.92rem', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
          {part.value}
        </Typography>
      ) : null)}
    </Box>
  )
}

/**
 * 文档预览界面（弹窗）：标题 / 分类+免费VIP角标 / 完整简介 / 图片或视频预览 / 下载。
 * 桌面居中圆角弹窗，移动端全屏。下载守门逻辑同卡片：401 去登录、403 提示开通 VIP。
 */
export default function DocumentPreview({ doc, open, onClose, isVip }) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [downloading, setDownloading] = useState(false)
  const [err, setErr] = useState(null)
  const [needVip, setNeedVip] = useState(false)
  // 签名下载地址 { downloadUrl, pageUrl }：弹窗打开时挂载预签，10 分钟有效。点击下载纯同步跳转。
  // 跨进程友好：用户「在浏览器打开」跳到 OPPO/系统浏览器时，URL 自带凭证不必重登。
  const [signed, setSigned] = useState(null)

  // 进入预览（已登录 + 有附件 + 非 locked）就预签
  useEffect(() => {
    if (!open || !doc || !doc.hasAttachment) { setSigned(null); return }
    if (doc.requiredTier === 'vip' && !isVip) { setSigned(null); return }
    let cancelled = false
    fetchSignedDownloadUrl(doc.id)
      .then((s) => { if (!cancelled) setSigned(s) })
      .catch(() => { if (!cancelled) setSigned(null) })
    return () => { cancelled = true }
  }, [open, doc?.id, isVip])

  if (!doc) return null
  const vipDoc = doc.requiredTier === 'vip'
  const locked = vipDoc && !isVip
  const vipUnlock = vipDoc && isVip   // VIP 会员开 VIP 档：按钮显示金色「VIP 下载」
  // 文件类型决定头部图标配色 + 是否显示媒体预览（与列表卡片共用同一套判定）
  const fileType = getFileType(doc.attachmentMime, doc.attachmentName)
  const ft = FILE_TYPE_META[fileType]
  const FileIcon = ft.Icon   // 解构后大写命名渲染（直接 <ft.Icon> 在 Vite jsx runtime 下报错）
  const canMediaPreview = doc.hasAttachment && !locked && (fileType === 'image' || fileType === 'video')

  const handleDownload = () => {
    if (downloading) return
    if (locked) { setNeedVip(true); return }   // 非 VIP 看 VIP 档：本地短路，不发请求
    if (!signed) {                             // 签名还没回来 / 失败
      setErr('下载链接准备中，请稍后再试')
      return
    }
    setErr(null); setNeedVip(false); setDownloading(true)
    // 压缩包 + 安卓微信：微信 WebView 无法直接下 zip，跳到带 token 的下载引导页；
    // 用户「在浏览器打开」时 token 随 URL 过去，外部浏览器免登直接下。
    // iOS 微信 / 外部浏览器 / 非压缩包：直接同步跳下载 URL（保住用户手势，浏览器原生 attachment 下载）。
    if (fileType === 'archive' && IS_WECHAT && IS_ANDROID) {
      window.location.href = signed.pageUrl
    } else {
      triggerDownload(signed.downloadUrl)
    }
    // 浏览器跳走前给个短暂反馈；attachment 头让导航实际不离开当前页
    setTimeout(() => setDownloading(false), 1500)
  }

  return (
    <Dialog
      open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius: fullScreen ? 0 : '24px', position: 'relative' } } }}
    >
      {/* 返回 */}
      <IconButton
        onClick={onClose}
        sx={{ position: 'absolute', top: 12, left: 12, color: 'var(--ink-2)', bgcolor: 'rgba(244,243,238,0.85)', '&:hover': { bgcolor: 'var(--bg-mute)' }, zIndex: 2 }}
      >
        <ArrowBackRoundedIcon />
      </IconButton>

      <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        {/* 头部：图标 + 标题 + 角标。pl 给左上返回按钮留位。 */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2, pl: 5 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: ft.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileIcon titleAccess={ft.label} sx={{ color: ft.fg, fontSize: 30 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.3rem' }, color: 'var(--ink)', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
              {doc.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
              {doc.category && <Chip label={doc.category} size="small" sx={{ height: 22, fontSize: '0.7rem', bgcolor: 'var(--bg-mute)', color: 'var(--ink-2)' }} />}
              {vipDoc ? (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.3, borderRadius: 'var(--r-sm)', bgcolor: 'var(--gold-soft)', border: '1px solid rgba(176,138,62,0.4)' }}>
                  <WorkspacePremiumIcon sx={{ fontSize: 14, color: 'var(--gold)' }} />
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--gold-ink)', lineHeight: 1 }}>VIP 专享</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.3, borderRadius: 'var(--r-sm)', bgcolor: 'var(--success-soft)', border: '1px solid rgba(47,133,89,0.3)' }}>
                  <TaskAltRoundedIcon sx={{ fontSize: 14, color: 'var(--success)' }} />
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--success-ink)', lineHeight: 1 }}>免费</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* 下载按钮（独立一行） */}
        <Button
          variant={locked ? 'outlined' : 'contained'} disableElevation fullWidth
          disabled={downloading || !doc.hasAttachment}
          startIcon={
            downloading
              ? <CircularProgress size={16} color="inherit" />
              : locked
                ? <LockOutlinedIcon />
                : vipUnlock
                  ? <WorkspacePremiumIcon />
                  : <DownloadRoundedIcon />
          }
          onClick={handleDownload}
          sx={{
            height: 42, mb: 2,
            borderRadius: '12px', fontSize: '0.92rem', fontWeight: 700,
            '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 20 } },
            '&:active': { transform: 'scale(0.98)' },
            ...(locked
              ? { color: 'var(--gold-ink)', borderColor: 'rgba(176,138,62,0.4)', bgcolor: 'var(--gold-soft)', '&:hover': { borderColor: 'var(--gold)', bgcolor: '#f7ecca' } }
              : vipUnlock
                ? { color: '#fff', bgcolor: 'var(--gold)', '&:hover': { bgcolor: 'var(--gold-ink)' } }
                : { bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }),
            '&.Mui-disabled': { bgcolor: 'var(--bg-mute)', color: 'var(--ink-4)' },
          }}
        >
          {!doc.hasAttachment
            ? '暂无附件'
            : downloading
              ? '下载中'
              : locked
                ? '开通 VIP'
                : vipUnlock
                  ? 'VIP 下载'
                  : '下载'}
        </Button>

        {/* VIP 提示 / 错误：紧贴头部按钮下方反馈，最直观 */}
        {needVip && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, px: 1.5, py: 1.25, borderRadius: '12px', bgcolor: 'var(--gold-soft)', border: '1px solid rgba(176,138,62,0.4)' }}>
            <WorkspacePremiumIcon sx={{ fontSize: 18, color: 'var(--gold)', flexShrink: 0 }} />
            <Typography sx={{ flex: 1, fontSize: '0.82rem', color: 'var(--gold-ink)', fontWeight: 600 }}>该文档为 VIP 会员专享</Typography>
            <Button
              size="small" onClick={() => { window.location.href = centerUrlFor(doc?.category) }}
              sx={{ flexShrink: 0, color: '#fff', bgcolor: 'var(--gold)', fontWeight: 700, borderRadius: 'var(--r-sm)', px: 1.5, '&:hover': { bgcolor: 'var(--gold-ink)' } }}
            >
              去开通
            </Button>
          </Box>
        )}
        {err && <Typography sx={{ color: 'var(--danger)', fontSize: '0.8rem', mt: 1.5 }}>{err}</Typography>}

        {/* 简介（完整） */}
        {doc.description && (
          <Box sx={{ mt: 2 }}>
            <DescriptionContent value={doc.description} />
          </Box>
        )}

        {canMediaPreview && (
          <>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--ink-3)', letterSpacing: '0.06em', mt: 2, mb: 1.25 }}>文档预览</Typography>
            {fileType === 'image' ? (
              <Box
                component="img" src={inlineUrl(doc.id)} alt={`${doc.title} 预览`} loading="lazy"
                sx={{ width: '100%', display: 'block', borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'var(--bg-mute)' }}
              />
            ) : (
              <Box
                component="video" src={inlineUrl(doc.id)} controls preload="metadata"
                sx={{ width: '100%', maxHeight: 480, display: 'block', borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: '#000' }}
              />
            )}
          </>
        )}

        <Typography sx={{ mt: canMediaPreview ? 2 : 1.5, color: 'var(--ink-4)', fontSize: '0.72rem', lineHeight: 1.6, textAlign: 'center' }}>
          申明：以上素材通过公开网络搜集整理，仅供内部学习交流
        </Typography>
      </Box>
    </Dialog>
  )
}
