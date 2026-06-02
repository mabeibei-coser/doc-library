import { useState, useEffect, useRef } from 'react'
import { Box, Typography, CircularProgress, Button } from '@mui/material'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { inlineUrl, gotoCenterLogin } from '../utils/api'

/**
 * 浏览器内渲染 Word / Excel 预览。
 * 走 /inline 拿文件字节（带 cookie，后端按 free=登录 / vip=VIP 守门），再用
 * docx-preview / SheetJS 在前端渲染——不依赖外网、不暴露文件、尊重门禁。
 * 渲染库按需 import()，只在真要预览 Office 时才下载，不进首屏包。
 * 未授权 / 渲染失败一律降级到提示文案，不抛错。
 */
const boxSx = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 0.75, py: 4.5, borderRadius: '16px', border: '1px dashed var(--ink-4)', bgcolor: 'var(--bg-mute)',
}

export default function OfficeInlinePreview({ doc, fileType }) {
  const containerRef = useRef(null)
  const [state, setState] = useState('loading') // loading | ready | needLogin | needVip | error
  const [sheetNote, setSheetNote] = useState('')

  useEffect(() => {
    let cancelled = false
    setState('loading')
    setSheetNote('')

    ;(async () => {
      try {
        const res = await fetch(inlineUrl(doc.id), { credentials: 'include' })
        if (cancelled) return
        if (res.status === 401) { setState('needLogin'); return }
        if (res.status === 403) { setState('needVip'); return }
        if (!res.ok) { setState('error'); return }

        if (fileType === 'word') {
          const blob = await res.blob()
          if (cancelled) return
          const { renderAsync } = await import('docx-preview')
          if (cancelled || !containerRef.current) return
          containerRef.current.innerHTML = ''
          await renderAsync(blob, containerRef.current, null, {
            className: 'docx-rendered', inWrapper: true,
            ignoreWidth: true, ignoreHeight: true, breakPages: false,
          })
          if (!cancelled) setState('ready')
        } else if (fileType === 'excel') {
          const buf = await res.arrayBuffer()
          if (cancelled) return
          const XLSX = await import('xlsx')
          const wb = XLSX.read(buf, { type: 'array' })
          const names = wb.SheetNames
          const html = XLSX.utils.sheet_to_html(wb.Sheets[names[0]])
          if (cancelled || !containerRef.current) return
          containerRef.current.innerHTML = html
          if (names.length > 1) {
            setSheetNote(`仅显示第 1 个工作表「${names[0]}」，共 ${names.length} 个，下载查看完整`)
          }
          if (!cancelled) setState('ready')
        } else {
          setState('error')
        }
      } catch {
        if (!cancelled) setState('error')
      }
    })()

    return () => { cancelled = true }
  }, [doc.id, fileType])

  return (
    <Box>
      {state === 'loading' && (
        <Box sx={boxSx}>
          <CircularProgress size={26} sx={{ color: 'primary.main' }} />
          <Typography sx={{ fontSize: '0.84rem', color: 'var(--ink-3)', fontWeight: 600, mt: 0.5 }}>正在加载预览…</Typography>
        </Box>
      )}

      {state === 'needLogin' && (
        <Box sx={boxSx}>
          <LockOutlinedIcon sx={{ fontSize: 32, color: 'var(--ink-4)' }} />
          <Typography sx={{ fontSize: '0.86rem', color: 'var(--ink-3)', fontWeight: 600 }}>登录后可在线预览</Typography>
          <Button size="small" onClick={gotoCenterLogin} sx={{ mt: 0.5, color: 'primary.main', fontWeight: 700 }}>去登录</Button>
        </Box>
      )}

      {state === 'needVip' && (
        <Box sx={boxSx}>
          <LockOutlinedIcon sx={{ fontSize: 32, color: 'var(--gold)' }} />
          <Typography sx={{ fontSize: '0.86rem', color: 'var(--gold-ink)', fontWeight: 600 }}>开通 VIP 后可在线预览</Typography>
        </Box>
      )}

      {state === 'error' && (
        <Box sx={boxSx}>
          <InsertDriveFileOutlinedIcon sx={{ fontSize: 34, color: 'var(--ink-4)' }} />
          <Typography sx={{ fontSize: '0.86rem', color: 'var(--ink-3)', fontWeight: 600 }}>无法在线预览此文档</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'var(--ink-4)' }}>下载后用 Office 或 WPS 打开</Typography>
        </Box>
      )}

      {sheetNote && state === 'ready' && (
        <Typography sx={{ fontSize: '0.74rem', color: 'var(--ink-4)', mb: 1 }}>{sheetNote}</Typography>
      )}

      {/* 渲染容器：始终挂载（renderAsync 需要真实 DOM 量宽），非 ready 时收起。
          Excel 的裸 table 在这里补最小可读样式；Word 由 docx-preview 自带样式。 */}
      <Box
        ref={containerRef}
        sx={{
          display: state === 'ready' ? 'block' : 'none',
          maxHeight: { xs: 420, sm: 520 }, overflow: 'auto',
          borderRadius: '12px', border: '1px solid', borderColor: 'divider',
          bgcolor: '#fff', p: { xs: 1.5, sm: 2 },
          '& table': { borderCollapse: 'collapse', width: '100%', fontSize: '0.82rem' },
          '& td, & th': { border: '1px solid var(--line)', px: 1, py: 0.5, whiteSpace: 'nowrap' },
        }}
      />
    </Box>
  )
}
