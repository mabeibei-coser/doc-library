import React, { useState } from 'react';
import { Box, Typography, Button, Chip, CircularProgress } from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import { downloadDocument, gotoCenterLogin } from '../utils/api';

/**
 * 文档行：白底圆角横条——左彩色图标 / 中标题+角标+说明 / 右下载按钮。
 * 点卡片任意处 → 打开预览（onOpen）；右侧下载按钮 stopPropagation，可直接下载。
 * 免费档绿调、VIP 档金调；hover 上浮、按下回弹的触感反馈。
 */
export default function DocumentCard({ doc, isVip, onNeedVip, onOpen }) {
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState(null);
  const vipDoc = doc.requiredTier === 'vip';
  const locked = vipDoc && !isVip;

  const handleDownload = async () => {
    if (downloading) return;
    setErr(null);
    setDownloading(true);
    try {
      await downloadDocument(doc);
    } catch (e) {
      if (e.status === 401) { gotoCenterLogin(); return; }
      if (e.status === 403 || e.needVip) { onNeedVip?.(); return; }
      setErr(e.message || '下载失败');
    } finally {
      setDownloading(false);
    }
  };

  // 图标容器配色：VIP 金调 / 免费绿调
  const icon = vipDoc ? { bg: '#fffbeb', fg: '#d97706' } : { bg: '#ecfdf5', fg: '#059669' };

  return (
    <Box
      onClick={() => onOpen?.(doc)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(doc); } }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, sm: 2 },
        p: { xs: 1.75, sm: 2.25 },
        bgcolor: '#fff',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '20px',
        boxShadow: '0 10px 30px -18px rgba(15, 23, 42, 0.18)',
        cursor: 'pointer',
        outline: 'none',
        transition: 'transform .25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow .25s, border-color .25s',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 18px 40px -16px rgba(37, 99, 235, 0.28)',
          borderColor: 'rgba(37, 99, 235, 0.35)',
        },
        '&:focus-visible': {
          borderColor: 'primary.main',
          boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.25)',
        },
      }}
    >
      {/* 图标 */}
      <Box
        sx={{
          width: { xs: 44, sm: 50 }, height: { xs: 44, sm: 50 },
          borderRadius: '14px', bgcolor: icon.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <DescriptionOutlinedIcon sx={{ color: icon.fg, fontSize: { xs: 22, sm: 26 } }} />
      </Box>

      {/* 内容区：标题+分类一行，角标+说明一行 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.5 }}>
          <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.92rem', sm: '1rem' }, lineHeight: 1.3 }}>
            {doc.title}
          </Typography>
          {doc.category && (
            <Chip label={doc.category} size="small" sx={{ height: 20, fontSize: '0.66rem', bgcolor: '#f1f5f9', color: '#64748b' }} />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {vipDoc ? (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 0.9, py: 0.3, borderRadius: '999px', bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
              <WorkspacePremiumIcon sx={{ fontSize: 13, color: '#d97706' }} />
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#b45309', lineHeight: 1 }}>VIP 专享</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 0.9, py: 0.3, borderRadius: '999px', bgcolor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
              <TaskAltRoundedIcon sx={{ fontSize: 13, color: '#059669' }} />
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#047857', lineHeight: 1 }}>免费</Typography>
            </Box>
          )}
          {doc.description && (
            <Typography noWrap sx={{ color: '#94a3b8', fontSize: '0.8rem', flex: 1, minWidth: 0 }}>
              {doc.description}
            </Typography>
          )}
        </Box>
        {err && <Typography variant="caption" sx={{ color: '#dc2626', display: 'block', mt: 0.5 }}>{err}</Typography>}
      </Box>

      {/* 右侧下载按钮（阻止冒泡，避免触发预览） */}
      <Button
        variant={locked ? 'outlined' : 'contained'}
        disableElevation
        disabled={downloading || !doc.hasAttachment}
        startIcon={downloading ? <CircularProgress size={15} color="inherit" /> : (locked ? <LockOutlinedIcon /> : <DownloadRoundedIcon />)}
        onClick={(e) => { e.stopPropagation(); handleDownload(); }}
        sx={{
          flexShrink: 0,
          whiteSpace: 'nowrap',
          borderRadius: '12px',
          px: { xs: 1.5, sm: 2 }, py: 1,
          minWidth: { xs: 'auto', sm: 128 },
          transition: 'transform .15s, box-shadow .25s, background-color .2s',
          '&:active': { transform: 'scale(0.97)' },
          ...(locked
            ? { color: '#b45309', borderColor: '#fde68a', bgcolor: '#fffbeb', '&:hover': { borderColor: '#fbbf24', bgcolor: '#fef3c7' } }
            : { bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark', boxShadow: '0 10px 22px -10px rgba(37, 99, 235, 0.7)' } }),
          '&.Mui-disabled': { bgcolor: '#f1f5f9', color: '#cbd5e1' },
        }}
      >
        {!doc.hasAttachment ? '暂无附件' : downloading ? '下载中' : (locked ? '开通 VIP' : '下载')}
      </Button>
    </Box>
  );
}
